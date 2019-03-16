import graphene

from photonix.photos.schema import Query as OtherQuery


class Query(OtherQuery, graphene.ObjectType):
    # This class will inherit from multiple Queries
    # as we begin to add more apps to our project
    pass

schema = graphene.Schema(query=Query)
