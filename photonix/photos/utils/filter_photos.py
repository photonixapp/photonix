
from photonix.photos.models import Tag
from django.db.models import Case, When


def filter_photos_queryset(filters, queryset, library_id=None):
    """Method returns photos list."""
    if library_id:
        filters = [v for v in filters if v != '']
        queryset = queryset.filter(library__id=library_id)
    selected_tag_id = None
    for filter_val in filters:
        if ':' in filter_val:
            key, val = filter_val.split(':')
            if key == 'library_id':
                queryset = queryset.filter(library__id=val)
            elif key == 'tag':
                queryset = queryset.filter(photo_tags__tag__id=val)
                if not selected_tag_id:
                    selected_tag_id = val
            elif key == 'camera':
                queryset = queryset.filter(camera__id=val)
            elif key == 'lens':
                queryset = queryset.filter(lens__id=val)
            elif key == 'aperture':
                queryset = queryset.filter(
                    aperture__gte=float(val.split('-')[0]),
                    aperture__lte=float(val.split('-')[1]))
            elif key == 'exposure':
                queryset = queryset.filter(exposure__in=val.split('-'))
            elif key == 'isoSpeed':
                queryset = queryset.filter(
                    iso_speed__gte=int(val.split('-')[0]),
                    iso_speed__lte=int(val.split('-')[1]))
            elif key == 'focalLength':
                queryset = queryset.filter(
                    focal_length__gte=float(val.split('-')[0]),
                    focal_length__lte=float(val.split('-')[1]))
            elif key == 'flash':
                queryset = queryset.filter(
                    flash=val == 'on' and True or False)
            elif key == 'meeteringMode':
                queryset = queryset.filter(metering_mode=val)
            elif key == 'driveMode':
                queryset = queryset.filter(drive_mode=val)
            elif key == 'shootingMode':
                queryset = queryset.filter(shooting_mode=val)
            elif key == 'rating':
                queryset = queryset.filter(
                    star_rating__gte=int(val.split('-')[0]),
                    star_rating__lte=int(val.split('-')[1]))
        else:
            queryset = queryset.filter(
                photo_tags__tag__name__icontains=filter_val)
            if (not selected_tag_id) and Tag.objects.filter(name__icontains=filter_val).exists():
                selected_tag_id = Tag.objects.filter(name__icontains=filter_val)[0].id
    if selected_tag_id and (not library_id):
        # queryset.order_by('-photo_tags__significance')
        queryset = queryset.annotate(selected_tag=Case(When(photo_tags__tag__id=selected_tag_id, then=('photo_tags__significance')),default=None)).order_by('-selected_tag')
    return queryset.distinct()
