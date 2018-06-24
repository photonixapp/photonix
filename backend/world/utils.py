from .models import WorldBorder


def country_from_point_field(point_field):
    borders = WorldBorder.objects.filter(mpoly__contains=point_field)
    if borders:
        return borders[0].name
    return ''
