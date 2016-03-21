import uuid
from django.db import models
from django.contrib.auth.models import User
from c361.models.game_actor import GameActorModel
from pykka import ActorRegistry
from django.core.cache import cache


class AlreadyRunningError(Exception):
    pass


class NotRunningError(Exception):
    pass


class GameInstanceModel(models.Model):
    title = models.CharField(max_length=256, default="Untitled Game")
    uuid = models.UUIDField(default=uuid.uuid4)
    creator = models.ForeignKey(User, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    actors = models.ManyToManyField(GameActorModel, blank=True, related_name="games")
    current_turn_number = models.IntegerField(default=0)
    world = models.TextField(blank=True, null=True)

    def is_active(self):
        actor_urn = cache.get(str(self.uuid))
        if actor_urn:
            if ActorRegistry.get_by_urn(actor_urn):
                return True
            else:
                cache.delete(str(self.uuid))
                return False
        else:
            return False

    def get_pactor_ref(self):
        """Get a reference to a pykka actor for this."""
        if not self.is_active():
            raise NotRunningError("This game is not active.")
        else:
            actor_urn = cache.get(str(self.uuid))
            actor_ref = ActorRegistry.get_by_urn(actor_urn)
        return actor_ref

    def get_pactor_proxy(self):
        """Get a proxy to a pykka actor for this."""
        return self.get_pactor_ref().proxy()

    def start(self):
        from c361.helpers.game_runner import GameRunner
        """Start a pykka actor and return a reference to it."""
        if self.is_active():
            raise AlreadyRunningError("This game is already active.")

        actor_ref = GameRunner.start(str(self.uuid))    # Create the actor_ref.
        cache.set(str(self.uuid), actor_ref.actor_urn)  # Cache the actor_ref uuid.
        return actor_ref

    def stop(self):
        actor_proxy = self.get_pactor_proxy()
        cache.delete(str(self.uuid))
        future = actor_proxy.stop()
        future.get()




