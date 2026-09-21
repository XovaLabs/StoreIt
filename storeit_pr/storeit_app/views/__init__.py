import csv
import json

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db import models as db_models
from django.db.models.deletion import ProtectedError
from django.forms.models import model_to_dict
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from ..models import Activity, Box, Item, Location


def serialize_item(item):
    data = model_to_dict(item)
    data.update(value=str(item.value), is_low=item.is_low,
                updated_at=item.updated_at.isoformat(), created_at=item.created_at.isoformat())
    return data


@ensure_csrf_cookie
@require_GET
def home_page(request):
    return render(request, 'storeit_app/index.html')


@require_GET
def inventory(request):
    return JsonResponse({
        'items': [serialize_item(i) for i in Item.objects.order_by('-updated_at')],
        'boxes': [model_to_dict(b) for b in Box.objects.order_by('name')],
        'locations': list(Location.objects.order_by('name').values()),
        'activity': list(Activity.objects.all()[:60].values()),
    })


def payload(request):
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise ValueError
        return data
    except (ValueError, UnicodeDecodeError):
        raise ValidationError('Please provide a valid JSON object.')


@require_http_methods(['POST', 'PATCH', 'DELETE'])
def resource(request, resource, pk=None):
    models = {'items': Item, 'boxes': Box, 'locations': Location}
    model = models.get(resource)
    if not model:
        return JsonResponse({'error': 'Unknown resource.'}, status=404)
    if (request.method == 'POST' and pk is not None) or (request.method != 'POST' and pk is None):
        return JsonResponse({'error': 'Invalid operation.'}, status=405)
    try:
        with transaction.atomic():
            obj = get_object_or_404(model.objects.select_for_update(), pk=pk) if pk else model()
            if request.method == 'DELETE':
                name = obj.name
                obj.delete()
                Activity.objects.create(title=f'Removed {name}', kind=resource[:-1])
                return JsonResponse({'ok': True})
            data = payload(request)
            fields = {f.name: f for f in model._meta.fields if f.editable and f.name != 'id'}
            unknown = set(data) - fields.keys()
            if unknown:
                raise ValidationError('Unknown fields: ' + ', '.join(sorted(unknown)))
            for key, value in data.items():
                field = fields[key]
                if value is None and not field.null:
                    raise ValidationError(f'{key} cannot be empty.')
                if isinstance(value, (list, dict)):
                    raise ValidationError(f'Invalid value for {key}.')
                if isinstance(field, db_models.IntegerField) and (isinstance(value, bool) or not isinstance(value, int)):
                    raise ValidationError(f'{key} must be a whole number.')
                setattr(obj, field.attname, value)
            obj.full_clean()
            obj.save()
            Activity.objects.create(title=f'{"Updated" if pk else "Added"} {obj.name}', kind=resource[:-1])
            return JsonResponse(serialize_item(obj) if model is Item else model_to_dict(obj), status=200 if pk else 201)
    except ProtectedError:
        return JsonResponse({'error': 'Move the items or boxes stored here before deleting it.'}, status=409)
    except (ValidationError, ValueError, TypeError) as exc:
        return JsonResponse({'error': ' '.join(exc.messages) if isinstance(exc, ValidationError) else 'Invalid field value.'}, status=400)


@require_POST
def log_usage(request, pk):
    try:
        data = payload(request)
        grams = data.get('grams')
        if isinstance(grams, bool) or not isinstance(grams, int) or grams <= 0:
            raise ValidationError('Enter a positive whole number of grams.')
        project = str(data.get('project', '')).strip()[:120]
        with transaction.atomic():
            item = get_object_or_404(Item.objects.select_for_update(), pk=pk, kind='filament')
            if grams > item.remaining_weight:
                raise ValidationError('This print needs more filament than remains on the spool.')
            item.remaining_weight -= grams
            item.save(update_fields=['remaining_weight', 'updated_at'])
            Activity.objects.create(title=f'Used {grams} g of {item.name}', detail=project or 'Print usage recorded', kind='filament')
        return JsonResponse(serialize_item(item))
    except ValidationError as exc:
        return JsonResponse({'error': ' '.join(exc.messages)}, status=400)


def csv_safe(value):
    text = str(value)
    return "'" + text if text.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')) else text


@require_GET
def export_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="storeit-inventory.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'Name', 'Type', 'Category', 'Quantity', 'Unit value (AUD)', 'Box', 'Location', 'Material', 'Brand', 'Remaining (g)', 'Full spool (g)', 'Notes'])
    for item in Item.objects.select_related('box__location', 'location').order_by('pk'):
        location = item.box.location if item.box else item.location
        writer.writerow([csv_safe(v) for v in [f'ST-{item.pk:04}', item.name, item.kind, item.category, item.quantity,
                         item.value, item.box.name if item.box else '', location.name if location else '',
                         item.material, item.brand, item.remaining_weight if item.kind == 'filament' else '',
                         item.total_weight if item.kind == 'filament' else '', item.notes]])
    return response
