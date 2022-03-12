import graphene

from photonix.accounts.schema import Mutation as AccountsMutation
from photonix.accounts.schema import Query as AccountsQuery
from photonix.photos.schema import Query as PhotosQuery
from photonix.photos.schema import Mutation as LibraryMutation

class Query(AccountsQuery, PhotosQuery, graphene.ObjectType):
    # This class will inherit from multiple Queries
    # as we begin to add more apps to our project
    pass


class Mutation(AccountsMutation, LibraryMutation, graphene.ObjectType):
    pass


schema = graphene.Schema(query=Query, mutation=Mutation)
