import uuid
from django.db import models
from django.contrib.auth.models import User
from c361.models.game_actor import GameActor


class GameInstance(models.Model):
    title = models.CharField(max_length=256, default="Untitled Game")
    uuid = models.UUIDField(default=uuid.uuid4, unique=True)
    creator = models.ForeignKey(User, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    actors = models.ManyToManyField(GameActor, blank=True, related_name="games")
