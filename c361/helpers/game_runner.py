""" Pykka actor implementation for running a game continuously and allowing
    users to make requests without having to swamp database for responses.

"""
import pykka
import ujson as json

from django.core.cache import cache
from c361.models.game_instance import GameInstanceModel
from c361.models.game_actor import GameActorModel
from c361.models.turn import TurnModel
from c361.gamelogic.game_instance import GameInstance
from c361.gamelogic.actor import Actor


class GameRunner(pykka.ThreadingActor):
    """Runs a GameInstance in a Pykka actor"""

    def __init__(self, game_uuid):
        super(GameRunner, self).__init__()
        self.game_uuid = game_uuid
        self.game_model = GameInstanceModel.objects.get(uuid=game_uuid)
        self.game_object = GameInstance(self.game_model)
        self.turns_done = 0
        self.last_dump = 0
        self.is_paused = True
        self.pause_turn = self.game_model.current_turn
        self.is_modified = False
        if not self.game_model.seed:
            not_cells = self.game_object.to_dict()
            del not_cells['cells']
            self.game_model.seed = json.dumps(not_cells)
            self.game_model.cells = ""
            self.game_model.save()

    def do_turn(self, up_to=0):
        """
        This will be the main method for getting turn information.
        You should pass in the turn number you wish to get up to.
        This class will tell its game_object to compute the turns, then save deltas as TurnModels.
        """
        if self.is_paused and up_to > self.game_model.current_turn:
            return {"error": "Game must be un-paused to request new turns.",
                    "latest_turn": self.pause_turn}

        results = self.game_object.do_turn(up_to)
        for turn in results:
            temp = TurnModel(game=self.game_model, number=turn['number'], delta_dump=turn['deltas'], diff=turn['diff'])
            temp.save()
            self.turns_done += 1

        self.game_model.current_turn = up_to
        self.game_model.save()

        if self.turns_done - self.last_dump > 10:
            self.dump_to_db()

        return self.game_model.current_turn

    def pause(self, on_turn):
        """Pause the game, allowing editing."""
        if self.is_paused:
            return {"error": "Game is already paused at turn {}.".format(self.pause_turn),
                    "latest_turn": self.pause_turn}

        self.is_paused = True
        self.is_modified = False
        self.pause_turn = on_turn
        return {"result": "Game was paused."}

    def resume(self):
        """Resume the game, disallowing editing."""
        if self.is_modified:
            self.rewind_to(self.pause_turn)

        self.is_paused = False
        return {"result": "Game was resumed."}

    def reset_game(self):
        """Development function for restarting a running game."""
        self.game_model.current_turn = 0
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
        return {"result": "Game was reset."}

    def full_dump(self):
        """Return full dump of running game with seed."""
        return self.game_object.to_dict()

    def light_dump(self):
        """Return dump of running game without seed."""
        return self.game_object.to_dict(withseed=False)

    def dump_to_db(self, withseed=False):
        """Dump all information about actors and games to the database."""
        game_dump = self.game_object.to_dict(withseed=withseed)
        cells = game_dump['cells']
        if withseed:
            self.game_model.seed = json.dumps(game_dump)
        self.game_model.cells = json.dumps(cells)
        self.game_model.current_turn = self.game_object.current_turn
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
        print("Finished dumping.")

    def stop(self):
        """Stops and dumps all new information to the database."""
        cache.delete(str(self.game_uuid))
        self.dump_to_db(withseed=True)
        super().stop()

    def rewind_to(self, turn_number):
        """Rewinds running game to a given turn.

        Deletes future turns and does a DB dump.
        """
        turns = self.game_model.turns.filter(number__gte=turn_number)
        for turn in reversed(turns):
            self.game_object.apply_deltas(reversed(turn.delta_dump), reverse=True)

        self.game_object.set_turn(turn_number)
        self.game_model.current_turn = turn_number
        turns.delete()
        self.dump_to_db(withseed=True)

        return {"result": "Rewound to turn {}.".format(turn_number)}

    def add_actor(self, actor_model):
        """Adds an actor to a running game.

        DOES NOT handle copying and saving in DB.
        """
        # Return error if not paused.
        if not self.is_paused:
            return {"error": "Running game must be paused to modify."}

        # Find the latest turn.
        last_turn = self.get_last_turn()

        self.game_object.add_actor(Actor(model=actor_model))
        act = self.game_object.get_actor(str(actor_model.uuid))
        d = {
            "type": "worldDelta",
            "coords": {'x': act.x, 'y': act.y},
            "actorID": act.uuid,
            "varTarget": "spawn",
            "from": None,
            "to": None
        }

        turn_deltas = last_turn.delta_dump if last_turn.delta_dump else []
        turn_deltas.append(d)
        last_turn.delta_dump = turn_deltas
        last_turn.save()
        self.is_modified = True
        return {"result": "Added actor to paused game at turn {}".format(self.pause_turn)}

    def edit_world(self, diff_list):
        """For patching in edits to the world while the game is paused and running.

        :param diff_list: A list of dicts containing diffs in the world.
        """
        # Return error if not paused.
        if not self.is_paused:
            return {"error": "Running game must be paused to modify."}

        self.is_modified = True
        for diff in diff_list:
            self.game_object.world.patch_dicts(diff['pre'], diff['post'])

    def remove_actor(self, actor_model):
        if not self.is_paused:
            return {"error": "Running game must be paused to modify."}
        self.game_object.remove_actor(str(actor_model.uuid))

    def get_last_turn(self):
        """Find the latest turn in the database."""
        if self.is_paused:
            if self.pause_turn != 0:
                lastTurn = self.game_model.turns.get(number=self.pause_turn)
            else:
                lastTurn = TurnModel(game=self.game_model, number=0)
        else:
            lastTurn = self.game_model.turns.last()
        return lastTurn


