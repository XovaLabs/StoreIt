import csv
import io
import json

from django.core.management import call_command
from django.test import Client, TestCase

from .models import Activity, Box, Item, Location


class InventoryTests(TestCase):
    def setUp(self):
        self.location = Location.objects.create(name='Workshop')
        self.box = Box.objects.create(name='Dry box', location=self.location)
        self.item = Item.objects.create(name='Calipers', quantity=2, value='25.50', box=self.box)
        self.spool = Item.objects.create(name='Forest PLA', kind='filament', material='PLA', remaining_weight=300, box=self.box)

    def request(self, method, url, data=None):
        return getattr(self.client, method)(url, data=json.dumps(data if data is not None else {}), content_type='application/json')

    def test_home_sets_csrf_and_renders_workspace(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'storeit_app/app.js')
        self.assertIn('csrftoken', response.cookies)

    def test_inventory_contains_storage_relationships_and_stock_status(self):
        response = self.client.get('/api/inventory/').json()
        self.assertEqual(len(response['items']), 2)
        item = next(i for i in response['items'] if i['id'] == self.item.pk)
        self.assertEqual(item['box'], self.box.pk)
        self.assertEqual(item['value'], '25.50')
        self.assertFalse(item['is_low'])

    def test_item_crud_persists_and_records_activity(self):
        response = self.request('post', '/api/items/', {'name': 'Nozzle', 'quantity': 3, 'location': self.location.pk})
        self.assertEqual(response.status_code, 201)
        pk = response.json()['id']
        response = self.request('patch', f'/api/items/{pk}/', {'name': 'Brass nozzle', 'favorite': True})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Item.objects.get(pk=pk).favorite)
        self.assertEqual(self.request('delete', f'/api/items/{pk}/').status_code, 200)
        self.assertFalse(Item.objects.filter(pk=pk).exists())
        self.assertEqual(Activity.objects.count(), 3)

    def test_moving_box_preserves_contents(self):
        studio = Location.objects.create(name='Studio')
        response = self.request('patch', f'/api/boxes/{self.box.pk}/', {'location': studio.pk})
        self.assertEqual(response.status_code, 200)
        self.item.refresh_from_db()
        self.assertEqual(self.item.box.location, studio)

    def test_cannot_delete_occupied_box_or_location(self):
        self.assertEqual(self.request('delete', f'/api/boxes/{self.box.pk}/').status_code, 409)
        self.assertEqual(self.request('delete', f'/api/locations/{self.location.pk}/').status_code, 409)
        self.assertEqual(Item.objects.count(), 2)

    def test_cannot_assign_both_box_and_direct_location(self):
        response = self.request('patch', f'/api/items/{self.item.pk}/', {'location': self.location.pk})
        self.assertEqual(response.status_code, 400)
        self.item.refresh_from_db()
        self.assertIsNone(self.item.location)

    def test_move_item_out_of_box(self):
        response = self.request('patch', f'/api/items/{self.item.pk}/', {'box': None, 'location': self.location.pk})
        self.assertEqual(response.status_code, 200)
        self.item.refresh_from_db()
        self.assertIsNone(self.item.box)
        self.assertEqual(self.item.location, self.location)

    def test_logging_usage_deducts_and_triggers_alert(self):
        response = self.request('post', f'/api/items/{self.spool.pk}/usage/', {'grams': 125, 'project': 'Desk tray'})
        self.assertEqual(response.status_code, 200)
        self.spool.refresh_from_db()
        self.assertEqual(self.spool.remaining_weight, 175)
        self.assertTrue(response.json()['is_low'])
        self.assertEqual(Activity.objects.first().detail, 'Desk tray')

    def test_cannot_use_more_than_remaining(self):
        response = self.request('post', f'/api/items/{self.spool.pk}/usage/', {'grams': 301})
        self.assertEqual(response.status_code, 400)
        self.spool.refresh_from_db()
        self.assertEqual(self.spool.remaining_weight, 300)
        self.assertEqual(Activity.objects.count(), 0)

    def test_spool_can_be_fully_consumed(self):
        response = self.request('post', f'/api/items/{self.spool.pk}/usage/', {'grams': 300})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['remaining_weight'], 0)

    def test_invalid_usage_and_non_filament_rejected(self):
        for grams in [-1, 0, 2.5, True, '20', None]:
            with self.subTest(grams=grams):
                self.assertEqual(self.request('post', f'/api/items/{self.spool.pk}/usage/', {'grams': grams}).status_code, 400)
        self.assertEqual(self.request('post', f'/api/items/{self.item.pk}/usage/', {'grams': 20}).status_code, 404)

    def test_invalid_item_values_rejected_without_changes(self):
        for changes in [{'quantity': -1}, {'quantity': 1.5}, {'quantity': True}, {'color': 'red'}, {'name': ''}, {'value': -1}, {'art': 'invalid'}, {'box': 9999}, {'favorite': []}, {'remaining_weight': None}]:
            with self.subTest(changes=changes):
                self.assertEqual(self.request('patch', f'/api/items/{self.item.pk}/', changes).status_code, 400)
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 2)
        self.assertEqual(Activity.objects.count(), 0)

    def test_spool_weight_and_quantity_validation(self):
        for changes in [{'remaining_weight': 1001}, {'total_weight': 0}, {'low_weight': 1001}, {'quantity': 2}]:
            with self.subTest(changes=changes):
                self.assertEqual(self.request('patch', f'/api/items/{self.spool.pk}/', changes).status_code, 400)

    def test_malformed_json_and_unknown_fields(self):
        response = self.client.post('/api/items/', data='{not-json', content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.request('post', '/api/items/', []).status_code, 400)
        self.assertEqual(self.request('patch', f'/api/items/{self.item.pk}/', {'id': 99}).status_code, 400)

    def test_location_uniqueness(self):
        self.assertEqual(self.request('post', '/api/locations/', {'name': 'Workshop'}).status_code, 400)

    def test_csv_escapes_formulas_and_includes_inherited_location(self):
        self.item.name = '=HYPERLINK("https://example.com")'
        self.item.save()
        response = self.client.get('/export.csv')
        self.assertEqual(response.status_code, 200)
        rows = list(csv.reader(io.StringIO(response.content.decode())))
        self.assertTrue(rows[1][1].startswith("'="))
        self.assertEqual(rows[1][7], 'Workshop')
        self.assertEqual(len(rows), 3)

    def test_mutations_require_csrf(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(client.post('/api/items/', data='{"name":"Test"}', content_type='application/json').status_code, 403)
        client.get('/')
        token = client.cookies['csrftoken'].value
        response = client.post('/api/items/', data='{"name":"Test"}', content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201)

    def test_demo_command_does_not_change_existing_data(self):
        call_command('seed_demo', stdout=io.StringIO())
        self.assertEqual(Item.objects.count(), 2)

    def test_missing_records_and_invalid_methods(self):
        self.assertEqual(self.request('patch', '/api/items/9999/', {'name': 'Missing'}).status_code, 404)
        self.assertEqual(self.client.get(f'/api/items/{self.item.pk}/').status_code, 405)
        self.assertEqual(self.request('patch', '/api/items/', {'name': 'Missing'}).status_code, 405)
        self.assertEqual(self.request('post', '/api/unknown/', {'name': 'Unknown'}).status_code, 404)


class DemoTests(TestCase):
    def test_demo_can_be_seeded_once(self):
        call_command('seed_demo', stdout=io.StringIO())
        self.assertEqual(Item.objects.count(), 12)
        self.assertEqual(Box.objects.count(), 6)
        self.assertEqual(Location.objects.count(), 4)
        call_command('seed_demo', stdout=io.StringIO())
        self.assertEqual(Item.objects.count(), 12)
