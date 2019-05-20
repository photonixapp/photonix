from django.conf.urls import url
from django.contrib import admin
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView

from photonix.photos.views import thumbnail_view

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^graphql', csrf_exempt(GraphQLView.as_view(graphiql=True)), name='api'),
    url(r'^thumbnails/(?P<width>[0-9]+)x(?P<height>[0-9]+)_(?P<crop>cover|contain)_q(?P<quality>[0-9]+)/(?P<photo_id>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/$', thumbnail_view),
]
