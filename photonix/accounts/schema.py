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


class Query(graphene.ObjectType):
    profile = graphene.Field(UserType)

    def resolve_profile(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception('Not logged in')
        return user
