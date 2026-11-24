import base64
import binascii
import os
from io import BytesIO

from django.contrib.auth import get_user_model, authenticate, load_backend, login, update_session_auth_hash
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils import timezone
import graphene
from graphene_django.types import DjangoObjectType
from graphql import GraphQLError
from graphql_jwt.decorators import login_required
from graphql_jwt.shortcuts import create_refresh_token, get_token
import graphql_jwt
from PIL import Image, ImageOps

from photonix.photos.models import Library, LibraryInvitation, LibraryPath, LibraryUser
from photonix.photos.utils.demo import is_dev_environment
from photonix.web.utils import demo_mode_enabled, demo_user_locked


User = get_user_model()

AVATAR_SIZE = 256
# ~2MB of decoded image data; the base64 text is ~4/3 larger.
AVATAR_MAX_BASE64_LENGTH = 3 * 1024 * 1024


class UserType(DjangoObjectType):
    avatar_url = graphene.String()

    class Meta:
        model = User
        # Explicit list — "__all__" would expose the password hash and other
        # internals to any query that asks for them.
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'is_staff',
            'is_active', 'date_joined', 'has_set_personal_info',
            'has_created_library', 'has_configured_importing',
            'has_configured_image_analysis',
        )

    def resolve_avatar_url(self, info):
        return self.avatar_url


def validate_new_password(password):
    if len(password) < 8:
        raise GraphQLError('Password must be at least 8 characters long!')


def validate_new_username(username):
    username = username.strip()
    if not username:
        raise GraphQLError('Username is required!')
    if User.objects.filter(username=username).exists():
        raise GraphQLError('Username already exists!')
    return username


def create_configured_user(username, password, email=''):
    """Create a user that skips the first-run wizard (instance already set up)."""
    user = User(username=username, email=email or '')
    user.set_password(password)
    user.has_set_personal_info = True
    user.has_created_library = True
    user.has_configured_importing = True
    user.has_configured_image_analysis = True
    user.save()
    return user


class CreateUser(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        password = graphene.String(required=True)
        password1 = graphene.String(required=True)

    has_set_personal_info = graphene.Boolean()
    user_id = graphene.ID()
    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, username, password, password1):
        # Open signup is only for genuine first-run setup. Afterwards accounts
        # come from adminCreateUser or createUserViaInvitation. Demo instances
        # stay open — they are sandboxes and reset periodically.
        first_user = not User.objects.exists()
        if not first_user and not demo_mode_enabled():
            raise GraphQLError('Signup is only available during first-run setup')
        if User.objects.filter(username=username).exists():
            raise GraphQLError('Username already exists!')
        elif len(password) < 8 and len(password1) < 8:
            raise GraphQLError('Password must be at least 8 characters long!')
        elif password != password1:
            raise GraphQLError('Password fields do not match!')
        else:
            user = User(username=username)
            user.set_password(password1)
            user.has_set_personal_info = True
            # The first-run user administers the instance (Users settings page).
            user.is_staff = first_user
            user.save()
            # Start a session for the new account so the remaining first-run
            # onboarding steps (createLibrary, PhotoImporting, imageAnalysis)
            # can require an authenticated user matching the supplied userId,
            # rather than trusting a client-supplied id from any caller.
            for backend in settings.AUTHENTICATION_BACKENDS:
                if user == load_backend(backend).get_user(user.pk):
                    user.backend = backend
                    break
            if hasattr(user, 'backend'):
                login(info.context, user)
        return CreateUser(
            has_set_personal_info=user.has_set_personal_info,
            ok=True, user_id=user.id)


class Environment(graphene.ObjectType):
    demo = graphene.Boolean()
    sample_data = graphene.Boolean()
    first_run = graphene.Boolean()
    analysis_disabled = graphene.Boolean(required=True)
    form = graphene.String()
    user_id = graphene.ID()
    library_id = graphene.ID()
    library_path_id = graphene.ID()


class AfterSignup(graphene.ObjectType):
    '''Pass token for login, after signup.'''
    token = graphene.String()
    refresh_token = graphene.String()


class Query(graphene.ObjectType):
    profile = graphene.Field(UserType)
    environment = graphene.Field(Environment)
    after_signup = graphene.Field(AfterSignup)
    all_users = graphene.List(UserType)

    def resolve_profile(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise GraphQLError('Not logged in')
        return user

    @login_required
    def resolve_all_users(self, info):
        if not info.context.user.is_staff:
            raise GraphQLError('Not authorized')
        return User.objects.order_by('date_joined')

    def resolve_environment(self, info):
        user = User.objects.first()
        demo = os.environ.get('DEMO', '').lower() in ('1', 'true', 'yes')
        sample_data = demo or os.environ.get('SAMPLE_DATA', '').lower() in ('1', 'true', 'yes')
        # Stored-results mode: the demo serves analysis from a fixture with no classifiers.
        # Not keyed on CLASSIFICATION_DISABLED alone, which can also mean ML runs elsewhere.
        # Same condition as import_demo_photos' use_stored_outputs.
        analysis_disabled = (os.environ.get('CLASSIFICATION_DISABLED') == '1' and
                             demo_mode_enabled() and not is_dev_environment())

        if user and user.has_set_personal_info and \
            user.has_created_library and user.has_configured_importing and \
                user.has_configured_image_analysis:
            return {
                'demo': demo,
                'sample_data': sample_data,
                'analysis_disabled': analysis_disabled,
                'first_run': False,
            }
        else:
            if not user or not user.is_authenticated:
                return {
                    'demo': demo,
                    'sample_data': sample_data,
                    'analysis_disabled': analysis_disabled,
                    'first_run': True,
                    'form': 'has_set_personal_info'}
            if not user.has_created_library:
                return {
                    'demo': demo,
                    'sample_data': sample_data,
                    'analysis_disabled': analysis_disabled,
                    'first_run': True,
                    'form': 'has_created_library', 'user_id': user.id}
            if not user.has_configured_importing:
                return {
                    'demo': demo,
                    'sample_data': sample_data,
                    'analysis_disabled': analysis_disabled,
                    'first_run': True,
                    'form': 'has_configured_importing', 'user_id': user.id,
                    'library_id': Library.objects.filter(users__user=user)[0].id,
                    'library_path_id': LibraryPath.objects.filter(library__users__user=user)[0].id
                }
            if not user.has_configured_image_analysis:
                return {
                    'demo': demo,
                    'sample_data': sample_data,
                    'analysis_disabled': analysis_disabled,
                    'first_run': True,
                    'form': 'has_configured_image_analysis', 'user_id': user.id,
                    'library_id': Library.objects.filter(users__user=user)[0].id,
                }

    def resolve_after_signup(self, info):
        '''To login user from frontend after finish sigunp process.'''
        user = info.context.user
        if user.is_authenticated and user.has_configured_image_analysis:
            return {'token': get_token(user), 'refresh_token': create_refresh_token(user)}
        return {'token': None, 'refresh_token': None}


class ChangePassword(graphene.Mutation):
    class Arguments:
        old_password = graphene.String(required=True)
        new_password = graphene.String(required=True)

    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, old_password, new_password):
        if demo_user_locked(info.context.user):
            raise GraphQLError('Password cannot be changed in demo mode!')
        if authenticate(username=info.context.user.username, password=old_password):
            info.context.user.set_password(new_password)
            info.context.user.save()
            update_session_auth_hash(info.context, info.context.user)
            return ChangePassword(ok=True)
        return ChangePassword(ok=False)


class UpdateProfile(graphene.Mutation):
    class Arguments:
        email = graphene.String()
        first_name = graphene.String()
        last_name = graphene.String()

    ok = graphene.Boolean()
    profile = graphene.Field(UserType)

    @staticmethod
    @login_required
    def mutate(self, info, email=None, first_name=None, last_name=None):
        user = info.context.user
        if demo_user_locked(user):
            raise GraphQLError('Account cannot be changed in demo mode!')
        if email is not None:
            email = email.strip()
            if email:
                try:
                    validate_email(email)
                except ValidationError:
                    raise GraphQLError('Enter a valid email address!')
            # Informational only — there is no email infrastructure, so no
            # verification round-trip.
            user.email = email
        if first_name is not None:
            user.first_name = first_name.strip()
        if last_name is not None:
            user.last_name = last_name.strip()
        user.save()
        return UpdateProfile(ok=True, profile=user)


class SetAvatar(graphene.Mutation):
    class Arguments:
        image_base64 = graphene.String(required=True)

    ok = graphene.Boolean()
    avatar_url = graphene.String()

    @staticmethod
    @login_required
    def mutate(self, info, image_base64):
        user = info.context.user
        if demo_user_locked(user):
            raise GraphQLError('Account cannot be changed in demo mode!')
        data = image_base64
        if data.startswith('data:'):
            data = data.split(',', 1)[-1]
        if len(data) > AVATAR_MAX_BASE64_LENGTH:
            raise GraphQLError('Avatar image must be smaller than 2MB!')
        try:
            raw = base64.b64decode(data, validate=True)
        except (binascii.Error, ValueError):
            raise GraphQLError('Invalid image data!')
        try:
            image = Image.open(BytesIO(raw))
            image = ImageOps.exif_transpose(image)
            image = image.convert('RGB')
        except Exception:
            raise GraphQLError('Invalid image data!')
        # Re-encoding to a fixed-size JPEG strips metadata and any polyglot
        # payload from the upload.
        image = ImageOps.fit(image, (AVATAR_SIZE, AVATAR_SIZE))
        path = user.avatar_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        image.save(str(path), format='JPEG', quality=85)
        user.avatar_updated_at = timezone.now()
        user.save()
        return SetAvatar(ok=True, avatar_url=user.avatar_url)


class ClearAvatar(graphene.Mutation):
    ok = graphene.Boolean()

    @staticmethod
    @login_required
    def mutate(self, info):
        user = info.context.user
        if demo_user_locked(user):
            raise GraphQLError('Account cannot be changed in demo mode!')
        user.avatar_path().unlink(missing_ok=True)
        user.avatar_updated_at = None
        user.save()
        return ClearAvatar(ok=True)


class AdminCreateUser(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        password = graphene.String(required=True)
        email = graphene.String()

    ok = graphene.Boolean()
    user = graphene.Field(UserType)

    @staticmethod
    @login_required
    def mutate(self, info, username, password, email=None):
        acting_user = info.context.user
        if not acting_user.is_staff:
            raise GraphQLError('Not authorized')
        if demo_user_locked(acting_user):
            raise GraphQLError('Users cannot be managed in demo mode!')
        username = validate_new_username(username)
        validate_new_password(password)
        if email:
            try:
                validate_email(email)
            except ValidationError:
                raise GraphQLError('Enter a valid email address!')
        user = create_configured_user(username, password, email)
        return AdminCreateUser(ok=True, user=user)


class AdminSetUserActive(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)
        is_active = graphene.Boolean(required=True)

    ok = graphene.Boolean()
    user = graphene.Field(UserType)

    @staticmethod
    @login_required
    def mutate(self, info, user_id, is_active):
        acting_user = info.context.user
        if not acting_user.is_staff:
            raise GraphQLError('Not authorized')
        if demo_user_locked(acting_user):
            raise GraphQLError('Users cannot be managed in demo mode!')
        if str(user_id) == str(acting_user.pk):
            raise GraphQLError('Cannot change your own account status!')
        user = User.objects.filter(pk=user_id).first()
        if not user:
            raise GraphQLError('User not found')
        user.is_active = is_active
        user.save()
        return AdminSetUserActive(ok=True, user=user)


class CreateUserViaInvitation(graphene.Mutation):
    """Public signup gated on a valid library invitation token.

    The token is the authorization (capability model) — no session required.
    The frontend logs the new user in afterwards via the normal tokenAuth
    mutation with the credentials it just registered.
    """

    class Arguments:
        token = graphene.String(required=True)
        username = graphene.String(required=True)
        password = graphene.String(required=True)

    ok = graphene.Boolean()
    library_id = graphene.ID()

    @staticmethod
    def mutate(self, info, token, username, password):
        invitation = LibraryInvitation.get_valid(token)
        if not invitation:
            raise GraphQLError('Invitation is no longer valid!')
        username = validate_new_username(username)
        validate_new_password(password)
        user = create_configured_user(username, password)
        LibraryUser.objects.create(library=invitation.library, user=user, owner=False)
        invitation.accepted_by = user
        invitation.accepted_at = timezone.now()
        invitation.save()
        return CreateUserViaInvitation(ok=True, library_id=invitation.library_id)


class Mutation(graphene.ObjectType):
    token_auth = graphql_jwt.ObtainJSONWebToken.Field()
    verify_token = graphql_jwt.Verify.Field()
    refresh_token = graphql_jwt.Refresh.Field()
    revoke_token = graphql_jwt.Revoke.Field()
    # Allow logout to clear the httpOnly JWT (access) and refresh-token cookies
    # that the browser cannot remove itself.
    delete_token_cookie = graphql_jwt.DeleteJSONWebTokenCookie.Field()
    delete_refresh_token_cookie = graphql_jwt.DeleteRefreshTokenCookie.Field()
    create_user = CreateUser.Field()
    change_password = ChangePassword.Field()
    update_profile = UpdateProfile.Field()
    set_avatar = SetAvatar.Field()
    clear_avatar = ClearAvatar.Field()
    admin_create_user = AdminCreateUser.Field()
    admin_set_user_active = AdminSetUserActive.Field()
    create_user_via_invitation = CreateUserViaInvitation.Field()
