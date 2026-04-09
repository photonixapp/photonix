import os

from django.urls import path, re_path
from django.contrib import admin
from graphql_jwt.decorators import jwt_cookie

from photonix.photos.views import thumbnailer, upload, dummy_thumbnail_response
from photonix.web.views import CustomGraphQLView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('graphql', jwt_cookie(CustomGraphQLView.as_view(graphiql=True)), name='api'),
    # path('upload/', csrf_exempt(upload)),
    re_path('thumbnailer/(?P<type>photo|photofile)/(?P<width>[0-9]+)x(?P<height>[0-9]+)_(?P<crop>cover|contain)_q(?P<quality>[0-9]+)/(?P<id>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/$', thumbnailer),
]

if os.environ.get('ENV') == 'test':
    urlpatterns.append(
        re_path('thumbnails/(?P<path>[a-z0-9._\-\/]+)', dummy_thumbnail_response)
    )
