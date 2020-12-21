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
