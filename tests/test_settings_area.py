"""Tests for the settings-area backend: consolidated library updates, library
creation outside onboarding, membership management, invitations, profile /
avatar / admin-user mutations and their authorization rules."""
import base64
import json
from datetime import timedelta
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from PIL import Image
import pytest

from photonix.accounts.models import User
from photonix.photos.models import Library, LibraryInvitation, LibraryPath, LibraryUser
from .conftest import ApiClient
from .factories import LibraryUserFactory, UserFactory
from .utils import get_graphql_content


def get_graphql_errors(response):
    content = json.loads(response.content.decode('utf8'))
    assert 'errors' in content, 'Expected the request to be denied but it succeeded'
    return content


def png_base64(color=(200, 50, 50), size=(64, 48)):
    buffer = BytesIO()
    Image.new('RGB', size, color).save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('ascii')


@pytest.fixture
def owner_membership(db):
    membership = LibraryUserFactory(owner=True)
    LibraryPath.objects.create(
        library=membership.library, type='St', backend_type='Lo', path='/data/photos/')
    return membership


@pytest.fixture
def owner_client(owner_membership):
    return ApiClient(user=owner_membership.user)


@pytest.fixture
def member_membership(owner_membership):
    user = UserFactory()
    return LibraryUser.objects.create(
        library=owner_membership.library, user=user, owner=False)


@pytest.fixture
def member_client(member_membership):
    return ApiClient(user=member_membership.user)


@pytest.fixture
def anonymous_client(db):
    return ApiClient(user=AnonymousUser())


UPDATE_LIBRARY = """
    mutation UpdateLibrary($input: UpdateLibraryInput!) {
        updateLibrary(input: $input) {
            ok
            librarySetting {
                sourceFolder
                watchPhotos
                importPath
                deleteAfterImport
                library { name classificationColorEnabled classificationFaceEnabled }
            }
        }
    }
"""


class TestUpdateLibrary:
    def test_partial_update(self, owner_membership, owner_client):
        library = owner_membership.library
        response = owner_client.post_graphql(UPDATE_LIBRARY, {'input': {
            'libraryId': str(library.id),
            'name': 'Renamed Library',
            'classificationColorEnabled': False,
            'watchPhotos': True,
        }})
        content = get_graphql_content(response)
        setting = content['data']['updateLibrary']['librarySetting']
        assert content['data']['updateLibrary']['ok'] is True
        assert setting['library']['name'] == 'Renamed Library'
        assert setting['library']['classificationColorEnabled'] is False
        # Untouched fields keep their values (factory sets all toggles True)
        assert setting['library']['classificationFaceEnabled'] is True
        assert setting['watchPhotos'] is True
        library.refresh_from_db()
        assert library.name == 'Renamed Library'
        assert library.classification_color_enabled is False
        assert library.classification_face_enabled is True
        assert library.paths.get(type='St').watch_for_changes is True

    def test_import_path_lifecycle(self, owner_membership, owner_client):
        library = owner_membership.library
        # Create
        response = owner_client.post_graphql(UPDATE_LIBRARY, {'input': {
            'libraryId': str(library.id),
            'importPath': '/data/import/',
            'deleteAfterImport': True,
        }})
        setting = get_graphql_content(response)['data']['updateLibrary']['librarySetting']
        assert setting['importPath'] == '/data/import/'
        assert setting['deleteAfterImport'] is True
        import_path = library.paths.get(type='Im')
        assert import_path.backend_type == 'Lo'
        assert import_path.delete_after_import is True
        # Update in place
        response = owner_client.post_graphql(UPDATE_LIBRARY, {'input': {
            'libraryId': str(library.id),
            'importPath': '/data/import2/',
            'deleteAfterImport': False,
        }})
        setting = get_graphql_content(response)['data']['updateLibrary']['librarySetting']
        assert setting['importPath'] == '/data/import2/'
        assert library.paths.filter(type='Im').count() == 1
        # Empty string removes
        response = owner_client.post_graphql(UPDATE_LIBRARY, {'input': {
            'libraryId': str(library.id),
            'importPath': '',
        }})
        setting = get_graphql_content(response)['data']['updateLibrary']['librarySetting']
        assert setting['importPath'] is None
        assert library.paths.filter(type='Im').count() == 0

    def test_requires_owner(self, owner_membership, member_client):
        response = member_client.post_graphql(UPDATE_LIBRARY, {'input': {
            'libraryId': str(owner_membership.library.id), 'name': 'Nope',
        }})
        errors = get_graphql_errors(response)
        assert 'not the owner' in errors['errors'][0]['message']
        owner_membership.library.refresh_from_db()
        assert owner_membership.library.name != 'Nope'

    def test_requires_login(self, owner_membership, anonymous_client):
        response = anonymous_client.post_graphql(UPDATE_LIBRARY, {'input': {
            'libraryId': str(owner_membership.library.id), 'name': 'Nope',
        }})
        get_graphql_errors(response)

    def test_library_setting_includes_import_path(self, owner_membership, owner_client):
        LibraryPath.objects.create(
            library=owner_membership.library, type='Im', backend_type='Lo',
            path='/data/import/', delete_after_import=True)
        response = owner_client.post_graphql("""
            query LibrarySetting($libraryId: UUID) {
                librarySetting(libraryId: $libraryId) {
                    sourceFolder importPath deleteAfterImport watchPhotos
                }
            }
        """, {'libraryId': str(owner_membership.library.id)})
        setting = get_graphql_content(response)['data']['librarySetting']
        assert setting['sourceFolder'] == '/data/photos/'
        assert setting['importPath'] == '/data/import/'
        assert setting['deleteAfterImport'] is True


CREATE_LIBRARY = """
    mutation CreateLibrary($input: CreateLibraryInput!) {
        createLibrary(input: $input) { ok libraryId }
    }
"""


class TestCreateLibraryFromSettings:
    def test_creates_library_with_owner_membership(self, db):
        membership = LibraryUserFactory(owner=True)
        user = membership.user
        user.has_created_library = False
        user.save()
        client = ApiClient(user=user)
        response = client.post_graphql(CREATE_LIBRARY, {'input': {
            'name': 'Second Library', 'backendType': 'Lo', 'path': '/data/second/',
        }})
        content = get_graphql_content(response)
        library_id = content['data']['createLibrary']['libraryId']
        library = Library.objects.get(id=library_id)
        assert library.name == 'Second Library'
        assert library.paths.get(type='St').path == '/data/second/'
        assert LibraryUser.objects.get(library=library, user=user).owner is True
        # Settings-area creation must not touch the onboarding wizard flags
        user.refresh_from_db()
        assert user.has_created_library is False

    def test_requires_login(self, anonymous_client):
        response = anonymous_client.post_graphql(CREATE_LIBRARY, {'input': {
            'name': 'Nope', 'backendType': 'Lo', 'path': '/data/nope/',
        }})
        errors = get_graphql_errors(response)
        assert 'Not logged in' in errors['errors'][0]['message']


LIBRARY_USERS = """
    query LibraryUsers($libraryId: UUID!) {
        libraryUsers(libraryId: $libraryId) { owner user { id username } }
    }
"""


class TestMembers:
    def test_members_can_list_members(self, owner_membership, member_membership, member_client):
        response = member_client.post_graphql(
            LIBRARY_USERS, {'libraryId': str(owner_membership.library.id)})
        users = get_graphql_content(response)['data']['libraryUsers']
        assert len(users) == 2
        by_name = {u['user']['username']: u['owner'] for u in users}
        assert by_name[owner_membership.user.username] is True
        assert by_name[member_membership.user.username] is False

    def test_non_members_cannot_list_members(self, owner_membership, db):
        outsider = LibraryUserFactory()
        client = ApiClient(user=outsider.user)
        response = client.post_graphql(
            LIBRARY_USERS, {'libraryId': str(owner_membership.library.id)})
        get_graphql_errors(response)

    def test_add_by_exact_username(self, owner_membership, owner_client, db):
        newcomer = UserFactory()
        response = owner_client.post_graphql("""
            mutation Add($libraryId: ID!, $username: String!) {
                addLibraryUser(libraryId: $libraryId, username: $username) { ok }
            }
        """, {'libraryId': str(owner_membership.library.id), 'username': newcomer.username})
        assert get_graphql_content(response)['data']['addLibraryUser']['ok'] is True
        membership = LibraryUser.objects.get(library=owner_membership.library, user=newcomer)
        assert membership.owner is False

    def test_add_unknown_username_gives_vague_error(self, owner_membership, owner_client):
        response = owner_client.post_graphql("""
            mutation Add($libraryId: ID!, $username: String!) {
                addLibraryUser(libraryId: $libraryId, username: $username) { ok }
            }
        """, {'libraryId': str(owner_membership.library.id), 'username': 'does-not-exist'})
        errors = get_graphql_errors(response)
        message = errors['errors'][0]['message']
        assert 'Unable to add' in message
        assert 'exist' not in message

    def test_add_requires_owner(self, owner_membership, member_client, db):
        newcomer = UserFactory()
        response = member_client.post_graphql("""
            mutation Add($libraryId: ID!, $username: String!) {
                addLibraryUser(libraryId: $libraryId, username: $username) { ok }
            }
        """, {'libraryId': str(owner_membership.library.id), 'username': newcomer.username})
        get_graphql_errors(response)

    def test_owner_can_remove_member(self, owner_membership, member_membership, owner_client):
        response = owner_client.post_graphql("""
            mutation Remove($libraryId: ID!, $userId: ID!) {
                removeLibraryUser(libraryId: $libraryId, userId: $userId) { ok }
            }
        """, {'libraryId': str(owner_membership.library.id),
              'userId': str(member_membership.user.id)})
        assert get_graphql_content(response)['data']['removeLibraryUser']['ok'] is True
        assert not LibraryUser.objects.filter(pk=member_membership.pk).exists()

    def test_cannot_remove_last_owner(self, owner_membership, owner_client):
        response = owner_client.post_graphql("""
            mutation Remove($libraryId: ID!, $userId: ID!) {
                removeLibraryUser(libraryId: $libraryId, userId: $userId) { ok }
            }
        """, {'libraryId': str(owner_membership.library.id),
              'userId': str(owner_membership.user.id)})
        errors = get_graphql_errors(response)
        assert 'last owner' in errors['errors'][0]['message']
        assert LibraryUser.objects.filter(pk=owner_membership.pk).exists()

    def test_member_can_leave(self, owner_membership, member_membership):
        client = ApiClient(user=member_membership.user)
        response = client.post_graphql("""
            mutation Remove($libraryId: ID!, $userId: ID!) {
                removeLibraryUser(libraryId: $libraryId, userId: $userId) { ok }
            }
        """, {'libraryId': str(owner_membership.library.id),
              'userId': str(member_membership.user.id)})
        assert get_graphql_content(response)['data']['removeLibraryUser']['ok'] is True
        assert not LibraryUser.objects.filter(pk=member_membership.pk).exists()

    def test_set_owner_and_last_owner_guard(self, owner_membership, member_membership, owner_client):
        set_owner = """
            mutation SetOwner($libraryId: ID!, $userId: ID!, $owner: Boolean!) {
                setLibraryUserOwner(libraryId: $libraryId, userId: $userId, owner: $owner) { ok }
            }
        """
        library_id = str(owner_membership.library.id)
        response = owner_client.post_graphql(set_owner, {
            'libraryId': library_id, 'userId': str(member_membership.user.id), 'owner': True})
        assert get_graphql_content(response)['data']['setLibraryUserOwner']['ok'] is True
        member_membership.refresh_from_db()
        assert member_membership.owner is True
        # Demote the second owner again, then demoting the last one must fail
        response = owner_client.post_graphql(set_owner, {
            'libraryId': library_id, 'userId': str(member_membership.user.id), 'owner': False})
        get_graphql_content(response)
        response = owner_client.post_graphql(set_owner, {
            'libraryId': library_id, 'userId': str(owner_membership.user.id), 'owner': False})
        errors = get_graphql_errors(response)
        assert 'last owner' in errors['errors'][0]['message']


CREATE_INVITATION = """
    mutation Invite($libraryId: ID!, $expiresDays: Int) {
        createLibraryInvitation(libraryId: $libraryId, expiresDays: $expiresDays) {
            ok
            invitation { id url expiresAt }
        }
    }
"""

INVITATION_INFO = """
    query Info($token: String!) {
        invitationInfo(token: $token) { valid libraryName invitedBy }
    }
"""

ACCEPT_INVITATION = """
    mutation Accept($token: String!) {
        acceptLibraryInvitation(token: $token) { ok libraryId }
    }
"""


class TestInvitations:
    def test_lifecycle(self, owner_membership, owner_client, db):
        library = owner_membership.library
        response = owner_client.post_graphql(
            CREATE_INVITATION, {'libraryId': str(library.id)})
        invitation = get_graphql_content(response)['data']['createLibraryInvitation']['invitation']
        token = invitation['id']
        assert invitation['url'] == f'/invite/{token}'

        # Listed as pending for the owner
        response = owner_client.post_graphql("""
            query Pending($libraryId: UUID!) {
                libraryInvitations(libraryId: $libraryId) { id }
            }
        """, {'libraryId': str(library.id)})
        assert [i['id'] for i in get_graphql_content(response)['data']['libraryInvitations']] == [token]

        # Public info (anonymous)
        anon = ApiClient(user=AnonymousUser())
        info = get_graphql_content(anon.post_graphql(INVITATION_INFO, {'token': token}))
        assert info['data']['invitationInfo'] == {
            'valid': True, 'libraryName': library.name,
            'invitedBy': owner_membership.user.username}

        # An existing logged-in user accepts
        joiner = UserFactory()
        joiner_client = ApiClient(user=joiner)
        content = get_graphql_content(joiner_client.post_graphql(ACCEPT_INVITATION, {'token': token}))
        assert content['data']['acceptLibraryInvitation']['ok'] is True
        assert LibraryUser.objects.get(library=library, user=joiner).owner is False

        # Consumed: no longer valid, no longer listed
        info = get_graphql_content(anon.post_graphql(INVITATION_INFO, {'token': token}))
        assert info['data']['invitationInfo']['valid'] is False
        assert info['data']['invitationInfo']['libraryName'] is None
        response = owner_client.post_graphql("""
            query Pending($libraryId: UUID!) {
                libraryInvitations(libraryId: $libraryId) { id }
            }
        """, {'libraryId': str(library.id)})
        assert get_graphql_content(response)['data']['libraryInvitations'] == []

    def test_revoked_cannot_be_accepted(self, owner_membership, owner_client, db):
        response = owner_client.post_graphql(
            CREATE_INVITATION, {'libraryId': str(owner_membership.library.id)})
        token = get_graphql_content(response)['data']['createLibraryInvitation']['invitation']['id']
        response = owner_client.post_graphql("""
            mutation Revoke($invitationId: ID!) {
                revokeLibraryInvitation(invitationId: $invitationId) { ok }
            }
        """, {'invitationId': token})
        assert get_graphql_content(response)['data']['revokeLibraryInvitation']['ok'] is True
        joiner_client = ApiClient(user=UserFactory())
        errors = get_graphql_errors(joiner_client.post_graphql(ACCEPT_INVITATION, {'token': token}))
        assert 'no longer valid' in errors['errors'][0]['message']

    def test_expired_invitation_invalid(self, owner_membership, db):
        invitation = LibraryInvitation.objects.create(
            library=owner_membership.library, created_by=owner_membership.user,
            expires_at=timezone.now() - timedelta(minutes=1))
        assert LibraryInvitation.get_valid(str(invitation.id)) is None

    def test_bogus_and_malformed_tokens(self, db):
        anon = ApiClient(user=AnonymousUser())
        for token in ['11111111-1111-4111-8111-111111111111', 'not-a-uuid']:
            info = get_graphql_content(anon.post_graphql(INVITATION_INFO, {'token': token}))
            assert info['data']['invitationInfo']['valid'] is False

    def test_create_requires_owner(self, owner_membership, member_client):
        errors = get_graphql_errors(member_client.post_graphql(
            CREATE_INVITATION, {'libraryId': str(owner_membership.library.id)}))
        assert 'not the owner' in errors['errors'][0]['message']

    def test_accept_is_idempotent_for_existing_member(self, owner_membership, owner_client, member_membership, member_client):
        response = owner_client.post_graphql(
            CREATE_INVITATION, {'libraryId': str(owner_membership.library.id)})
        token = get_graphql_content(response)['data']['createLibraryInvitation']['invitation']['id']
        content = get_graphql_content(member_client.post_graphql(ACCEPT_INVITATION, {'token': token}))
        assert content['data']['acceptLibraryInvitation']['ok'] is True
        # Not consumed - it never granted a membership
        invitation = LibraryInvitation.objects.get(pk=token)
        assert invitation.accepted_at is None


CREATE_USER_VIA_INVITATION = """
    mutation Signup($token: String!, $username: String!, $password: String!) {
        createUserViaInvitation(token: $token, username: $username, password: $password) {
            ok libraryId
        }
    }
"""


class TestCreateUserViaInvitation:
    def test_signs_up_and_joins_library(self, owner_membership, owner_client, db):
        response = owner_client.post_graphql(
            CREATE_INVITATION, {'libraryId': str(owner_membership.library.id)})
        token = get_graphql_content(response)['data']['createLibraryInvitation']['invitation']['id']
        anon = ApiClient(user=AnonymousUser())
        content = get_graphql_content(anon.post_graphql(CREATE_USER_VIA_INVITATION, {
            'token': token, 'username': 'invitee', 'password': 'longenoughpw'}))
        assert content['data']['createUserViaInvitation']['ok'] is True
        user = User.objects.get(username='invitee')
        # Invited accounts skip the first-run wizard entirely
        assert user.has_set_personal_info and user.has_created_library
        assert user.has_configured_importing and user.has_configured_image_analysis
        assert user.is_staff is False
        assert LibraryUser.objects.get(library=owner_membership.library, user=user).owner is False
        assert authenticate(username='invitee', password='longenoughpw') == user
        invitation = LibraryInvitation.objects.get(pk=token)
        assert invitation.accepted_by == user

    def test_invalid_token_denied(self, db):
        anon = ApiClient(user=AnonymousUser())
        errors = get_graphql_errors(anon.post_graphql(CREATE_USER_VIA_INVITATION, {
            'token': '11111111-1111-4111-8111-111111111111',
            'username': 'invitee2', 'password': 'longenoughpw'}))
        assert 'no longer valid' in errors['errors'][0]['message']
        assert not User.objects.filter(username='invitee2').exists()

    def test_short_password_denied(self, owner_membership, owner_client, db):
        response = owner_client.post_graphql(
            CREATE_INVITATION, {'libraryId': str(owner_membership.library.id)})
        token = get_graphql_content(response)['data']['createLibraryInvitation']['invitation']['id']
        anon = ApiClient(user=AnonymousUser())
        errors = get_graphql_errors(anon.post_graphql(CREATE_USER_VIA_INVITATION, {
            'token': token, 'username': 'invitee3', 'password': 'short'}))
        assert 'at least 8 characters' in errors['errors'][0]['message']


CREATE_USER = """
    mutation Signup($username: String!, $password: String!, $password1: String!) {
        createUser(username: $username, password: $password, password1: $password1) {
            ok userId
        }
    }
"""


class TestSignupGating:
    def test_signup_blocked_once_users_exist(self, db):
        UserFactory()
        anon = ApiClient(user=AnonymousUser())
        errors = get_graphql_errors(anon.post_graphql(CREATE_USER, {
            'username': 'walkin', 'password': 'longenoughpw', 'password1': 'longenoughpw'}))
        assert 'first-run' in errors['errors'][0]['message']

    def test_first_user_becomes_site_admin(self, db):
        anon = ApiClient(user=AnonymousUser())
        content = get_graphql_content(anon.post_graphql(CREATE_USER, {
            'username': 'firstadmin', 'password': 'longenoughpw', 'password1': 'longenoughpw'}))
        assert content['data']['createUser']['ok'] is True
        assert User.objects.get(username='firstadmin').is_staff is True


class TestProfile:
    def test_update_profile(self, db):
        user = UserFactory()
        client = ApiClient(user=user)
        content = get_graphql_content(client.post_graphql("""
            mutation Update($email: String, $firstName: String, $lastName: String) {
                updateProfile(email: $email, firstName: $firstName, lastName: $lastName) {
                    ok
                    profile { email firstName lastName }
                }
            }
        """, {'email': 'new@example.com', 'firstName': 'New', 'lastName': 'Name'}))
        assert content['data']['updateProfile']['profile'] == {
            'email': 'new@example.com', 'firstName': 'New', 'lastName': 'Name'}
        user.refresh_from_db()
        assert user.email == 'new@example.com'

    def test_invalid_email_rejected(self, db):
        user = UserFactory()
        client = ApiClient(user=user)
        errors = get_graphql_errors(client.post_graphql("""
            mutation Update($email: String) {
                updateProfile(email: $email) { ok }
            }
        """, {'email': 'not-an-email'}))
        assert 'valid email' in errors['errors'][0]['message']

    def test_user_type_does_not_expose_password(self, db):
        client = ApiClient(user=UserFactory())
        errors = get_graphql_errors(client.post_graphql('query { profile { password } }'))
        assert 'password' in errors['errors'][0]['message']

    def test_profile_exposes_is_staff_and_avatar_url(self, db):
        client = ApiClient(user=UserFactory())
        content = get_graphql_content(client.post_graphql(
            'query { profile { isStaff avatarUrl } }'))
        assert content['data']['profile'] == {'isStaff': False, 'avatarUrl': None}


class TestAvatar:
    def test_set_and_clear_avatar(self, db, client):
        user = UserFactory()
        api = ApiClient(user=user)
        content = get_graphql_content(api.post_graphql("""
            mutation SetAvatar($imageBase64: String!) {
                setAvatar(imageBase64: $imageBase64) { ok avatarUrl }
            }
        """, {'imageBase64': png_base64()}))
        avatar_url = content['data']['setAvatar']['avatarUrl']
        assert avatar_url.startswith(f'/avatar/{user.id}.jpg?v=')
        stored = Path(settings.DATA_DIR) / 'cache' / 'avatars' / f'{user.id}.jpg'
        assert stored.exists()
        image = Image.open(stored)
        assert image.size == (256, 256)
        assert image.format == 'JPEG'
        # Capability-URL view serves it without auth
        response = client.get(f'/avatar/{user.id}.jpg')
        assert response.status_code == 200
        assert response['Content-Type'] == 'image/jpeg'
        # Clear
        content = get_graphql_content(api.post_graphql(
            'mutation { clearAvatar { ok } }'))
        assert content['data']['clearAvatar']['ok'] is True
        assert not stored.exists()
        assert client.get(f'/avatar/{user.id}.jpg').status_code == 404

    def test_rejects_non_image(self, db):
        api = ApiClient(user=UserFactory())
        errors = get_graphql_errors(api.post_graphql("""
            mutation SetAvatar($imageBase64: String!) {
                setAvatar(imageBase64: $imageBase64) { ok }
            }
        """, {'imageBase64': base64.b64encode(b'#!/bin/sh\necho hi').decode('ascii')}))
        assert 'Invalid image' in errors['errors'][0]['message']

    def test_data_uri_prefix_accepted(self, db):
        api = ApiClient(user=UserFactory())
        content = get_graphql_content(api.post_graphql("""
            mutation SetAvatar($imageBase64: String!) {
                setAvatar(imageBase64: $imageBase64) { ok }
            }
        """, {'imageBase64': 'data:image/png;base64,' + png_base64()}))
        assert content['data']['setAvatar']['ok'] is True


class TestAdminUserManagement:
    def test_all_users_staff_only(self, db):
        staff = UserFactory(is_staff=True)
        UserFactory()
        content = get_graphql_content(ApiClient(user=staff).post_graphql(
            'query { allUsers { username isActive } }'))
        assert len(content['data']['allUsers']) == 2
        errors = get_graphql_errors(ApiClient(user=UserFactory()).post_graphql(
            'query { allUsers { username } }'))
        assert 'Not authorized' in errors['errors'][0]['message']

    def test_admin_create_user(self, db):
        staff = UserFactory(is_staff=True)
        content = get_graphql_content(ApiClient(user=staff).post_graphql("""
            mutation Create($username: String!, $password: String!, $email: String) {
                adminCreateUser(username: $username, password: $password, email: $email) {
                    ok
                    user { username email isStaff }
                }
            }
        """, {'username': 'staffmade', 'password': 'longenoughpw', 'email': 'sm@example.com'}))
        assert content['data']['adminCreateUser']['user'] == {
            'username': 'staffmade', 'email': 'sm@example.com', 'isStaff': False}
        user = User.objects.get(username='staffmade')
        assert user.has_configured_image_analysis is True

    def test_admin_create_user_requires_staff(self, db):
        errors = get_graphql_errors(ApiClient(user=UserFactory()).post_graphql("""
            mutation Create($username: String!, $password: String!) {
                adminCreateUser(username: $username, password: $password) { ok }
            }
        """, {'username': 'sneaky', 'password': 'longenoughpw'}))
        assert 'Not authorized' in errors['errors'][0]['message']
        assert not User.objects.filter(username='sneaky').exists()

    def test_admin_set_user_active(self, db):
        staff = UserFactory(is_staff=True)
        target = UserFactory()
        client = ApiClient(user=staff)
        content = get_graphql_content(client.post_graphql("""
            mutation SetActive($userId: ID!, $isActive: Boolean!) {
                adminSetUserActive(userId: $userId, isActive: $isActive) {
                    ok
                    user { isActive }
                }
            }
        """, {'userId': str(target.id), 'isActive': False}))
        assert content['data']['adminSetUserActive']['user']['isActive'] is False
        # Cannot change own account
        errors = get_graphql_errors(client.post_graphql("""
            mutation SetActive($userId: ID!, $isActive: Boolean!) {
                adminSetUserActive(userId: $userId, isActive: $isActive) { ok }
            }
        """, {'userId': str(staff.id), 'isActive': False}))
        assert 'own account' in errors['errors'][0]['message']


@pytest.fixture
def demo_owner(db, monkeypatch):
    """The public demo account as reset_demo leaves it: an owner of its library,
    with demo mode on so demo_user_locked applies."""
    monkeypatch.setattr('photonix.web.utils.demo_mode_enabled', lambda: True)
    user = UserFactory(username='demo')
    membership = LibraryUserFactory(user=user, owner=True)
    path = LibraryPath.objects.create(
        library=membership.library, type='St', backend_type='Lo', path='/data/photos/')
    other = LibraryUser.objects.create(library=membership.library, user=UserFactory(), owner=False)
    invitation = LibraryInvitation.objects.create(
        library=membership.library, created_by=user,
        expires_at=timezone.now() + timedelta(days=1))
    return {'membership': membership, 'library': membership.library, 'path': path,
            'other': other, 'invitation': invitation}


def _demo_state():
    return (
        sorted(Library.objects.values_list(
            'id', 'name', 'classification_color_enabled', 'classification_location_enabled',
            'classification_style_enabled', 'classification_object_enabled',
            'classification_face_enabled')),
        sorted(LibraryPath.objects.values_list(
            'id', 'type', 'path', 'watch_for_changes', 'delete_after_import')),
        sorted(LibraryUser.objects.values_list('id', 'user_id', 'owner')),
        sorted(LibraryInvitation.objects.values_list('id', 'revoked')),
        sorted(User.objects.values_list(
            'id', 'username', 'password', 'email', 'first_name', 'is_active', 'avatar_updated_at')),
    )


def _legacy_toggle(field, name):
    return (f"""
        mutation Toggle($libraryId: ID) {{
            {name}(input: {{{field}: false, libraryId: $libraryId}}) {{ ok }}
        }}
    """, lambda d: {'libraryId': str(d['library'].id)})


# Every library/account mutation an owner can reach, with the variables to
# call it as the demo user. Each must be refused with "... in demo mode!".
DEMO_LOCKED_MUTATIONS = {
    'updateLibrary': (UPDATE_LIBRARY, lambda d: {'input': {
        'libraryId': str(d['library'].id), 'name': 'Defaced', 'sourceFolder': '/',
        'classificationColorEnabled': False}}),
    'updateColorEnabled': _legacy_toggle('classificationColorEnabled', 'updateColorEnabled'),
    'updateLocationEnabled': _legacy_toggle('classificationLocationEnabled', 'updateLocationEnabled'),
    'updateStyleEnabled': _legacy_toggle('classificationStyleEnabled', 'updateStyleEnabled'),
    'updateObjectEnabled': _legacy_toggle('classificationObjectEnabled', 'updateObjectEnabled'),
    'updateFaceEnabled': _legacy_toggle('classificationFaceEnabled', 'updateFaceEnabled'),
    'updateSourceFolder': ("""
        mutation Source($libraryId: ID) {
            updateSourceFolder(input: {sourceFolder: "/", libraryId: $libraryId}) { ok }
        }
    """, lambda d: {'libraryId': str(d['library'].id)}),
    'updateWatchPhotos': ("""
        mutation Watch($libraryId: ID) {
            updateWatchPhotos(input: {watchPhotos: true, libraryId: $libraryId}) { ok }
        }
    """, lambda d: {'libraryId': str(d['library'].id)}),
    'addLibraryUser': ("""
        mutation Add($libraryId: ID!, $username: String!) {
            addLibraryUser(libraryId: $libraryId, username: $username) { ok }
        }
    """, lambda d: {'libraryId': str(d['library'].id), 'username': UserFactory().username}),
    'removeLibraryUser': ("""
        mutation Remove($libraryId: ID!, $userId: ID!) {
            removeLibraryUser(libraryId: $libraryId, userId: $userId) { ok }
        }
    """, lambda d: {'libraryId': str(d['library'].id), 'userId': str(d['other'].user_id)}),
    'setLibraryUserOwner': ("""
        mutation SetOwner($libraryId: ID!, $userId: ID!, $owner: Boolean!) {
            setLibraryUserOwner(libraryId: $libraryId, userId: $userId, owner: $owner) { ok }
        }
    """, lambda d: {'libraryId': str(d['library'].id), 'userId': str(d['other'].user_id), 'owner': True}),
    'createLibraryInvitation': (
        CREATE_INVITATION, lambda d: {'libraryId': str(d['library'].id)}),
    'revokeLibraryInvitation': ("""
        mutation Revoke($invitationId: ID!) {
            revokeLibraryInvitation(invitationId: $invitationId) { ok }
        }
    """, lambda d: {'invitationId': str(d['invitation'].id)}),
    'createLibrary': (CREATE_LIBRARY, lambda d: {'input': {
        'name': 'Defaced', 'backendType': 'Lo', 'path': '/'}}),
    'createLibraryOnboarding': (CREATE_LIBRARY, lambda d: {'input': {
        'name': 'Defaced', 'backendType': 'Lo', 'path': '/',
        'userId': str(d['membership'].user_id)}}),
    'PhotoImporting': ("""
        mutation Importing($userId: ID!, $libraryId: ID!, $libraryPathId: ID!) {
            PhotoImporting(input: {watchForChanges: true, addAnotherPath: true,
                                   importPath: "/", deleteAfterImport: true,
                                   userId: $userId, libraryId: $libraryId,
                                   libraryPathId: $libraryPathId}) { ok }
        }
    """, lambda d: {'userId': str(d['membership'].user_id), 'libraryId': str(d['library'].id),
                    'libraryPathId': str(d['path'].id)}),
    'imageAnalysis': ("""
        mutation Analysis($userId: ID!, $libraryId: ID!) {
            imageAnalysis(input: {classificationColorEnabled: false,
                                  classificationStyleEnabled: false,
                                  classificationObjectEnabled: false,
                                  classificationLocationEnabled: false,
                                  classificationFaceEnabled: false,
                                  userId: $userId, libraryId: $libraryId}) { ok }
        }
    """, lambda d: {'userId': str(d['membership'].user_id), 'libraryId': str(d['library'].id)}),
    'updateProfile': ("""
        mutation Profile { updateProfile(email: "x@example.com", firstName: "X") { ok } }
    """, lambda d: {}),
    'changePassword': ("""
        mutation Password { changePassword(oldPassword: "demo", newPassword: "defaced123") { ok } }
    """, lambda d: {}),
    'setAvatar': ("""
        mutation Avatar($image: String!) { setAvatar(imageBase64: $image) { ok } }
    """, lambda d: {'image': png_base64()}),
    'clearAvatar': ("""
        mutation Clear { clearAvatar { ok } }
    """, lambda d: {}),
}


class TestDemoUserLock:
    @pytest.mark.parametrize('name', list(DEMO_LOCKED_MUTATIONS))
    def test_demo_owner_is_refused(self, demo_owner, name):
        query, variables = DEMO_LOCKED_MUTATIONS[name]
        variables = variables(demo_owner)
        before = _demo_state()
        client = ApiClient(user=demo_owner['membership'].user)
        errors = get_graphql_errors(client.post_graphql(query, variables))
        assert 'in demo mode' in errors['errors'][0]['message']
        assert _demo_state() == before

    def test_other_owner_on_demo_instance_is_not_locked(self, demo_owner):
        # Only the shared demo account is locked, not every owner on the instance
        owner = LibraryUser.objects.create(
            library=demo_owner['library'], user=UserFactory(), owner=True)
        content = get_graphql_content(ApiClient(user=owner.user).post_graphql("""
            mutation Toggle($libraryId: ID) {
                updateColorEnabled(input: {classificationColorEnabled: true, libraryId: $libraryId}) { ok }
            }
        """, {'libraryId': str(demo_owner['library'].id)}))
        assert content['data']['updateColorEnabled']['ok'] is True
