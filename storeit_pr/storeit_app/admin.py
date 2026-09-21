from django.contrib import admin
from .models import Item, Box, Location, Activity

admin.site.register([Item, Box, Location, Activity])

# Register your models here.
