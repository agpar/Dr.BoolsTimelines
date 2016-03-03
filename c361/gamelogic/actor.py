import bisect
import uuid

from cell import WorldInhabitant
from scripting_engine.script_parser import AiScriptParser


class Actor(WorldInhabitant):
    """The animated inhabitants of a GameInstance

    Note, the Actor should NEVER modify ANY objects other than
    themselves. All interactions with the world and other actors
    MUST be passed through the GameInstance in order to maintain
    integrity and logic of the world.
    """

    def __init__(self, x=-1, y=-1, name="Anonymous", script=""):
        self.uuid = uuid.uuid4()
        self.name = name
        self._coords = (x, y)
        self.health = 100
        self.hunger = 100
        self.sleep = 100
        self.info = {}
        self.gameInstance = None
        self.is_sleeping = False
        parser = AiScriptParser()
        self.behaviour = parser.parse(script)


    def __repr__(self):
        temp = "Actor({}, {}, '{}')"
        return temp.format(self.x, self.y, self.name)

    def do_turn(self):
        self._turn_stat_change()
        action = self.behaviour.next_action()
        action = _action_table()[action]
        return action()

    def _turn_stat_change(self):
        self.hunger -= 5
        if self.is_sleeping:
            self.sleep = self.sleep + 7
            if self.sleep >= 100:
                self.is_sleeping = False
                self.sleep = 100
        else:
            self.sleep -= 5

# Actions
    def _action_table():
        return {
            "eat": self.eat
        }

    def eat():
        return {
            "type": "worldDelta",
            "coords": {'x': self._coords[0], 'y': self._coords[1]},
            "varTarget": "plant",
            "to": None
        }
#
