import os

from django.contrib.auth import get_user_model

import graphene
from graphene_django.types import DjangoObjectType
import graphql_jwt


User = get_user_model()


class Mutation(graphene.ObjectType):
    token_auth = graphql_jwt.ObtainJSONWebToken.Field()
    verify_token = graphql_jwt.Verify.Field()
    refresh_token = graphql_jwt.Refresh.Field()
    revoke_token = graphql_jwt.Revoke.Field()


class UserType(DjangoObjectType):
    class Meta:
        model = User


class Environment(graphene.ObjectType):
    demo = graphene.Boolean()
    first_run = graphene.Boolean()


class Query(graphene.ObjectType):
    profile = graphene.Field(UserType)
    environment = graphene.Field(Environment)

    def resolve_profile(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception('Not logged in')
        return user

    def resolve_environment(self, info):
        return {
            'demo': os.environ.get('DEMO', False),
            'first_run': False,
        }
        user = User.objects.first()
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

    def resolve_after_signup(self, info):
        """To login user from frontend after finish sigunp process."""
        user = info.context.user
        if user.has_configured_image_analysis:
            return {'token': get_token(user), 'refresh_token': create_refresh_token(user)}
        return {'token': None, 'refresh_token': None}
