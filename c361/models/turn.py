import uuid
from django.db import models


class Turn(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, unique=True)
    game = models.ForeignKey('GameInstance', on_delete=models.CASCADE)
    number = models.IntegerField(default=0)
    delta_dump = models.TextField()
