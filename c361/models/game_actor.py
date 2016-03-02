from django.db import models
from django.contrib.auth.models import User
import uuid


class GameActor(models.Model):
    title = models.CharField(max_length=256, default="Booly")
    uuid = models.UUIDField(default=uuid.uuid4, unique=True)
    creator = models.ForeignKey(User, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    behaviour_script = models.TextField(blank=True, null=True)

    def __str__(self):
        return "{}: {}".format(self.title, self.created)
