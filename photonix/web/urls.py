import os

from django.urls import path, re_path
from django.contrib import admin
from django.views.decorators.csrf import csrf_exempt
from graphql_jwt.decorators import jwt_cookie

from photonix.photos.views import thumbnailer, upload, dummy_thumbnail_response, photo_tile
from photonix.web.views import CustomGraphQLView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('graphql', csrf_exempt(jwt_cookie(CustomGraphQLView.as_view(graphiql=True))), name='api'),  # TODO: Check that use of csrf_exempt is OK here because of CORS configuration
    # path('upload/', csrf_exempt(upload)),
    re_path('thumbnailer/(?P<type>photo|photofile)/(?P<width>[0-9]+)x(?P<height>[0-9]+)_(?P<crop>cover|contain)_q(?P<quality>[0-9]+)/(?P<id>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/$', thumbnailer),
    # Deep zoom tiles for photo detail view (supports negative coordinates from Leaflet CRS.Simple)
    re_path(r'thumbnailer/tile/(?P<photo_id>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/(?P<z>-?\d+)/(?P<x>-?\d+)/(?P<y>-?\d+)\.jpg$', photo_tile),
]

if os.environ.get('ENV') == 'test':
    urlpatterns.append(
        re_path('thumbnails/(?P<path>[a-z0-9._\-\/]+)', dummy_thumbnail_response)
    )
