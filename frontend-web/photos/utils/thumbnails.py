import os

from django.conf import settings
from PIL import Image, ImageOps


def generate_thumbnail(photo, size=256):
    pf = photo.files.filter(mimetype='image/jpeg')[0]
    im = Image.open(pf.path)

    if im.mode != 'RGB':
        im = im.convert("RGB")

    im = ImageOps.fit(im, (size, size), Image.ANTIALIAS)

    path = os.path.join(settings.THUMBNAIL_ROOT, '{}.jpg'.format(photo.id))
    im.save(path, format='JPEG', quality=50)
