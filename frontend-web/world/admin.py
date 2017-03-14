from django.contrib.gis import admin
from .models import WorldBorder


admin.site.register(WorldBorder, admin.GeoModelAdmin)
