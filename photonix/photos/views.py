from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound, JsonResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404

from photonix.photos.utils.thumbnails import get_thumbnail
from photonix.photos.models import Library


def thumbnailer(request, type, id, width, height, crop, quality):
    width = int(width)
    height = int(height)
    quality = int(quality)

    thumbnail_size_index = None
    force_accurate = False
    for i, thumbnail_size in enumerate(settings.THUMBNAIL_SIZES):
        if width == thumbnail_size[0] and height == thumbnail_size[1] and crop == thumbnail_size[2] and quality == thumbnail_size[3]:
            thumbnail_size_index = i
            force_accurate = thumbnail_size[5]
            break

    if thumbnail_size_index is None:
        return HttpResponseNotFound('No photo thumbnail with these parameters')

    photo_id = None
    photo_file_id = None
    if type == 'photo':
        photo_id = id
    elif type == 'photofile':
        photo_file_id = id

    path = get_thumbnail(photo_file=photo_file_id, photo=photo_id, width=width, height=height, crop=crop, quality=quality, return_type='url', force_accurate=force_accurate)
    return HttpResponseRedirect(path)


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
    return JsonResponse({'ok': True})


def dummy_thumbnail_response(request, path):
    # Only used during testing to return thumbnail images. Everywhere else, Nginx handles these requests.
    path = str(Path(settings.THUMBNAIL_ROOT) / path)
    with open(path, 'rb') as f:
        return HttpResponse(f.read(), content_type='image/jpeg')
