from django.test import TestCase
from unittest import skip

from ..models import Photo, Tag, PhotoTag
from ..schema import PhotoFilter


@skip('Not fully developed')
class TestFiltering(TestCase):
    def setUp(self):
        tags = ['cat', 'dog', 'rabbit']
        for tag in tags:
            Tag(name=tag, type='O', source='C').save()

        for id in range(5):
            id = '00000000-0000-0000-0000-00000000000{}'.format(id + 1)
            Photo(id=id).save()

        PhotoTag(photo=Photo.objects.get(id='00000000-0000-0000-0000-000000000001'), tag=Tag.objects.get(name='cat'), confidence=0.5).save()
        PhotoTag(photo=Photo.objects.get(id='00000000-0000-0000-0000-000000000002'), tag=Tag.objects.get(name='dog'), confidence=0.5).save()

    def test_filtering(self):
        assert Photo.objects.filter(photo_tags__tag__name__in=['cat', 'dog']).count() == 2

        params = {
            # 'tag': 'cat',
            'tags': '00000000-0000-0000-0000-000000000001',
        }
        f = PhotoFilter(params, queryset=Photo.objects.all())
        # f.qs
        import pdb; pdb.set_trace()
