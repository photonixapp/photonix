from django.contrib.gis import admin
from .models import WorldBorder, City


class WorldBorderAdmin(admin.GeoModelAdmin):
    list_display = ('name', 'population', 'area',)
    search_fields = ['name']


class CityAdmin(admin.GeoModelAdmin):
    list_display = ('name', 'country', 'timezone', 'population')
    search_fields = ['name', 'country__name']


admin.site.register(WorldBorder, WorldBorderAdmin)
admin.site.register(City, CityAdmin)
