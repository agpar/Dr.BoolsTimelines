import pykka
from c361.models.game_instance import GameInstanceModel
from c361.gamelogic.game_instance import GameInstance
from django.core.cache import cache


class GameRunner(pykka.ThreadingActor):
    """Runs a GameInstance in a Pykka actor"""

    def __init__(self, game_uuid):
        super(GameRunner, self).__init__()
        self.game_uuid = game_uuid
        self.game_model = GameInstanceModel.objects.get(uuid=game_uuid)
        self.game_object = GameInstance(self.game_model)

    def do_turn(self, n=1):
        """
        This will be the main method for getting turn
        information. You should pass in an n which is how
        many turns you want. This class will tell its game_object
        to compute the turns, then return the deltas as a Turn object.
        The turn objects will be saved in the database.

        The GameInstance and GameActor models will only be written
        through to the database when
        """
        self.game_model.current_turn_number += n
        self.game_model.save()
        return self.game_model.current_turn_number

    def stop(self):
        cache.delete(str(self.game_uuid))
        # Need serializers for gameInstance-GameInstanceModel
        # and for Actor to ActorModel.
        super().stop()
