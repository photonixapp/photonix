from django.views.decorators.csrf import csrf_exempturlpatterns = [
    ...
    path('graphql/', csrf_exempt(GraphQLView.as_view(graphiql=True))),
]
