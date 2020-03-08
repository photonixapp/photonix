import json
from pathlib import Path

import graphene
import pytest

from .factories import LibraryFactory
from .utils import get_graphql_content
from photonix.photos.models import Tag, PhotoTag


@pytest.fixture
def photo_fixture_snow(db):
    from photonix.photos.utils.db import record_photo
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    library = LibraryFactory()
    return record_photo(snow_path, library)


@pytest.fixture
def photo_fixture_tree(db):
    from photonix.photos.utils.db import record_photo
    tree_path = str(Path(__file__).parent / 'photos' / 'tree.jpg')
    library = LibraryFactory()
    return record_photo(tree_path, library)


def test_get_photo(photo_fixture_snow, api_client):
    query = """
        query PhotoQuery($id: UUID) {
            photo(id: $id) {
                url
            }
        }
    """
    response = api_client.post_graphql(query, {'id': str(photo_fixture_snow.id)})
    assert response.status_code == 200
    data = get_graphql_content(response)
    assert data['data']['photo']['url'].startswith('/thumbnails')


def test_get_photos(photo_fixture_snow, photo_fixture_tree, api_client):
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
    response = api_client.post_graphql(query, {'id': str(photo_fixture_snow.id)})
    assert response.status_code == 200
    data = get_graphql_content(response)
    assert len(data['data']['allPhotos']['edges']) == 2
    assert data['data']['allPhotos']['edges'][0]['node']['url'].startswith('/thumbnails')


def test_filter_photos(photo_fixture_snow, photo_fixture_tree, api_client):
    tree_tag, _ = Tag.objects.get_or_create(name='Tree', type='O')
    tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=photo_fixture_snow, tag=tree_tag, confidence=1.0)

    multi_filter = f'tag:{tree_tag.id}'

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
    assert data['data']['allPhotos']['edges'][0]['node']['id'] == str(photo_fixture_snow.id)

    # Add 'Tree' tag to another photo. Querying again should return 2 photos
    tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=photo_fixture_tree, tag=tree_tag, confidence=1.0)
    response = api_client.post_graphql(query, {'filters': multi_filter})

    assert response.status_code == 200
    data = get_graphql_content(response)
    assert len(data['data']['allPhotos']['edges']) == 2

    # Add 'Tree' to the last photo again (allowed). Querying should not return duplicates
    tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=photo_fixture_tree, tag=tree_tag, confidence=0.9)
    response = api_client.post_graphql(query, {'filters': multi_filter})
    assert response.status_code == 200
    data = get_graphql_content(response)
    assert len(data['data']['allPhotos']['edges']) == 2
