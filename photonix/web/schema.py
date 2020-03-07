import graphene

from photonix.photos.schema import Query as PhotosQuery
from photonix.accounts.schema import Mutation as AccountsMutation


class Query(PhotosQuery, graphene.ObjectType):
    # This class will inherit from multiple Queries
    # as we begin to add more apps to our project
    pass


class Mutation(AccountsMutation, graphene.ObjectType):
    pass


schema = graphene.Schema(query=Query, mutation=Mutation)
