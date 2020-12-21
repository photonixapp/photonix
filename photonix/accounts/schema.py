import os

from django.contrib.auth import get_user_model

import graphene
from graphene_django.types import DjangoObjectType
import graphql_jwt
from photonix.photos.models import Library, LibraryPath, LibraryUser


User = get_user_model()


class UserType(DjangoObjectType):
    """Docstring for UserType."""

    class Meta:
        model = User


class CreateUser(graphene.Mutation):
    """Docstring for CreateUser."""

    class Arguments:
        """Docstring for Arguments."""

        username = graphene.String(required=True)
        password = graphene.String(required=True)
        password1 = graphene.String(required=True)

    has_config_persional_info = graphene.Boolean()
    user_id = graphene.ID()
    ok = graphene.Boolean()

    @staticmethod
    def mutate(self, info, username, password, password1):
        """Mutate method."""
        if User.objects.filter(username=username).exists():
            raise Exception("Username already exists!")
        elif len(password) < 8 and len(password1) < 8:
            raise Exception("Password must be at least 8 characters long!")
        elif password != password1:
            raise Exception("Password fields do not match!")
        else:
            user = User(username=username)
            user.set_password(password1)
            user.has_config_persional_info = True
            user.save()
        return CreateUser(
            has_config_persional_info=user.has_config_persional_info,
            ok=True, user_id=user.id)


class Mutation(graphene.ObjectType):
    create_user = CreateUser.Field()
    token_auth = graphql_jwt.ObtainJSONWebToken.Field()
    verify_token = graphql_jwt.Verify.Field()
    refresh_token = graphql_jwt.Refresh.Field()
    revoke_token = graphql_jwt.Revoke.Field()


class Environment(graphene.ObjectType):
    demo = graphene.Boolean()
    first_run = graphene.Boolean()
    form = graphene.String()
    user_id = graphene.ID()
    library_id = graphene.ID()
    library_path_id = graphene.ID()


class Query(graphene.ObjectType):
    profile = graphene.Field(UserType)
    environment = graphene.Field(Environment)

    def resolve_profile(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception('Not logged in')
        return user

    def resolve_environment(self, info):
        user = User.objects.first()


        # User.objects.all().delete()
        # user.has_config_persional_info = True
        # user.has_created_library = False
        # user.has_configured_importing = False
        # user.has_configured_image_analysis = False
        # user.save()
        # Library.objects.all().delete()


        if user and user.has_config_persional_info and \
            user.has_created_library and user.has_configured_importing and \
                user.has_configured_image_analysis:
            # raise Exception(info.context.user.is_anonymous)
            return {
                'demo': os.environ.get('DEMO', False),
                'first_run': False,
            }
        else:
            if not user:
                return {
                    'demo': os.environ.get('DEMO', False), 'first_run': True,
                    'form': 'has_config_persional_info'}
            if not user.has_created_library:
                return {
                    'demo': os.environ.get('DEMO', False), 'first_run': True,
                    'form': 'has_created_library', 'user_id': user.id}
            if not user.has_configured_importing:
                return {
                    'demo': os.environ.get('DEMO', False), 'first_run': True,
                    'form': 'has_configured_importing', 'user_id': user.id,
                    'library_id': Library.objects.filter(users__user=user)[0].id,
                    'library_path_id': LibraryPath.objects.filter(library__users__user=user)[0].id
                }
            if not user.has_configured_image_analysis:
                return {
                    'demo': os.environ.get('DEMO', False), 'first_run': True,
                    'form': 'has_configured_image_analysis', 'user_id': user.id,
                    'library_id': Library.objects.filter(users__user=user)[0].id,
                }
