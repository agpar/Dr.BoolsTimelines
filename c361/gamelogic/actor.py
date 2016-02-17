import bisect
import uuid

from cell import WorldInhabitant

b_str = "if hunger < 50 then find food"


class Behaviour:
    """Parse and compile functions based on scripting API."""

    def __init__(self, b_str=""):
        self.b_str = b_str
        self.conditions = []
        self.actions = []
        self.weight = 0
        self.calc = None

    def __lt__(self, other):
        if self.weight > other.weight:
            return True
        return False

    def __repr__(self):
        temp = "Behaviour('{}')"
        return temp.format(self.b_str)

    def _parse_bstring(self, b_str):
        """Return a function which accepts an Actor argument
        and calculates the numeric weight for that behaviour"""
        def fn(act):
            return b_str
        return fn

    def _get_bval(self, act):
        if not self.calc:
            self.calc = self._parse_bstring(self.b_str)
        self.weight = self.calc(act)
        return self.weight


class Actor(WorldInhabitant):
    """The animated inhabitants of a GameInstance

    Note, the Actor should NEVER modify ANY objects other than
    themselves. All interactions with the world and other actors
    MUST be passed through the GameInstance in order to maintain
    integrity and logic of the world.
    """

    def __init__(self, x=-1, y=-1, name="Anonymous"):
        self.uuid = uuid.uuid4()
        self.name = name
        self._coords = (x, y)
        self.health = 100
        self.hunger = 100
        self.sleep = 100
        self.behaviours = []
        self.gameInstance = None
        self.is_sleeping = False

    def __repr__(self):
        temp = "Actor({}, {}, '{}')"
        return temp.format(self.x, self.y, self.name)

    def do_turn(self):
        self._turn_stat_change()
        return self._choose_behaviour()

    def add_behaviour(self, b_str):
        b = Behaviour(b_str)
        self.behaviours.append(b)

    def _turn_stat_change(self):
        self.hunger -= 5
        if self.is_sleeping:
            self.sleep = self.sleep + 7
            if self.sleep >= 100:
                self.is_sleeping = False
                self.sleep = 100
        else:
            self.sleep -= 5

    def _choose_behaviour(self):
        """Iterate through behaviours, calculating weights. Return
        behaviour with highest weight."""
        results = []
        for b in self.behaviours:
            b._get_bval(self)
            bisect.insort(results, b)
        return results

