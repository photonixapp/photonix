from django.http import JsonResponse
from django.middleware.csrf import get_token
from graphene_django.views import GraphQLView
from graphql_jwt.exceptions import JSONWebTokenError


def csrf_failure(request, reason=''):
    # Ensure the CSRF cookie is set in the 403 response so the client can
    # read it and retry the request with the correct X-CSRFToken header.
    get_token(request)
    return JsonResponse({'errors': [{'message': 'CSRF verification failed'}]}, status=403)


class CustomGraphQLView(GraphQLView):
    """
    Custom GraphQL view that handles JWT errors gracefully.

    This prevents invalid/expired refresh tokens from causing server
    tracebacks by catching JSONWebTokenError and returning it as a
    proper GraphQL error response.
    """

    @staticmethod
    def format_error(error):
        """Format errors, handling JWT errors specially to avoid tracebacks."""
        formatted = GraphQLView.format_error(error)

        # Check if this is a JWT error (like invalid refresh token)
        original_error = getattr(error, 'original_error', None)
        if isinstance(original_error, JSONWebTokenError):
            # Return a clean error without the full traceback
            return {
                'message': str(original_error),
                'extensions': {
                    'code': 'INVALID_TOKEN'
                }
            }

        return formatted
