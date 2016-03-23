""" Pykka actor implementation for running a game continuously and allowing
    users to make requests without having to swamp database for responses.

"""

import threading
import pykka
import ujson as json

from django.core.cache import cache
from c361.models.game_instance import GameInstanceModel
from c361.models.game_actor import GameActorModel
from c361.models.turn import TurnModel
from c361.gamelogic.game_instance import GameInstance


class GameRunner(pykka.ThreadingActor):
    """Runs a GameInstance in a Pykka actor"""

    def __init__(self, game_uuid):
        super(GameRunner, self).__init__()
        self.game_uuid = game_uuid
        self.game_model = GameInstanceModel.objects.get(uuid=game_uuid)
        self.game_object = GameInstance(self.game_model)
        self.turns_done = 0
        self.last_dump = 0
        if not self.game_model.seed:
            not_cells = self.game_object.to_dict()
            del not_cells['cells']
            self.game_model.seed = json.dumps(not_cells)
            self.game_model.save()

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
            self.turns_done += 1

        self.game_model.current_turn_number = up_to
        self.game_model.save()

        if self.turns_done - self.last_dump > 10:
            self.dump_to_db()

        return self.game_model.current_turn_number

    def reset_game(self):
        """Development function for restarting a running game."""
        self.game_model.current_turn_number = 0
        self.game_model.cells = json.dumps({})

        # Reset all actors
        for a in self.game_model.actors.all():
            a.reset_to_defaults()
            a.save()

        # Delete all recorded turns.
        for t in self.game_model.turns.all():
            t.delete()

        self.game_model.save()
        self.game_object = GameInstance(self.game_model)

    def full_dump(self):
        return self.game_object.to_dict()

    def light_dump(self):
        self.do_turn(self.game_object.current_turn) # ONLY FOR THE DEMO
        return self.game_object.to_dict(withseed=False)

    def dump_to_db(self, async=True):
        """Dump all information about actors and games to the database."""
        def dump_helper():
            cells = self.game_object.to_dict(withseed=False)['cells']
            self.game_model.cells = json.dumps(cells)
            self.game_model.current_turn_number = self.game_object.current_turn
            self.game_model.save()

            # Figure out which attributes and actor model has.
            actr = GameActorModel.objects.first()
            backend_actor_keys = {k for k,v in actr.__dict__ .items()}

            # Save all the actors.
            for k, a in self.game_object.actors.items():
                adict = a.to_dict()
                actor = GameActorModel.objects.get(uuid=k)
                for key, value in adict.items():
                    if key in backend_actor_keys:
                        setattr(actor, key, value)
                actor.save()

        if async:
            t = threading.Thread(target=dump_helper())
            t.start()
        else:
            dump_helper()

    def stop(self):
        """Stops and dumps all new information to the database."""
        cache.delete(str(self.game_uuid))
        self.dump_to_db()
        super().stop()
