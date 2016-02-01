import bisect
import uuid
import IPython
from cell import Cell, WorldInhabitant

b_str = "if hunger < 50 then find food"


class GameInstance:
    """Container for world and actors in world.

    GameInstance is responsible for tracking the world and the actors
    within it. It has functions to simplify interacting with the world
    and actors in it. It also provides functions that actors can call
    for information about the world, in order to aid in their decision
    making.
    """
    def __init__(self):
        self.actors = {}
        self.world = []

    def __getitem__(self, item):
        return self.world[item]

    def init_empty_world(self):
        """Create an empty 50x50 cell grid for testing."""
        for i in range(250):
            row = [Cell(i, j, 1, 0) for j in range(250)]
            self.world.append(row)

    def add_actor(self, a, x=0, y=0):
        """Add an actor to the GameInstance.

        :param a: Actor object to be added.
        :param x: x coord to add actor to.
        :param y: y coord to add actor to.
        """
        atest = self.actors.get(a.uuid)
        if atest:
            tmp = "{} already in GameInstance."
            raise ValueError(tmp.format(atest))

        atest = self.get_actor(x, y)
        if atest:
            tmp = "{0} already at coord. Only 1 Actor on a cell at a time."
            raise ValueError(tmp.format(atest))

        self.actors[a.uuid] = a
        a.coords = (x, y)
        a.gameInstance = self
        self.world[x, y].append(a)

    def remove_actor(self, x, y=None):
        """Remove an actor from the GameInstance. Fail silently.

        :param x: x coord OR an Actor object.
        :param y: y coord
        """
        if isinstance(x, Actor):
            actr = x
        elif isinstance(x, int) and isinstance(y,int):
            actr = self.get_actor(x,y)
            if not actr:
                return
        else:
            return

        del self.actors[actr.uuid]
        self.world[a.coords].remove(a)
        a.coords = (-1, -1)
        return

    def get_actor(self, x, y=None):
        """Get actor by coords or UUID.

        :param x: x coord OR UUID of actor
        :param y: y coord
        :return: Actor that fits description, or None
        """
        if isinstance(x, uuid.UUID):
            return self.actors.get(x)

        content = self[x, y]
        if len(content) > 1:
            for z in content:
                if isinstance(z, Actor):
                    return z
        return None

    def look_around(self, x, y):
        """Return 3x3 grid of world content centered on x,y"""


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
        self.coords = (x,y)
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

g = GameInstance()
g.init_empty_world()
IPython.embed()