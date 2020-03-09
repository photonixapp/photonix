import json
from pathlib import Path

import graphene
import pytest

from .factories import LibraryUserFactory
from .utils import get_graphql_content
from photonix.photos.models import Tag, PhotoTag
from photonix.photos.utils.db import record_photo


class TestGraphQL:
    @pytest.fixture
    def defaults(self, db):
        library_user = LibraryUserFactory()
        library = library_user.library
        user = library_user.user

        snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
        snow_photo = record_photo(snow_path, library)

        tree_path = str(Path(__file__).parent / 'photos' / 'tree.jpg')
        tree_photo = record_photo(tree_path, library)

        return {
            'library_user': library_user,
            'library': library,
            'user': user,
            'snow_photo': snow_photo,
            'tree_photo': tree_photo,
        }

    def test_get_photo(self, defaults, api_client):
        api_client.set_user(defaults['user'])
        query = """
            query PhotoQuery($id: UUID) {
                photo(id: $id) {
                    url
                }
            }
        """
        response = api_client.post_graphql(query, {'id': str(defaults['snow_photo'].id)})
        assert response.status_code == 200
        data = get_graphql_content(response)
        assert data['data']['photo']['url'].startswith('/thumbnails')

    def test_get_photos(self, defaults, api_client):
        api_client.set_user(defaults['user'])
        query = """
            {
                allPhotos {
                    edges {
                        node {
                            url
                        }
                    }
                }
            }
        """
        response = api_client.post_graphql(query, {'id': str(defaults['snow_photo'].id)})
        assert response.status_code == 200
        data = get_graphql_content(response)
        assert len(data['data']['allPhotos']['edges']) == 2
        assert data['data']['allPhotos']['edges'][0]['node']['url'].startswith('/thumbnails')

    def test_filter_photos(self, defaults, api_client):
        tree_tag, _ = Tag.objects.get_or_create(library=defaults['library'], name='Tree', type='O')
        tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=defaults['snow_photo'], tag=tree_tag, confidence=1.0)

        multi_filter = f'tag:{tree_tag.id}'

        api_client.set_user(defaults['user'])
        query = """
            query PhotoQuery($filters: String) {
                allPhotos(multiFilter: $filters) {
                    edges {
                        node {
                            id
                        }
                    }
                }
            }
        """
        response = api_client.post_graphql(query, {'filters': multi_filter})

        assert response.status_code == 200
        data = get_graphql_content(response)
        assert len(data['data']['allPhotos']['edges']) == 1
        assert data['data']['allPhotos']['edges'][0]['node']['id'] == str(defaults['snow_photo'].id)

        # Add 'Tree' tag to another photo. Querying again should return 2 photos
        tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=defaults['tree_photo'], tag=tree_tag, confidence=1.0)
        response = api_client.post_graphql(query, {'filters': multi_filter})

        assert response.status_code == 200
        data = get_graphql_content(response)
        assert len(data['data']['allPhotos']['edges']) == 2

        # Add 'Tree' to the last photo again (allowed). Querying should not return duplicates
        tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=defaults['tree_photo'], tag=tree_tag, confidence=0.9)
        response = api_client.post_graphql(query, {'filters': multi_filter})
        assert response.status_code == 200
        data = get_graphql_content(response)
        assert len(data['data']['allPhotos']['edges']) == 2
