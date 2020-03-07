from django.contrib.auth.models import AbstractUser

from photonix.common.models import UUIDModel, VersionedModel


class User(UUIDModel, AbstractUser):
    pass
