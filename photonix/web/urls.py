from django.urls import path, re_path
from django.contrib import admin
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView
from graphql_jwt.decorators import jwt_cookie

from photonix.photos.views import thumbnail_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('graphql', csrf_exempt(jwt_cookie(GraphQLView.as_view(graphiql=True))), name='api'),  # TODO: Check that use of csrf_exempt is OK here because of CORS configuration
    re_path('thumbnails/(?P<width>[0-9]+)x(?P<height>[0-9]+)_(?P<crop>cover|contain)_q(?P<quality>[0-9]+)/(?P<photo_id>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/$', thumbnail_view),
]
