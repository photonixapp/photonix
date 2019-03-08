from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render

from photos.utils.thumbnails import get_thumbnail


def thumbnail_view(request, photo_id=None, width=256, height=256, crop='cover', quality=50):
    width, height, crop, quality, _ = settings.THUMBNAIL_SIZES[0]
    img_bytes = get_thumbnail(photo_id, width, height, crop, quality, return_type='bytes')
    response = HttpResponse(img_bytes, content_type='image/jpeg')
    return response
