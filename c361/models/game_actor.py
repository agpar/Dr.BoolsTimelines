from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
import uuid


class GameActorModel(models.Model):
    title = models.CharField(max_length=256, default="Booly")
    uuid = models.UUIDField(default=uuid.uuid4)
    creator = models.ForeignKey(User, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    behaviour_script = models.TextField(blank=True, null=True)
    copy_of = models.ForeignKey('GameActorModel', on_delete=models.CASCADE, blank=True, null=True, related_name='copies')

    health = models.IntegerField(default=100)
    hunger = models.IntegerField(default=100)
    sleep = models.IntegerField(default=100)
    is_sleeping = models.BooleanField(default=False)
    direction = models.CharField(max_length=20, default='NORTH')
    block = models.BooleanField(default=False)
    x_coord = models.IntegerField(default=-1)
    y_coord = models.IntegerField(default=-1)

    def __str__(self):
        return "{}: {}".format(self.title, self.created)

    @property
    def coords(self):
        return (self.x_coord, self.y_coord)

    @property
    def is_master(self):
        return self.copy_of == None

    def reset_to_defaults(self):
        """Reset all stats to default and save."""
        self.health = 100
        self.hunger = 100
        self.is_sleeping = False
        self.direction = 'NORTH'
        self.block = False
        self.x_coord = -1
        self.y_coord = -1
        self.save()

    def deep_copy(self):
        """Create and return a deepcopy for use in games."""
        act = GameActorModel.objects.get(pk=self.pk)
        act.pk = None
        act.uuid = uuid.uuid4()
        act.reset_to_defaults()
        act.copy_of = self
        act.save()
        return act


@receiver(post_save, sender=GameActorModel)
def update_copies(sender, instance, **kwargs):
    if not instance.is_master:
        return
    for copy in instance.copies.all():
        copy.title = instance.title
        copy.creator = instance.creator
        copy.behaviour_script = instance.behaviour_script
        copy.save()
