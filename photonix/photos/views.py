from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound

from photonix.photos.utils.thumbnails import get_thumbnail


def thumbnail_view(request, photo_id, width, height, crop, quality):
    width = int(width)
    height = int(height)
    quality = int(quality)

    thumbnail_size_index = None
    for i, thumbnail_size in enumerate(settings.THUMBNAIL_SIZES):
        if width == thumbnail_size[0] and height == thumbnail_size[1] and crop == thumbnail_size[2] and quality == thumbnail_size[3]:
            thumbnail_size_index = i
            break

    if thumbnail_size_index is None:
        return HttpResponseNotFound('No photo thumbnail with these parameters')

    img_bytes = get_thumbnail(photo_id, width, height, crop, quality, return_type='bytes')
    response = HttpResponse(img_bytes, content_type='image/jpeg')
    return response
