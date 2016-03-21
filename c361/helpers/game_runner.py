import pykka
import ujson as json
from c361.models.game_instance import GameInstanceModel
from c361.models.game_actor import GameActorModel

from c361.models.turn import TurnModel

from c361.gamelogic.game_instance import GameInstance
from django.core.cache import cache

# TODO Write serializer for dumping GameInstance and GameActor to the database.


class GameRunner(pykka.ThreadingActor):
    """Runs a GameInstance in a Pykka actor"""

    def __init__(self, game_uuid):
        super(GameRunner, self).__init__()
        self.game_uuid = game_uuid
        self.game_model = GameInstanceModel.objects.get(uuid=game_uuid)
        self.game_object = GameInstance(self.game_model)

    def do_turn(self, up_to=0):
        """
        This will be the main method for getting turn information.
        You should pass in the turn number you wish to get up to.
        This class will tell its game_object to compute the turns, then save deltas as TurnModels.
        """
        results = self.game_object.do_turn(up_to)

        for turn in results:
            temp = TurnModel(game=self.game_model, number=turn['number'], delta_dump=turn['deltas'])
            temp.save()
        self.game_model.current_turn_number = up_to
        self.game_model.save()
        return self.game_model.current_turn_number

    def restart_game(self):
        """Development function for restarting a running game."""

    def full_dump(self):
        return self.game_object.to_dict()

    def light_dump(self):
        self.do_turn(self.game_object.current_turn)
        return self.game_object.to_dict(withseed=False)

    def stop(self):
        cache.delete(str(self.game_uuid))
        full_dump = self.game_object.to_dict()
        seed = json.dumps(full_dump)

        self.game_model.world = seed
        self.game_model.current_turn_number = self.game_object.current_turn
        self.game_model.save()

        # Figure out which attributes and actor model has.
        actr = GameActorModel.objects.first()
        backend_actor_keys = {k for k,v in actr.__dict__ .items()}

        # Put in keys which have the same name on backend.
        for k, a in self.game_object.actors.items():
            adict = a.to_dict()
            actor = GameActorModel.objects.get(uuid=k)
            for key, value in adict.items():
                if key in backend_actor_keys:
                    setattr(actor, key, value)

            actor.save()

        super().stop()
