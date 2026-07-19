"""Cross-user authorization tests.

A second user ("attacker") with their own library must not be able to read
or mutate anything belonging to another user's library via the GraphQL API.
Thumbnail and original-download URLs are deliberately not covered here: they
are protected by unguessable per-photo uuid4 capability URLs instead of
session authorization.
"""
from pathlib import Path

import pytest

from photonix.photos.models import Lens, Photo, PhotoTag, Tag
from photonix.photos.utils.db import record_photo
from .conftest import ApiClient
from .factories import LibraryUserFactory
from .utils import get_graphql_content


def get_graphql_errors(response):
    """The inverse of get_graphql_content - the request must have errored."""
    import json
    content = json.loads(response.content.decode('utf8'))
    assert 'errors' in content, 'Expected the request to be denied but it succeeded'
    return content


@pytest.fixture
def victim(db):
    library_user = LibraryUserFactory()
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    photo = record_photo(snow_path, library_user.library)
    return {
        'user': library_user.user,
        'library': library_user.library,
        'photo': photo,
        'photo_file': photo.files.first(),
    }


@pytest.fixture
def attacker_client(db):
    library_user = LibraryUserFactory()
    tree_path = str(Path(__file__).parent / 'photos' / 'tree.jpg')
    photo = record_photo(tree_path, library_user.library)
    client = ApiClient(user=library_user.user)
    client.photo = photo
    client.library = library_user.library
    return client


def test_cannot_read_another_users_photo(victim, attacker_client):
    query = """
        query PhotoQuery($id: UUID) {
            photo(id: $id) { id }
        }
    """
    response = attacker_client.post_graphql(query, {'id': str(victim['photo'].id)})
    content = get_graphql_errors(response)
    assert content['data']['photo'] is None

    # The same query for the attacker's own photo must still work
    response = attacker_client.post_graphql(query, {'id': str(attacker_client.photo.id)})
    data = get_graphql_content(response)
    assert data['data']['photo']['id'] == str(attacker_client.photo.id)


def test_all_photos_excludes_other_libraries(victim, attacker_client):
    Photo.objects.update(thumbnailed_version=1)  # allPhotos hides unthumbnailed photos
    query = """
        {
            allPhotos {
                edges { node { id } }
            }
        }
    """
    response = attacker_client.post_graphql(query)
    data = get_graphql_content(response)
    ids = [edge['node']['id'] for edge in data['data']['allPhotos']['edges']]
    assert ids == [str(attacker_client.photo.id)]


def test_cannot_read_another_users_photos_around(victim, attacker_client):
    """photosAround must not leak a target photo's id/rotation to a user who
    has no access to its library (regression for P0.4)."""
    query = """
        query PhotosAround($photoId: UUID!) {
            photosAround(photoId: $photoId) { photoIds currentIndex }
        }
    """
    response = attacker_client.post_graphql(query, {'photoId': str(victim['photo'].id)})
    data = get_graphql_content(response)
    assert data['data']['photosAround'] is None

    # The attacker's own photo is still navigable
    response = attacker_client.post_graphql(query, {'photoId': str(attacker_client.photo.id)})
    data = get_graphql_content(response)
    assert str(attacker_client.photo.id) in data['data']['photosAround']['photoIds']
    assert str(victim['photo'].id) not in data['data']['photosAround']['photoIds']


def test_cannot_read_another_users_photo_file_metadata(victim, attacker_client):
    query = """
        query PhotoFileMetadata($photoFileId: UUID) {
            photoFileMetadata(photoFileId: $photoFileId) { ok data }
        }
    """
    response = attacker_client.post_graphql(query, {'photoFileId': str(victim['photo_file'].id)})
    data = get_graphql_content(response)
    assert data['data']['photoFileMetadata']['ok'] is False
    assert not data['data']['photoFileMetadata']['data']


def test_cannot_read_another_users_camera_or_lens(victim, attacker_client):
    lens = Lens.objects.create(
        library=victim['library'], name='Secret Lens',
        earliest_photo=victim['photo'].taken_at, latest_photo=victim['photo'].taken_at)

    response = attacker_client.post_graphql(
        'query Camera($id: UUID) { camera(id: $id) { make model } }',
        {'id': str(victim['photo'].camera.id)})
    get_graphql_errors(response)

    response = attacker_client.post_graphql(
        'query Lens($id: UUID) { lens(id: $id) { name } }',
        {'id': str(lens.id)})
    get_graphql_errors(response)


def test_cannot_read_or_update_another_users_library(victim, attacker_client):
    query = """
        query LibrarySetting($libraryId: UUID) {
            librarySetting(libraryId: $libraryId) { sourceFolder }
        }
    """
    response = attacker_client.post_graphql(query, {'libraryId': str(victim['library'].id)})
    get_graphql_errors(response)

    mutation = """
        mutation updateStyleEnabled($classificationStyleEnabled: Boolean!, $libraryId: ID) {
            updateStyleEnabled(
                input: {classificationStyleEnabled: $classificationStyleEnabled, libraryId: $libraryId}
            ) { classificationStyleEnabled }
        }
    """
    response = attacker_client.post_graphql(
        mutation, {'classificationStyleEnabled': False, 'libraryId': str(victim['library'].id)})
    get_graphql_errors(response)
    victim['library'].refresh_from_db()
    assert victim['library'].classification_style_enabled is True


def test_cannot_rate_another_users_photo(victim, attacker_client):
    mutation = """
        mutation photoRating($photoId: ID!, $starRating: Int!) {
            photoRating(photoId: $photoId, starRating: $starRating) { ok }
        }
    """
    response = attacker_client.post_graphql(
        mutation, {'photoId': str(victim['photo'].id), 'starRating': 1})
    get_graphql_errors(response)
    victim['photo'].refresh_from_db()
    assert victim['photo'].star_rating is None


def test_cannot_tag_another_users_photo(victim, attacker_client):
    mutation = """
        mutation createGenericTag($name: String!, $photoId: ID!) {
            createGenericTag(name: $name, photoId: $photoId) { ok }
        }
    """
    response = attacker_client.post_graphql(
        mutation, {'name': 'gotcha', 'photoId': str(victim['photo'].id)})
    get_graphql_errors(response)
    assert not Tag.objects.filter(library=victim['library'], name='gotcha').exists()


def test_cannot_remove_tags_from_another_users_photo(victim, attacker_client):
    tag = Tag.objects.create(library=victim['library'], name='keep-me', type='G', source='H')
    PhotoTag.objects.create(photo=victim['photo'], tag=tag, confidence=1.0)

    mutation = """
        mutation removeGenericTag($tagId: ID!, $photoId: ID!) {
            removeGenericTag(tagId: $tagId, photoId: $photoId) { ok }
        }
    """
    response = attacker_client.post_graphql(
        mutation, {'tagId': str(tag.id), 'photoId': str(victim['photo'].id)})
    get_graphql_errors(response)
    assert PhotoTag.objects.filter(photo=victim['photo'], tag=tag).exists()


def test_cannot_edit_another_users_face_tags(victim, attacker_client):
    tag = Tag.objects.create(library=victim['library'], name='Alice', type='F', source='C')
    photo_tag = PhotoTag.objects.create(
        photo=victim['photo'], tag=tag, confidence=0.9, verified=False, source='C')

    for mutation, variables in [
        ("""mutation editFaceTag($photoTagId: ID!, $newName: String!) {
                editFaceTag(photoTagId: $photoTagId, newName: $newName) { ok }
            }""", {'photoTagId': str(photo_tag.id), 'newName': 'Mallory'}),
        ("""mutation blockFaceTag($photoTagId: ID!) {
                blockFaceTag(photoTagId: $photoTagId) { ok }
            }""", {'photoTagId': str(photo_tag.id)}),
        ("""mutation verifyPhoto($photoTagId: ID!) {
                verifyPhoto(photoTagId: $photoTagId) { ok }
            }""", {'photoTagId': str(photo_tag.id)}),
    ]:
        response = attacker_client.post_graphql(mutation, variables)
        get_graphql_errors(response)

    photo_tag.refresh_from_db()
    assert photo_tag.tag.name == 'Alice'
    assert photo_tag.verified is False
    assert photo_tag.deleted is False


def test_cannot_delete_or_bulk_tag_another_users_photos(victim, attacker_client):
    mutation = """
        mutation setPhotosDeleted($photoIds: String!) {
            setPhotosDeleted(photoIds: $photoIds) { ok }
        }
    """
    attacker_client.post_graphql(mutation, {'photoIds': str(victim['photo'].id)})
    victim['photo'].refresh_from_db()
    assert victim['photo'].deleted is False

    mutation = """
        mutation assignTagToPhotos($name: String!, $photoIds: String!, $tagType: String!) {
            assignTagToPhotos(name: $name, photoIds: $photoIds, tagType: $tagType) { ok }
        }
    """
    response = attacker_client.post_graphql(
        mutation, {'name': 'gotcha', 'photoIds': str(victim['photo'].id), 'tagType': 'A'})
    get_graphql_errors(response)
    assert not Tag.objects.filter(library=victim['library'], name='gotcha').exists()


def test_cannot_change_another_users_photo_file(victim, attacker_client):
    mutation = """
        mutation changePreferredPhotoFile($selectedPhotoFileId: ID!) {
            changePreferredPhotoFile(selectedPhotoFileId: $selectedPhotoFileId) { ok }
        }
    """
    response = attacker_client.post_graphql(
        mutation, {'selectedPhotoFileId': str(victim['photo_file'].id)})
    get_graphql_errors(response)
    victim['photo'].refresh_from_db()
    assert victim['photo'].preferred_photo_file is None

    mutation = """
        mutation savePhotoFileRotation($photoFileId: ID!, $rotation: Int!) {
            savePhotoFileRotation(photoFileId: $photoFileId, rotation: $rotation) { ok }
        }
    """
    response = attacker_client.post_graphql(
        mutation, {'photoFileId': str(victim['photo_file'].id), 'rotation': 90})
    get_graphql_errors(response)
    victim['photo_file'].refresh_from_db()
    assert victim['photo_file'].user_rotation == 0


def test_anonymous_cannot_run_onboarding_mutations_for_existing_user(victim):
    """Onboarding mutations must not act on a client-supplied user id.

    Before being locked down, createLibrary/PhotoImporting/imageAnalysis
    trusted the userId/libraryId arguments from unauthenticated callers,
    allowing an anonymous attacker to attach libraries and import paths to
    any account and to be logged in as any not-yet-onboarded user.
    """
    from django.contrib.auth.models import AnonymousUser

    from photonix.photos.models import Library, LibraryPath

    client = ApiClient(user=AnonymousUser())
    victim_path = LibraryPath.objects.create(
        library=victim['library'], type='St', backend_type='Lo',
        path='/data/photos')

    mutation = """
        mutation ($name: String!, $backendType: String!, $path: String!, $userId: ID!) {
            createLibrary(input: {name: $name, backendType: $backendType, path: $path, userId: $userId}) {
                ok
            }
        }
    """
    response = client.post_graphql(mutation, {
        'name': 'evil', 'backendType': 'Lo', 'path': '/data/photos',
        'userId': str(victim['user'].id)})
    get_graphql_errors(response)
    assert Library.objects.filter(users__user=victim['user']).count() == 1

    mutation = """
        mutation ($watchForChanges: Boolean!, $addAnotherPath: Boolean!, $importPath: String!,
                  $deleteAfterImport: Boolean!, $userId: ID!, $libraryId: ID!, $libraryPathId: ID!) {
            PhotoImporting(input: {watchForChanges: $watchForChanges, addAnotherPath: $addAnotherPath,
                                   importPath: $importPath, deleteAfterImport: $deleteAfterImport,
                                   userId: $userId, libraryId: $libraryId, libraryPathId: $libraryPathId}) {
                ok
            }
        }
    """
    response = client.post_graphql(mutation, {
        'watchForChanges': True, 'addAnotherPath': True,
        'importPath': '/data/photos', 'deleteAfterImport': True,
        'userId': str(victim['user'].id),
        'libraryId': str(victim['library'].id),
        'libraryPathId': str(victim_path.id)})
    get_graphql_errors(response)
    victim_path.refresh_from_db()
    assert victim_path.watch_for_changes is False
    assert victim['library'].paths.filter(type='Im').count() == 0

    victim['user'].has_configured_image_analysis = False
    victim['user'].save()
    mutation = """
        mutation ($userId: ID!, $libraryId: ID!) {
            imageAnalysis(input: {classificationColorEnabled: false,
                                  classificationStyleEnabled: false,
                                  classificationObjectEnabled: false,
                                  classificationLocationEnabled: false,
                                  classificationFaceEnabled: false,
                                  classificationEventEnabled: false,
                                  classificationClipEnabled: false,
                                  userId: $userId, libraryId: $libraryId}) {
                ok
            }
        }
    """
    response = client.post_graphql(mutation, {
        'userId': str(victim['user'].id), 'libraryId': str(victim['library'].id)})
    get_graphql_errors(response)
    assert not response.wsgi_request.user.is_authenticated
    victim['user'].refresh_from_db()
    victim['library'].refresh_from_db()
    assert victim['user'].has_configured_image_analysis is False
    assert victim['library'].classification_color_enabled is True


def test_cannot_hijack_another_users_onboarding(victim, attacker_client):
    """An authenticated user must not complete image analysis onboarding (and
    thereby be logged in) as a different, not-yet-onboarded user."""
    victim['user'].has_configured_image_analysis = False
    victim['user'].save()

    mutation = """
        mutation ($userId: ID!, $libraryId: ID!) {
            imageAnalysis(input: {classificationColorEnabled: true,
                                  classificationStyleEnabled: true,
                                  classificationObjectEnabled: true,
                                  classificationLocationEnabled: true,
                                  classificationFaceEnabled: true,
                                  classificationEventEnabled: true,
                                  classificationClipEnabled: true,
                                  userId: $userId, libraryId: $libraryId}) {
                ok
            }
        }
    """
    response = attacker_client.post_graphql(mutation, {
        'userId': str(victim['user'].id),
        'libraryId': str(attacker_client.library.id)})
    get_graphql_errors(response)
    assert response.wsgi_request.user != victim['user']
    victim['user'].refresh_from_db()
    assert victim['user'].has_configured_image_analysis is False


def test_anonymous_user_cannot_read_or_mutate(victim):
    from django.contrib.auth.models import AnonymousUser

    client = ApiClient(user=AnonymousUser())

    response = client.post_graphql(
        'query PhotoQuery($id: UUID) { photo(id: $id) { id } }',
        {'id': str(victim['photo'].id)})
    get_graphql_errors(response)

    mutation = """
        mutation photoRating($photoId: ID!, $starRating: Int!) {
            photoRating(photoId: $photoId, starRating: $starRating) { ok }
        }
    """
    response = client.post_graphql(
        mutation, {'photoId': str(victim['photo'].id), 'starRating': 1})
    get_graphql_errors(response)
    victim['photo'].refresh_from_db()
    assert victim['photo'].star_rating is None
