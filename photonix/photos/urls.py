urlpatterns = [
    ...
    path('graphql/', GraphQLView.as_view(graphiql=True)),
]
