from django.db import models
from django.contrib.auth.models import User
import uuid


class GameActorModel(models.Model):
    title = models.CharField(max_length=256, default="Booly")
    uuid = models.UUIDField(default=uuid.uuid4)
    creator = models.ForeignKey(User, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    behaviour_script = models.TextField(blank=True, null=True)

    health = models.IntegerField(default=100)
    hunger = models.IntegerField(default=100)
    sleep = models.IntegerField(default=100)
    is_sleeping = models.BooleanField(default=False)
    direction = models.CharField(max_length=20, default='North')
    block = models.BooleanField(default=False)
    x_coord = models.IntegerField(default=-1)
    y_coord = models.IntegerField(default=-1)

    def __str__(self):
        return "{}: {}".format(self.title, self.created)

    @property
    def coords(self):
        return (self.x_coord, self.y_coord)

    @property
    def in_game(self):
        return self.games.exists()
