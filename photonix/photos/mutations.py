import graphene
from graphene_django.rest_framework.mutation import SerializerMutation
from django.conf import settings
import django_filters
from django_filters import CharFilter
import graphene
from graphene_django.filter import DjangoFilterConnectionField
from graphene_django.types import DjangoObjectType

from graphene_django.serializers import Serializer

class CreateMutation(SerializerMutation):
	class Meta:
    	    serializer_class = Serializer

class EditMutation(graphene.Mutation):
	class Arguments:
    	    # The input arguments for this mutation
    	    id = graphene.ID()
    	    location = graphene.String()
    	    object = graphene.String()
    	    style = graphene.String()

	# The class attributes define the response of the mutation
	picture = graphene.Field(DjangoObjectType)

	def mutate(self, info, id, picture, gender, birthday, motto):
    	    picture = Picture.objects.get(pk=id)
    	    picture.id = ID
    	    picture.location = location
    	    picture.object = object
    	    player.save()
    	    # Notice we return an instance of this mutation
    	    return EditMutation(picture=picture)
	
