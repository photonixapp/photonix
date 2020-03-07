from django.apps import AppConfig
from django.dispatch import receiver

from graphql_jwt.refresh_token.signals import refresh_token_rotated


class UsersConfig(AppConfig):
    name = 'photonix.users'
    label = 'users'
    verbose_name = 'Photonix Users'


# Automatically revoke refresh token on refresh (one time use)
@receiver(refresh_token_rotated)
def revoke_refresh_token(sender, request, refresh_token, **kwargs):
    refresh_token.revoke(request)
