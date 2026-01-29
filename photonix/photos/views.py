import hashlib
import math
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound, JsonResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from PIL import Image, ImageFile

from photonix.photos.utils.thumbnails import get_thumbnail
from photonix.photos.models import Library, Photo


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
    response = HttpResponseRedirect(path)
    # Cache the redirect for 7 days - thumbnail URLs are immutable (based on photo ID)
    response['Cache-Control'] = 'public, max-age=604800, immutable'
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
    return JsonResponse({'ok': True})


def dummy_thumbnail_response(request, path):
    # Only used during testing to return thumbnail images. Everywhere else, Nginx handles these requests.
    path = str(Path(settings.THUMBNAIL_ROOT) / path)
    with open(path, 'rb') as f:
        return HttpResponse(f.read(), content_type='image/jpeg')


# Tile cache directory (used by tests)
TILE_CACHE_ROOT = Path(settings.THUMBNAIL_ROOT) / 'tiles'


def photo_tile(request, photo_id, z, x, y):
    """
    Generate a tile for deep zoom viewing on-the-fly.

    Uses a SQUARE tiling scheme to match Leaflet CRS.Simple:
    - The image is mapped to a square coordinate space based on largest dimension
    - Non-square images are centered with grey padding on shorter dimension
    - At zoom N: the square is divided into 2^N x 2^N tiles

    Example for 640x448 landscape image:
    - Square size = 640 (max dimension)
    - Image is centered: padding_y = (640-448)/2 = 96px on top and bottom
    - At zoom 0: one tile covers the entire 640x640 square
    - Tile (0,0) at zoom 0 shows: full image centered with grey padding

    Coordinates:
    - X increases left-to-right (0 = leftmost column)
    - Y increases top-to-bottom (0 = topmost row) - matches PIL/web convention

    The frontend uses Leaflet CRS.Simple which has Y increasing upward,
    but this is handled by the frontend (no TMS flip here).
    """
    z, x, y = int(z), int(x), int(y)
    tile_size = 256

    # Return blue tile for negative coordinates or zoom (for debugging)
    if z < 0 or x < 0 or y < 0:
        tile = Image.new('RGB', (tile_size, tile_size), (0, 100, 200))  # Blue for invalid coords
        response = HttpResponse(content_type='image/jpeg')
        tile.save(response, 'JPEG', quality=85)
        response['Cache-Control'] = 'no-cache'
        return response

    num_tiles = 2 ** z

    photo = get_object_or_404(Photo, id=photo_id)
    photo_file = photo.base_file

    if not photo_file:
        return HttpResponseNotFound('Photo has no base file')

    # Open the source image
    ImageFile.LOAD_TRUNCATED_IMAGES = True
    try:
        im = Image.open(photo_file.base_image_path)
    except FileNotFoundError:
        return HttpResponseNotFound('Source image not found')

    if im.mode != 'RGB':
        im = im.convert('RGB')

    img_width, img_height = im.size

    # SQUARE COORDINATE SYSTEM:
    # Map image to a square based on largest dimension
    # Image is centered within the square
    max_dim = max(img_width, img_height)

    # Calculate padding (where the image sits within the square)
    padding_x = (max_dim - img_width) // 2
    padding_y = (max_dim - img_height) // 2

    # Check for out-of-bounds tile coordinates (num_tiles already calculated above)
    if x >= num_tiles or y >= num_tiles:
        tile = Image.new('RGB', (tile_size, tile_size), (0, 150, 100))  # Green for out-of-bounds
        response = HttpResponse(content_type='image/jpeg')
        tile.save(response, 'JPEG', quality=85)
        response['Cache-Control'] = 'no-cache'
        return response

    # Calculate pixel bounds for this tile IN THE SQUARE COORDINATE SPACE
    # Each tile covers (max_dim / num_tiles) pixels of the square
    square_tile_size = max_dim / num_tiles

    # Tile bounds in the square coordinate space (0,0 to max_dim,max_dim)
    square_left = x * square_tile_size
    square_right = (x + 1) * square_tile_size
    square_top = y * square_tile_size
    square_bottom = (y + 1) * square_tile_size

    # Convert to image pixel coordinates (accounting for padding)
    # Image starts at (padding_x, padding_y) in the square
    img_left = square_left - padding_x
    img_right = square_right - padding_x
    img_top = square_top - padding_y
    img_bottom = square_bottom - padding_y

    # Create tile canvas (purple background for padding areas)
    tile = Image.new('RGB', (tile_size, tile_size), (150, 50, 150))

    # Calculate the intersection with actual image bounds
    crop_left = max(0, img_left)
    crop_top = max(0, img_top)
    crop_right = min(img_width, img_right)
    crop_bottom = min(img_height, img_bottom)

    # Check if tile intersects with the actual image
    if crop_left < crop_right and crop_top < crop_bottom:
        # Crop the portion of the image that falls within this tile
        crop = im.crop((int(crop_left), int(crop_top), int(crop_right), int(crop_bottom)))

        # Calculate where to paste in the tile (0-255 coordinates)
        # Scale factor: tile_size pixels per square_tile_size image pixels
        scale_factor = tile_size / square_tile_size

        # Position in tile where the cropped region should go
        # Use int() for position - truncating down is correct here
        paste_x = int((crop_left - img_left) * scale_factor)
        paste_y = int((crop_top - img_top) * scale_factor)

        # Size of the cropped region in tile pixels
        # Use round() instead of int() to avoid truncation of 255.999... to 255
        # This fixes the 1-pixel gap that shows magenta background
        paste_width = round((crop_right - crop_left) * scale_factor)
        paste_height = round((crop_bottom - crop_top) * scale_factor)

        # Ensure minimum size of 1 pixel and maximum of remaining tile space
        paste_width = max(1, min(paste_width, tile_size - paste_x))
        paste_height = max(1, min(paste_height, tile_size - paste_y))

        # Resize the crop to fit the tile
        resized = crop.resize((paste_width, paste_height), Image.BICUBIC)

        # Paste into the tile
        tile.paste(resized, (paste_x, paste_y))

    # Return the tile
    response = HttpResponse(content_type='image/jpeg')
    tile.save(response, 'JPEG', quality=85)
    response['Cache-Control'] = 'no-cache'
    return response
