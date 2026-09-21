from django.core.management.base import BaseCommand
from django.db import transaction
from storeit_app.models import Activity, Box, Item, Location


class Command(BaseCommand):
    help = 'Populate an empty workspace with an editable sample inventory.'

    @transaction.atomic
    def handle(self, *args, **options):
        if Item.objects.exists() or Box.objects.exists() or Location.objects.exists():
            self.stdout.write('Workspace already has data; no samples added.')
            return
        studio = Location.objects.create(name='Studio', description='A little space for big ideas. Desk, camera gear, and creative tools.')
        workshop = Location.objects.create(name='Workshop', description='The making space. Tools, electronics, and the print station.')
        garage = Location.objects.create(name='Garage', description='Seasonal storage and things for the next adventure.')
        shelf = Location.objects.create(name='Storage room', description='Labeled boxes, neatly tucked away.')
        gear = Box.objects.create(name='Camera essentials', location=studio, notes='Upper shelf · everything for a day out shooting', color='#c9bca3')
        tools = Box.objects.create(name='Everyday tools', location=workshop, notes='Workbench · left-hand drawer', color='#a7b9b1')
        cables = Box.objects.create(name='Cables & adapters', location=studio, notes='Under the desk · sorted by connector', color='#b7b9cd')
        dry = Box.objects.create(name='Filament dry box', location=workshop, notes='Print station · keep sealed with fresh desiccant', color='#c1b49b')
        Box.objects.create(name='Camping kit', location=garage, notes='Ready for the next long weekend', color='#93a88c')
        Box.objects.create(name='Seasonal things', location=shelf, notes='Top shelf · decorations and keepsakes', color='#cbb8af')
        examples = [
            dict(name='Sony α7 IV', category='Photography', value=2899, box=gear, art='camera', color='#565a53', favorite=True, notes='Full-frame mirrorless camera. Body with 28–70 mm kit lens.'),
            dict(name='Cordless drill', category='Tools', value=189, box=tools, art='drill', color='#acbd77', notes='18 V drill and two batteries. Charger is in the workbench drawer.'),
            dict(name='Studio headphones', category='Electronics', value=249, location=studio, art='headphones', color='#b9aa91', favorite=True, notes='Over-ear headphones for focused afternoons.'),
            dict(name='USB-C cables', category='Electronics', value=18, quantity=3, min_quantity=3, box=cables, art='cables', color='#89978d', notes='2 m braided cables. USB-C to USB-C.'),
            dict(name='Precision tool set', category='Tools', value=69, box=tools, art='tools', color='#9aa899', notes='64-bit screwdriver set for small repairs.'),
            dict(name='Mechanical keyboard', category='Electronics', value=165, location=studio, art='keyboard', color='#c6b59b', notes='75% layout with tactile switches.'),
            dict(name='Matte Forest Green', kind='filament', category='3D printing', brand='Bambu Lab', material='PLA', color='#617e66', remaining_weight=740, value=32, box=dry, art='spool', favorite=True),
            dict(name='Jade White', kind='filament', category='3D printing', brand='Bambu Lab', material='PLA', color='#deded0', remaining_weight=180, value=29, box=dry, art='spool'),
            dict(name='Burnt Terracotta', kind='filament', category='3D printing', brand='Polymaker', material='PLA', color='#b87559', remaining_weight=860, value=35, box=dry, art='spool'),
            dict(name='Charcoal Black', kind='filament', category='3D printing', brand='eSUN', material='PETG', color='#444b48', remaining_weight=120, value=28, location=workshop, art='spool'),
            dict(name='Lavender Mist', kind='filament', category='3D printing', brand='Polymaker', material='PLA', color='#aba2bc', remaining_weight=620, value=35, box=dry, art='spool'),
            dict(name='Ocean Blue', kind='filament', category='3D printing', brand='Prusament', material='PETG', color='#66959e', remaining_weight=950, value=42, box=dry, art='spool'),
        ]
        for fields in examples:
            Item.objects.create(**fields)
        Activity.objects.create(title='Your workspace is ready', detail='Sample inventory added. Make yourself at home.', kind='location')
        Activity.objects.create(title='Added Camera essentials', detail='Studio · 1 item', kind='box')
        Activity.objects.create(title='Added Matte Forest Green', detail='Bambu Lab · PLA · 740 g remaining', kind='filament')
        self.stdout.write(self.style.SUCCESS('Created sample workspace: 12 entries, 6 boxes, 4 locations.'))
