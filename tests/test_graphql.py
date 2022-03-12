
import datetime
import os
from pathlib import Path
import unittest

import pytest

from .factories import LibraryUserFactory
from .utils import get_graphql_content
from photonix.photos.models import Tag, PhotoTag, Library, LibraryPath, Photo
from photonix.photos.utils.db import record_photo
from photonix.accounts.models import User


class TestGraphQL(unittest.TestCase):
    """Test cases for graphql API's."""

    _library_user = None
    _library = None

    def setUp(self):
        """Make user login before each test case run."""
        super().setUp()
        login_mutation = """
            mutation TokenAuth($username: String!, $password: String!) {
                tokenAuth(username: $username, password: $password) {
                  token
                  refreshToken
                }
              }
        """
        self.api_client.post_graphql(login_mutation, {
            'username': self.defaults['user'].username,
            'password': self.defaults['password']})

    @pytest.fixture(autouse=True)
    def defaults_values(self, db, api_client):
        """Created default user and library."""
        self.api_client = api_client
        self._library_user = LibraryUserFactory()
        self._library = self._library_user.library

        user = self._library_user.user
        user.set_password('demo123456')
        user.save()

        LibraryPath.objects.create(library=self._library, type="St", backend_type='Lo', path='/data/photos/')
        snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
        snow_photo = record_photo(snow_path, self._library)

        tree_path = str(Path(__file__).parent / 'photos' / 'tree.jpg')
        tree_photo = record_photo(tree_path, self._library)

        self.defaults = {
            'library_user': self._library_user,
            'library': self._library,
            'user': user,
            'snow_photo': snow_photo,
            'tree_photo': tree_photo,
            'password': 'demo123456',
        }

    def test_fix347(self):
        # Test fix 347 - Photos with same date are not imported
        path_photo1 = str(Path(__file__).parent / 'photos' / 'photo_no_metadata_1.jpg')
        Path(path_photo1).touch()

        path_photo2 = str(Path(__file__).parent / 'photos' / 'photo_no_metadata_2.jpg')
        Path(path_photo2).touch()

        photo1 = record_photo(path_photo1, self._library)
        photo2 = record_photo(path_photo2, self._library)

        assert(not photo1 == photo2)

    def test_user_login_environment(self):
        """Test user logged in successfully or not."""
        environment_query = """
            query{
                environment {
                  demo
                  firstRun
                  form
                  userId
                  libraryId
                  libraryPathId
                }
            }
        """
        response = self.api_client.post_graphql(environment_query)
        assert response.status_code == 200
        data = get_graphql_content(response)
        self.assertFalse(data['data']['environment']['firstRun'])
        # TODO: Test to make sure the user is actually logged in here - userId etc. should be set

    def test_get_photo(self):
        # self.api_client.set_user(self.defaults['user'])
        query = """
            query PhotoQuery($id: UUID) {
                photo(id: $id) {
                    url
                }
            }
        """
        response = self.api_client.post_graphql(query, {'id': str(self.defaults['snow_photo'].id)})
        assert response.status_code == 200
        data = get_graphql_content(response)
        assert data['data']['photo']['url'].startswith('/thumbnails')

    def test_get_photos(self):
        # self.api_client.set_user(self.defaults['user'])
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
        response = self.api_client.post_graphql(query, {'id': str(self.defaults['snow_photo'].id)})
        assert response.status_code == 200
        data = get_graphql_content(response)
        assert len(data['data']['allPhotos']['edges']) == 2
        assert data['data']['allPhotos']['edges'][0]['node']['url'].startswith('/thumbnails')

    def test_filter_photos(self):
        tree_tag, _ = Tag.objects.get_or_create(library=self.defaults['library'], name='Tree', type='O')
        tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['snow_photo'], tag=tree_tag, confidence=1.0)
        multi_filter = 'library_id:{0} tag:{1}'.format(self.defaults['library'].id,tree_tag.id)
        # self.api_client.set_user(self.defaults['user'])
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
        response = self.api_client.post_graphql(query, {'filters': multi_filter})

        assert response.status_code == 200
        data = get_graphql_content(response)
        assert len(data['data']['allPhotos']['edges']) == 1
        assert data['data']['allPhotos']['edges'][0]['node']['id'] == str(self.defaults['snow_photo'].id)

        # Add 'Tree' tag to another photo. Querying again should return 2 photos
        tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['tree_photo'], tag=tree_tag, confidence=1.0)
        response = self.api_client.post_graphql(query, {'filters': multi_filter})

        assert response.status_code == 200
        data = get_graphql_content(response)
        assert len(data['data']['allPhotos']['edges']) == 2

        # Add 'Tree' to the last photo again (allowed). Querying should not return duplicates
        tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['tree_photo'], tag=tree_tag, confidence=0.9)
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        assert response.status_code == 200
        data = get_graphql_content(response)
        assert len(data['data']['allPhotos']['edges']) == 2

    def test_all_libraries(self):
        """Test list of libraries."""
        query = """
            {
                allLibraries {
                    id
                    name
                }
            }
        """
        response = self.api_client.post_graphql(query)
        data = get_graphql_content(response)
        assert response.status_code == 200
        assert len(data['data']['allLibraries']) == 1
        self.assertEqual(data['data']['allLibraries'][0]['id'], str(self.defaults['library'].id), "Library id not matched.")
        self.assertEqual(data['data']['allLibraries'][0]['name'], self.defaults['library'].name, "Library name not matched.")

    def test_user_profile_data(self):
        """Test profile data."""
        query = """
            {
                profile {
                  id
                  username
                  email
                }
            }
        """
        response = self.api_client.post_graphql(query)
        data = get_graphql_content(response)
        assert response.status_code == 200
        self.assertEqual(data['data']['profile']['id'], str(self.defaults['user'].id), "user id not matched.")
        self.assertEqual(data['data']['profile']['username'], self.defaults['user'].username, "username not matched.")
        self.assertEqual(data['data']['profile']['email'], self.defaults['user'].email, "email not matched.")

    def test_library_setting_data(self):
        """Test library setting data."""
        query = """
            query LibrarySetting($libraryId: UUID) {
                librarySetting(libraryId: $libraryId) {
                  library {
                    name
                    classificationColorEnabled
                    classificationStyleEnabled
                    classificationObjectEnabled
                    classificationLocationEnabled
                    classificationFaceEnabled
                  }
                  sourceFolder
                }
            }
        """
        response = self.api_client.post_graphql(query, {'libraryId': str(self.defaults['library'].id)})
        data = get_graphql_content(response)
        assert response.status_code == 200
        self.assertEqual(data['data']['librarySetting']['library']['name'], self.defaults['library'].name)
        self.assertTrue(data['data']['librarySetting']['library']['classificationColorEnabled'])
        self.assertTrue(data['data']['librarySetting']['library']['classificationStyleEnabled'])
        self.assertTrue(data['data']['librarySetting']['library']['classificationObjectEnabled'])
        self.assertTrue(data['data']['librarySetting']['library']['classificationLocationEnabled'])
        self.assertTrue(data['data']['librarySetting']['library']['classificationFaceEnabled'])
        self.assertEqual(data['data']['librarySetting']['sourceFolder'], self.defaults['library'].paths.all()[0].path)

    def test_library_update_style_enabled_mutation(self):
        """Test library updateStyleEnabled mutation response."""
        mutation = """
            mutation updateStyleEnabled(
                $classificationStyleEnabled: Boolean!
                $libraryId: ID
              ) {
                updateStyleEnabled(
                  input: {
                    classificationStyleEnabled: $classificationStyleEnabled
                    libraryId: $libraryId
                  }
                ) {
                  classificationStyleEnabled
                }
              }
        """
        response = self.api_client.post_graphql(mutation, {'classificationStyleEnabled':True,'libraryId': str(self.defaults['library'].id)})
        data = get_graphql_content(response)
        assert response.status_code == 200
        assert tuple(tuple(data.values())[0].values())[0].get('classificationStyleEnabled')

    def test_library_update_color_enabled_mutation(self):
        """Test library updateColorEnabled mutation response."""
        mutation = """
            mutation updateColorEnabled(
                $classificationColorEnabled: Boolean!
                $libraryId: ID
              ) {
                updateColorEnabled(
                  input: {
                    classificationColorEnabled: $classificationColorEnabled
                    libraryId: $libraryId
                  }
                ) {
                  classificationColorEnabled
                }
            }
        """
        response = self.api_client.post_graphql(mutation, {'classificationColorEnabled':True,'libraryId': str(self.defaults['library'].id)})
        data = get_graphql_content(response)
        assert response.status_code == 200
        assert tuple(tuple(data.values())[0].values())[0].get('classificationColorEnabled')

    def test_library_update_location_enabled_mutation(self):
        """Test library updateLocationEnabled mutation response."""
        mutation = """
            mutation updateLocationEnabled(
                $classificationLocationEnabled: Boolean!
                $libraryId: ID
              ) {
                updateLocationEnabled(
                  input: {
                    classificationLocationEnabled: $classificationLocationEnabled
                    libraryId: $libraryId
                  }
                ) {
                  classificationLocationEnabled
                }
            }
        """
        response = self.api_client.post_graphql(mutation, {'classificationLocationEnabled':False,'libraryId': str(self.defaults['library'].id)})
        data = get_graphql_content(response)
        assert response.status_code == 200
        self.assertFalse(tuple(tuple(data.values())[0].values())[0].get('classificationLocationEnabled'))

    def test_library_update_object_enabled_mutation(self):
        """Test library updateObjectEnabled mutation response."""
        mutation = """
            mutation updateObjectEnabled(
                $classificationObjectEnabled: Boolean!
                $libraryId: ID
              ) {
                updateObjectEnabled(
                  input: {
                    classificationObjectEnabled: $classificationObjectEnabled
                    libraryId: $libraryId
                  }
                ) {
                  classificationObjectEnabled
                }
            }
        """
        response = self.api_client.post_graphql(mutation, {'classificationObjectEnabled':False,'libraryId': str(self.defaults['library'].id)})
        data = get_graphql_content(response)
        assert response.status_code == 200
        self.assertFalse(tuple(tuple(data.values())[0].values())[0].get('classificationObjectEnabled'))

    def test_library_update_source_folder_mutation(self):
        """Test library updateSourceFolder mutation response."""
        mutation = """
            mutation updateSourceFolder($sourceFolder: String!, $libraryId: ID) {
                updateSourceFolder(
                  input: { sourceFolder: $sourceFolder, libraryId: $libraryId }
                ) {
                  sourceFolder
                }
            }
        """
        response = self.api_client.post_graphql(mutation, {'sourceFolder': '/data/photos/','libraryId': str(self.defaults['library'].id)})
        data = get_graphql_content(response)
        assert response.status_code == 200
        self.assertEqual(tuple(tuple(data.values())[0].values())[0].get('sourceFolder'),self.defaults['library'].paths.all()[0].path)

    def test_change_password_mutation(self):
        """Test change password mutation response."""
        mutation = """
            mutation changePassword (
                $oldPassword: String!,
                $newPassword: String!
              ) {
                  changePassword(oldPassword:$oldPassword,newPassword:$newPassword) {
                    ok
                }
              }
        """
        response = self.api_client.post_graphql(mutation, {'oldPassword': self.defaults['password'],'newPassword': 'download123'})
        data = get_graphql_content(response)
        assert response.status_code == 200
        assert tuple(tuple(data.values())[0].values())[0].get('ok')

    def test_after_signup_api(self):
        """Test after signup api response."""
        query = """
            {
              afterSignup {
                token
                refreshToken
              }
            }
        """
        response = self.api_client.post_graphql(query)
        data = get_graphql_content(response)
        assert response.status_code == 200
        assert tuple(tuple(data.values())[0].values())[0].get('token')
        assert tuple(tuple(data.values())[0].values())[0].get('refreshToken')

    def test_photo_rating_mutation(self):
        """Test photo rating mutation response."""
        mutation = """
            mutation photoRating(
               $photoId: ID!,$starRating:Int!,
               ) {
                photoRating(photoId: $photoId,starRating:$starRating) {
                    photo {
                      starRating
                      aperture
                      takenBy
                      flash
                    }
                }
            }
        """
        response = self.api_client.post_graphql(mutation, {'photoId': self.defaults['snow_photo'].id,'starRating':4})
        data = get_graphql_content(response)
        assert response.status_code == 200
        self.assertEqual(tuple(tuple(tuple(data.values())[0].values())[0].values())[0].get('starRating'),4)
        self.assertEqual(tuple(tuple(tuple(data.values())[0].values())[0].values())[0].get('aperture'), self.defaults['snow_photo'].aperture)

    def test_create_generic_tag_mutation(self):
        """Test create_generic_tag mutation response."""
        mutation = """
            mutation createGenericTag(
                $name: String!,
                $photoId: ID!
              ) {
                createGenericTag(name: $name, photoId: $photoId) {
                  ok
                  photoTagId
                  tagId
                  name
                }
            }
        """
        response = self.api_client.post_graphql(
            mutation, {'name': 'snow-photo', 'photoId': self.defaults['snow_photo'].id})
        data = get_graphql_content(response)
        created_generic_tag_obj = Tag.objects.get(name='snow-photo')
        assert tuple(tuple(data.values())[0].values())[0].get('ok')
        self.assertEqual(
            tuple(tuple(data.values())[0].values())[0].get('photoTagId'),
            str(created_generic_tag_obj.photo_tags.all()[0].id))
        self.assertEqual(
            tuple(tuple(data.values())[0].values())[0].get('tagId'),
            str(created_generic_tag_obj.id))
        self.assertEqual(
            tuple(tuple(data.values())[0].values())[0].get('name'),
            'snow-photo')

    def test_remove_generic_tag_mutation(self):
        """Test remove_generic_tag mutation response."""
        mutation = """
            mutation createGenericTag(
                $name: String!,
                $photoId: ID!
              ) {
                createGenericTag(name: $name, photoId: $photoId) {
                  ok
                  photoTagId
                  tagId
                  name
                }
            }
        """
        response = self.api_client.post_graphql(
            mutation, {'name': 'snow-photo', 'photoId': self.defaults['snow_photo'].id})
        data = get_graphql_content(response)
        created_generic_tag_obj = Tag.objects.get(name='snow-photo')
        assert tuple(tuple(data.values())[0].values())[0].get('ok')
        self.assertEqual(
            tuple(tuple(data.values())[0].values())[0].get('photoTagId'),
            str(created_generic_tag_obj.photo_tags.all()[0].id))
        self.assertEqual(
            tuple(tuple(data.values())[0].values())[0].get('tagId'),
            str(created_generic_tag_obj.id))
        self.assertEqual(
            tuple(tuple(data.values())[0].values())[0].get('name'),
            'snow-photo')

        mutation = """
            mutation removeGenericTag(
                $tagId: ID!,
                $photoId: ID!
              ) {
                removeGenericTag(tagId:$tagId, photoId:$photoId) {
                  ok
                }
              }
        """
        response = self.api_client.post_graphql(
            mutation, {'tagId': created_generic_tag_obj.id, 'photoId': self.defaults['snow_photo'].id})
        data = get_graphql_content(response)
        assert tuple(tuple(data.values())[0].values())[0].get('ok')
        self.assertFalse(Photo.objects.get(id=self.defaults['snow_photo'].id).photo_tags.filter(id=created_generic_tag_obj.id))
        self.assertFalse(Tag.objects.filter(id=created_generic_tag_obj.id))

    def test_get_photo_detail_api(self):
        """Test valid resposne of get photo api."""
        query = """
            query Photo($id: UUID) {
                photo(id: $id) {
                  id
                  takenAt
                  takenBy
                  aperture
                  exposure
                  isoSpeed
                  focalLength
                  flash
                  meteringMode
                  driveMode
                  shootingMode
                  starRating
                  camera {
                    id
                    make
                    model
                  }
                  lens {
                    id
                    name
                  }
                  location
                  altitude
                  url
                  locationTags {
                    id
                    tag {
                      id
                      name
                      parent {
                        id
                      }
                    }
                  }
                  objectTags {
                    id
                    tag {
                      name
                    }
                    positionX
                    positionY
                    sizeX
                    sizeY
                  }
                  colorTags {
                    id
                    tag {
                      name
                    }
                    significance
                  }
                  styleTags {
                    id
                    tag {
                      name
                    }
                  }
                  genericTags {
                    id
                    tag {
                      id
                      name
                    }
                  }
                  width
                  height
                }
              }
        """
        tree_tag, _ = Tag.objects.get_or_create(library=self.defaults['library'], name='Tree', type='O')
        tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['tree_photo'], tag=tree_tag, confidence=1.0)
        response = self.api_client.post_graphql(query, {'id': str(self.defaults['tree_photo'].id)})
        assert response.status_code == 200
        data = get_graphql_content(response)
        self.assertEqual(data['data']['photo']['id'], str(self.defaults['tree_photo'].id))
        self.assertEqual(data['data']['photo']['aperture'], self.defaults['tree_photo'].aperture)
        self.assertEqual(data['data']['photo']['exposure'], self.defaults['tree_photo'].exposure)
        self.assertEqual(data['data']['photo']['isoSpeed'], self.defaults['tree_photo'].iso_speed)
        self.assertEqual(str(data['data']['photo']['focalLength']), self.defaults['tree_photo'].focal_length)
        self.assertEqual(data['data']['photo']['meteringMode'], self.defaults['tree_photo'].metering_mode)
        self.assertFalse(data['data']['photo']['flash'])
        self.assertEqual(data['data']['photo']['camera']['id'], str(self.defaults['tree_photo'].camera.id))
        self.assertEqual(data['data']['photo']['width'], self.defaults['tree_photo'].dimensions[0])
        self.assertEqual(data['data']['photo']['height'], self.defaults['tree_photo'].dimensions[1])
        self.assertEqual(data['data']['photo']['objectTags'][0]['id'], str(tree_photo_tag.id))
        self.assertEqual(data['data']['photo']['objectTags'][0]['tag']['name'], tree_tag.name)
        assert data['data']['photo']['url'].startswith('/thumbnails')

    def test_filter_photos_by_date_api(self):
        """Test photo filtering API by passing date with all scenarios."""
        tree_tag, _ = Tag.objects.get_or_create(library=self.defaults['library'], name='Tree', type='O')
        tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['tree_photo'], tag=tree_tag, confidence=1.0)
        taken_at_date = self.defaults['snow_photo'].taken_at
        # Filter photos by current year only example 'library_id:{0} 2021'
        multi_filter = 'library_id:{0} {1}'.format(self.defaults['library'].id, taken_at_date.year)
        query = """
            query Photos($filters: String) {
                allPhotos(multiFilter: $filters) {
                  edges {
                    node {
                      id
                      location
                      starRating
                    }
                  }
                }
            }
        """
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        data = get_graphql_content(response)
        self.assertEqual(len(data['data']['allPhotos']['edges']), 2)
        self.assertEqual(data['data']['allPhotos']['edges'][1]['node']['id'], str(self.defaults['snow_photo'].id))
        self.assertEqual(data['data']['allPhotos']['edges'][0]['node']['id'], str(self.defaults['tree_photo'].id))
        # Filter photos by month name only example 'library_id:{0} March 2017'
        multi_filter = 'library_id:{0} {1} {2}'.format(self.defaults['library'].id, taken_at_date.strftime('%B').lower(),taken_at_date.year)
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        data = get_graphql_content(response)
        self.assertEqual(len(data['data']['allPhotos']['edges']), 1)

        # Filter photos by first 3 letter of month name only example 'library_id:{0} Mar' 2017
        multi_filter = 'library_id:{0} {1} {2}'.format(self.defaults['library'].id, taken_at_date.strftime('%b').lower(), taken_at_date.year)
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        data = get_graphql_content(response)
        self.assertEqual(len(data['data']['allPhotos']['edges']), 1)

        # Filter photos by date and current month name. example 'library_id:{0} March 18 2017'
        multi_filter = 'library_id:{0} {1} {2} {3}'.format(self.defaults['library'].id, taken_at_date.strftime('%b').lower(), taken_at_date.strftime("%d"), taken_at_date.year)
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        data = get_graphql_content(response)
        self.assertEqual(len(data['data']['allPhotos']['edges']), 1)

        # Filter photos by date and current month name and year example 'library_id:{0} 18 March 2021'.
        multi_filter = 'library_id:{0} {1} {2} {3}'.format(self.defaults['library'].id, taken_at_date.strftime("%d"), taken_at_date.strftime('%b').lower(), taken_at_date.year)
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        data = get_graphql_content(response)
        self.assertEqual(len(data['data']['allPhotos']['edges']), 1)

        # Filter photos by date having some other words like in of etc example 'library_id:{0} party in mar 2021'.
        multi_filter = 'library_id:{0} party in {1} {2}'.format(self.defaults['library'].id, taken_at_date.strftime('%b').lower(), taken_at_date.year)
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        data = get_graphql_content(response)
        self.assertEqual(len(data['data']['allPhotos']['edges']), 0)# Because photos having this date but any photo not having party tag.

        # Filter photos by date having some other words like in of etc and any tag name with date example 'library_id:{0} Tree in mar 2021'.
        taken_at_date = self.defaults['tree_photo'].taken_at
        multi_filter = 'library_id:{0} Tree in {1} {2}'.format(self.defaults['library'].id, taken_at_date.strftime('%b').lower(), taken_at_date.year)
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        data = get_graphql_content(response)
        self.assertEqual(len(data['data']['allPhotos']['edges']), 1)

        # Filter photos by tag id and month name example 'library_id:{0} tag:id mar 2018'.
        multi_filter = 'library_id:{0} tag:{1} {2} {3}'.format(self.defaults['library'].id, tree_tag.id, taken_at_date.strftime('%B').lower(), taken_at_date.year)
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        data = get_graphql_content(response)
        self.assertEqual(len(data['data']['allPhotos']['edges']), 1)

    def test_filter_photos_for_map_api(self):
        """Test photo filtering API for map."""
        tree_tag, _ = Tag.objects.get_or_create(library=self.defaults['library'], name='Tree', type='O')
        tree_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['tree_photo'], tag=tree_tag, confidence=1.0)
        taken_at_date = self.defaults['tree_photo'].taken_at
        multi_filter = 'library_id:{0} tag:{1} {2} {3}'.format(self.defaults['library'].id, tree_tag.id, taken_at_date.strftime('%B').lower(),taken_at_date.year)
        query = """
            query Photos($filters: String) {
                mapPhotos(multiFilter: $filters) {
                  edges {
                    node {
                      id
                      url
                      location
                    }
                  }
                }
              }
        """
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        data = get_graphql_content(response)
        self.assertEqual(len(data['data']['mapPhotos']['edges']), 1)
        self.assertEqual(data['data']['mapPhotos']['edges'][0]['node']['id'], str(self.defaults['tree_photo'].id))
        assert data['data']['mapPhotos']['edges'][0]['node']['url'].startswith('/thumbnails')
        assert data['data']['mapPhotos']['edges'][0]['node']['location']

    def test_filter_with_exposure_range_api(self):
        """Test photo filtering by exposure_range example 1/1124."""
        multi_filter = 'library_id:{0} exposure:1/4000-1/1600-1/1124-1/1000-1/800-1/500-1/400'.format(self.defaults['library'].id)
        query = """
            query Photos($filters: String) {
                mapPhotos(multiFilter: $filters) {
                  edges {
                    node {
                      id
                      url
                      location
                    }
                  }
                }
              }
        """
        response = self.api_client.post_graphql(query, {'filters': multi_filter})
        data = get_graphql_content(response)
        # mapPhotos query exclude(latitude__isnull=True, longitude__isnull=True) thats why result return only one photo.
        self.assertEqual(len(data['data']['mapPhotos']['edges']), 1)

    def test_response_of_get_filters_api(self):
        """Test response of get filters api."""
        object_type_tag, _ = Tag.objects.get_or_create(library=self.defaults['library'], name='Tree', type='O')
        object_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['tree_photo'], tag=object_type_tag, confidence=1.0)
        # object_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['snow_photo'], tag=tree_tag, confidence=1.0)
        color_type_tag, _ = Tag.objects.get_or_create(library=self.defaults['library'], name='Yellow', type='C')
        color_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['tree_photo'], tag=color_type_tag, confidence=1.0)
        # object_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['snow_photo'], tag=tree_tag, confidence=1.0)
        white_color_tag, _ = Tag.objects.get_or_create(library=self.defaults['library'], name='White', type='C')
        white_color_photo_tag, _ = PhotoTag.objects.get_or_create(photo=self.defaults['snow_photo'], tag=white_color_tag, confidence=1.0)
        multi_filter = 'aperture:1.3-10'
        query = """
            query AllFilters($libraryId: UUID, $multiFilter: String) {
                allLocationTags(libraryId: $libraryId, multiFilter: $multiFilter) {
                  id
                  name
                  parent {
                    id
                  }
                }
                allObjectTags(libraryId: $libraryId, multiFilter: $multiFilter) {
                  id
                  name
                }
                allPersonTags(libraryId: $libraryId, multiFilter: $multiFilter) {
                  id
                  name
                }
                allColorTags(libraryId: $libraryId, multiFilter: $multiFilter) {
                  id
                  name
                }
                allStyleTags(libraryId: $libraryId, multiFilter: $multiFilter) {
                  id
                  name
                }
                allEventTags(libraryId: $libraryId, multiFilter: $multiFilter) {
                  id
                  name
                }
                allCameras(libraryId: $libraryId) {
                  id
                  make
                  model
                }
                allLenses(libraryId: $libraryId) {
                  id
                  name
                }
                allGenericTags(libraryId: $libraryId, multiFilter: $multiFilter) {
                  name
                  id
                }
                allApertures(libraryId: $libraryId)
                allExposures(libraryId: $libraryId)
                allIsoSpeeds(libraryId: $libraryId)
                allFocalLengths(libraryId: $libraryId)
                allMeteringModes(libraryId: $libraryId)
                allDriveModes(libraryId: $libraryId)
                allShootingModes(libraryId: $libraryId)
              }
        """
        response = self.api_client.post_graphql(query, {'libraryId': self.defaults['library'].id,'multiFilter': multi_filter})
        data = get_graphql_content(response)
        self.assertEqual(len(data['data']['allObjectTags']), 1)
        self.assertEqual(data['data']['allObjectTags'][0]['name'], object_type_tag.name)
        self.assertEqual(len(data['data']['allColorTags']), 2)
        self.assertEqual(data['data']['allColorTags'][0]['name'], white_color_tag.name)
        self.assertEqual(data['data']['allColorTags'][1]['name'], color_type_tag.name)
        self.assertEqual(data['data']['allApertures'][0], self.defaults['tree_photo'].aperture)
        self.assertEqual(data['data']['allCameras'][0]['id'], str(self.defaults['snow_photo'].camera.id))
        self.assertEqual(str(data['data']['allFocalLengths'][0]), self.defaults['snow_photo'].focal_length)


@pytest.mark.django_db
class TestGraphQLOnboarding(unittest.TestCase):
    """Check onboarding(user sign up) process queries."""

    @pytest.fixture(autouse=True)
    def use_fixture(self, api_client):
        """Method to use unittest.TestCase and api_client fixture together in one class."""
        self.api_client = api_client

    def test_onboarding_steps(self):
        """Check all the steps of onboarding(user sign up) process."""
        environment_query = """
            query{
                environment {
                  demo
                  firstRun
                  form
                  userId
                  libraryId
                  libraryPathId
                }
            }
        """
        response = self.api_client.post_graphql(environment_query)
        data = get_graphql_content(response)
        assert response.status_code == 200
        assert data['data']['environment']['firstRun']
        assert data['data']['environment']['form'] == 'has_set_personal_info'
        self.assertFalse(User.objects.all().count())
        mutation = """
            mutation ($username: String!,$password:String!,$password1:String!) {
                createUser(username: $username,password:$password,password1:$password1) {
                    hasSetPersonalInfo
                    userId
                }
            }
        """
        response = self.api_client.post_graphql(
            mutation, {'username': 'demo', 'password': 'demo12345', 'password1': 'demo12345'})
        data = get_graphql_content(response)
        assert response.status_code == 200
        assert data['data']['createUser']['hasSetPersonalInfo']
        assert User.objects.all().count() == 1
        assert User.objects.first().has_set_personal_info
        self.assertFalse(User.objects.first().has_created_library)
        self.assertFalse(response.wsgi_request.user.username)
        mutation = """
            mutation ($name: String!,$backendType: String!,$path: String!,$userId: ID!) 
                {
                    createLibrary(input:{
                        name:$name,
                        backendType:$backendType,
                        path:$path,
                        userId:$userId
                    }) {
                        hasCreatedLibrary
                        userId
                        libraryId
                        libraryPathId
                    }
                }
        """
        response = self.api_client.post_graphql(
            mutation, {
                'name': 'demo library', 'backendType': 'Lo',
                'path': '/data/photos', 'userId': data['data']['createUser']['userId'],
            })
        data = get_graphql_content(response)
        assert response.status_code == 200
        assert data['data']['createLibrary']['hasCreatedLibrary']
        assert User.objects.first().has_created_library
        self.assertFalse(User.objects.first().has_configured_importing)
        mutation = """
            mutation ($watchForChanges: Boolean!,$addAnotherPath: Boolean!,$importPath: String!,
                $deleteAfterImport: Boolean!,$userId: ID!,$libraryId: ID!,$libraryPathId: ID!)
                {
                    PhotoImporting(input:{
                        watchForChanges:$watchForChanges,
                        addAnotherPath:$addAnotherPath,
                        importPath:$importPath,
                        deleteAfterImport:$deleteAfterImport,
                        userId:$userId,
                        libraryId:$libraryId,
                        libraryPathId:$libraryPathId
                    }) {
                        hasConfiguredImporting
                        userId
                        libraryId
                    }
                }
        """
        response = self.api_client.post_graphql(
            mutation, {
                'watchForChanges': True, 'addAnotherPath': True,
                'importPath': '/data/photos', 'deleteAfterImport': True,
                'userId': data['data']['createLibrary']['userId'],
                'libraryId': data['data']['createLibrary']['libraryId'],
                'libraryPathId': data['data']['createLibrary']['libraryPathId']
            })
        data = get_graphql_content(response)
        assert response.status_code == 200
        assert data['data']['PhotoImporting']['hasConfiguredImporting']
        assert User.objects.first().has_configured_importing
        self.assertFalse(User.objects.first().has_configured_image_analysis)
        mutation = """
            mutation (
                $classificationColorEnabled: Boolean!,
                $classificationStyleEnabled: Boolean!,
                $classificationObjectEnabled: Boolean!,
                $classificationLocationEnabled: Boolean!,
                $classificationFaceEnabled: Boolean!,
                $userId: ID!,$libraryId: ID!,
                ) {
                    imageAnalysis(input:{
                        classificationColorEnabled:$classificationColorEnabled,
                        classificationStyleEnabled:$classificationStyleEnabled,
                        classificationObjectEnabled:$classificationObjectEnabled,
                        classificationLocationEnabled:$classificationLocationEnabled,
                        classificationFaceEnabled:$classificationFaceEnabled,
                        userId:$userId,
                        libraryId:$libraryId,
                    }) {
                        hasConfiguredImageAnalysis
                        userId
                    }
                }
        """
        library_id = data['data']['PhotoImporting']['libraryId']
        response = self.api_client.post_graphql(
            mutation, {
                'classificationColorEnabled': True,
                'classificationStyleEnabled': True,
                'classificationObjectEnabled': False,
                'classificationLocationEnabled': False,
                'classificationFaceEnabled': False,
                'userId': data['data']['PhotoImporting']['userId'],
                'libraryId': data['data']['PhotoImporting']['libraryId'],
            })
        data = get_graphql_content(response)
        library = Library.objects.get(pk=library_id)
        assert User.objects.all().count() == 1
        assert response.status_code == 200
        assert data['data']['imageAnalysis']['hasConfiguredImageAnalysis']
        assert library.classification_color_enabled
        assert library.classification_style_enabled
        self.assertFalse(library.classification_object_enabled)
        self.assertFalse(library.classification_location_enabled)
        self.assertTrue(
            User.objects.filter(
                username='demo', has_set_personal_info=True,
                has_created_library=True, has_configured_importing=True,
                has_configured_image_analysis=True).exists()
        )
        assert response.wsgi_request.user.username == 'demo'


