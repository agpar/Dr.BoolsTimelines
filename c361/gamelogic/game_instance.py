from actor import Actor
from globals import *

import random
import uuid
from functools import partial
import math


class GameInstance:
    """Container for world and actors in world.

    GameInstance is responsible for tracking the world and the actors
    within it. It has functions to simplify interacting with the world
    and actors in it. It also provides functions that actors can call
    for information about the world, in order to aid in their decision
    making.

    Most functions that have a signature of the form fn(x,y) can
    accept a number of different arguments. The goal is to have as open
    an api as possible, given
    """
    def __init__(self, model=None):
        if not model:
            # For testing.
            self.actors = {}
            self.world = []
            self.world_size = 250
        else:
            self.uuid = str(model.uuid)
            self.current_turn = model.current_turn_number
            self.actors = {}
            self.world = []
            self.world_size = 250

            self.init_empty_world()
            for a in model.actors.all():
                self.add_actor(Actor(a))

    def __getitem__(self, item):
        x = self.world[item]
        return x

    def init_empty_world(self):
        """Create an empty 50x50 cell grid for testing."""
        for i in range(self.world_size):
            row = [[Cell(i, j, 1, 0)] for j in range(self.world_size)]
            self.world.append(row)

    def coord_parse(self, x):
        """Handle coord parsing for ints and WorldInhabitants.

        If x is a WorldInhabitant, return it's coords. Otherwise,
        ensure x is a legal coord before returning.

        :param x: Integer tuple or WorldInhabitant with coords
        :return: x,y integer tuple of coord
        """
        if isinstance(x, WorldInhabitant):
            x, y = self.coord_parse(*x._coords)
            return x, y
        elif isinstance(x, tuple):
            y, z = x
            if isinstance(y, int) and isinstance(z, int):
                return y, z
        tmp = "Can't parse coords from ({}, {})."
        raise ValueError(tmp.format(x))

    def distance(self, xy_or_WI1, xy_or_WI2):
        """Calculate distance between 2 (x,y) coords or WorldInhabitants
        :return: Distance without possibility for diagonal movement.
        """
        x1, y1 = self.coord_parse(xy_or_WI1)
        x2, y2 = self.coord_parse(xy_or_WI2)

        d = abs(x2-x1) + abs(y2-y1) # No diagonal movement
        return d

    def circle_at(self, xy_or_WI, radius, dist_sort=True):
        """Calculate the points of a circle around xy_or_WI

        :param xy_or_WI: x,y tuple or a WorldInhabitant
        :param radius: Integer for radius of circle.
        :param dist_sort: Key to determine if tuples should be sorted
        by distance from center.
        :return: List of x,y tuples.
        """
        x, y = self.coord_parse(xy_or_WI)
        scan_x = range(x-radius, x+radius)
        scan_y = range(y-radius, y+radius)
        area_tuples = []

        for x in scan_x:
            for y in scan_y:
                area_tuples.append((x,y))

        if dist_sort:
            dist_key = partial(self.distance, xy_or_WI2=(x,y))
            area_tuples = sorted(area_tuples, key=dist_key)

        return area_tuples


    def add_actor(self, a, x=0, y=0):
        """Add an Actor to the GameInstance.

        :param a: Actor object to be added.
        :param x: x coord OR a WorldInhabitant (such as a Cell)
        :param y: y coord
        """
        atest = self.actors.get(a.uuid)
        x, y = self.coord_parse((x, y))
        if atest:
            tmp = "{} already in GameInstance."
            raise ValueError(tmp.format(atest))

        # TEMP CODE FOR INSERTING MANY ACTORS INTO NEW WORLD
        if x==0 and y==0:
            for x, y in zip(range(10), range(10)):
                atest = self.get_actor(x, y)
                if not atest:
                    self.actors[a.uuid] = a
                    a._coords = (x, y)
                    a.gameInstance = self
                    self.world[x][y].append(a)
                    break

        else:
            atest = self.get_actor(x, y)
            if atest:
                tmp = "{0} already at coord. Only 1 Actor on a cell at a time."
                raise ValueError(tmp.format(atest))

            self.actors[a.uuid] = a
            a._coords = (x, y)
            a.gameInstance = self
            self.world[x][y].append(a)

    def remove_actor(self, xy_or_WI):
        """Remove an actor from the GameInstance. Fail silently.

        :param xy_or_WI: x,y coord OR a WorldInhabitant object.
        """
        x, y = self.coord_parse(xy_or_WI)
        actr = self.get_actor(x, y)
        if not actr:
            return

        del self.actors[actr.uuid]
        self.world[x][y].remove(actr)
        actr._coords = (-1, -1)
        return

    def get_actor(self, xy_or_UUID):
        """Get actor by _coords, UUID, or WorldInhabitant.

        :param xy_or_UUID: x,y coord OR UUID of actor
        :return: Actor that fits description, or None
        """
        if isinstance(xy_or_UUID, uuid.UUID):
            return self.actors.get(xy_or_UUID)
        else:
            x, y = self.coord_parse(xy_or_UUID)

        content = self[x][y]
        if len(content) > 1:
            for z in content:
                if isinstance(z, Actor):
                    return z
        return None

    def has_attr(self, world_inhab, attr):
        """Determine if the wold_inhabitant has an attribute.

        :param world_inhab: A WorldInhabitant.
        :param attr: A property defined in globals.ATTRIBUTES
        :return: bool
        """
        if attr == "FOOD":
            return world_inhab.is_food
        if attr == "DEADLY":
            return world_inhab.is_deadly
        else:
            return False


    def find_nearest(self, xy_or_WI, attr):
        """Find and return nearest cells.

        :param xy_or_UUID: x,y tuple OR a WorldInhabitant
        :param attr: A property defined in globals.ATTRIBUTES
        :return: Coordinate tuple of nearest cell with something having that attriubte.
        """

        area = []

        for item in self.world[x][y]:
            pass

    def do_turn(self, up_to=0):
        all_turns = []
        while self.current_turn <= up_to:
            self.current_turn += 1
            this_turn = {'number': self.current_turn, 'deltas': []}
            for uuid, actor in random.shuffle(list(self.actors.items())):
                this_turn['deltas'].append(actor.do_turn())

            all_turns.append(this_turn)

            # TODO Validate the delta before accepting and returning it.
            # TODO Calculate other effects that result from the delta (health changes, deaths, etc)

        return all_turns
