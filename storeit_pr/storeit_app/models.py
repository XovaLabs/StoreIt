from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.db import models


class Location(models.Model):
    name = models.CharField(max_length=120, unique=True)
    description = models.CharField(max_length=240, blank=True)

    def __str__(self):
        return self.name


class Box(models.Model):
    name = models.CharField(max_length=120)
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='boxes')
    notes = models.TextField(blank=True, max_length=2000)
    color = models.CharField(max_length=7, default='#c7bda9', validators=[RegexValidator(r'^#[0-9a-fA-F]{6}$')])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Item(models.Model):
    KIND_CHOICES = [('item', 'Item'), ('filament', 'Filament')]
    name = models.CharField(max_length=160)
    kind = models.CharField(max_length=16, choices=KIND_CHOICES, default='item')
    category = models.CharField(max_length=60, default='Other')
    quantity = models.PositiveIntegerField(default=1, validators=[MaxValueValidator(1000000)])
    min_quantity = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(1000000)])
    value = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    box = models.ForeignKey(Box, null=True, blank=True, on_delete=models.PROTECT, related_name='items')
    location = models.ForeignKey(Location, null=True, blank=True, on_delete=models.PROTECT, related_name='items')
    notes = models.TextField(blank=True, max_length=2000)
    favorite = models.BooleanField(default=False)
    art = models.CharField(max_length=20, default='object', choices=[(x, x) for x in ['object', 'camera', 'headphones', 'drill', 'cables', 'tools', 'keyboard', 'plant', 'spool']])
    color = models.CharField(max_length=7, default='#9ba89a', validators=[RegexValidator(r'^#[0-9a-fA-F]{6}$')])
    brand = models.CharField(max_length=80, blank=True)
    material = models.CharField(max_length=30, blank=True)
    total_weight = models.PositiveIntegerField(default=1000, validators=[MinValueValidator(1), MaxValueValidator(100000)])
    remaining_weight = models.PositiveIntegerField(default=1000)
    low_weight = models.PositiveIntegerField(default=200)
    diameter = models.CharField(max_length=8, default='1.75', choices=[('1.75', '1.75 mm'), ('2.85', '2.85 mm')])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.box_id and self.location_id:
            raise ValidationError('Choose a box or a direct location. Box locations are inherited.')
        if self.kind == 'filament':
            if self.remaining_weight > self.total_weight:
                raise ValidationError('Remaining weight cannot exceed the full spool weight.')
            if self.low_weight > self.total_weight:
                raise ValidationError('The low-stock threshold cannot exceed the full spool weight.')
            if self.quantity != 1:
                raise ValidationError('Track each filament spool separately with a quantity of 1.')

    @property
    def is_low(self):
        return self.remaining_weight <= self.low_weight if self.kind == 'filament' else self.quantity <= self.min_quantity

    def __str__(self):
        return self.name


class Activity(models.Model):
    title = models.CharField(max_length=240)
    detail = models.CharField(max_length=300, blank=True)
    kind = models.CharField(max_length=20, default='item')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-pk']


# Reserved placeholders from the original project; Django auth remains available
# for a future shared-workspace implementation.
class User(models.Model):
    pass


class UserGroups(models.Model):
    pass
