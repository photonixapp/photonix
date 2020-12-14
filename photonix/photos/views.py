from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound, JsonResponse
from django.http.shortcuts import get_object_or_404
from pathlib import Path

from photonix.photos.utils.thumbnails import get_thumbnail

from photonix.photos.models import Library


def thumbnail(request, photo_id, width, height, crop, quality):
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


def upload(request):
    if 'library_id' not in request.GET:
        return JsonResponse({'ok': False, 'message': 'library_id must be supplied as GET parameter'}, status=400)
    user = request.user
    lib = get_object_or_404(Library, id=request.GET['library_id'], user=user)
    libpath = lib.paths.all()[0]
    for fn, file in request.FILES.items():
        dest = Path(libpath.path) / fn
        with open(dest, 'wb+') as destination:
            print(f'Writing to {dest}')
            for chunk in file.chunks():
                destination.write(chunk)
    # import pdb; pdb.set_trace()
    return JsonResponse({'ok': True})