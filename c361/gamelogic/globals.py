import json
from functools import partial
from scripting_engine.script_parser import AiScriptParser

SMELL_CODES = {'ACTOR': 1, 'PLANT': 2, 'WATER': 3,
               1: 'ACTOR', 2: 'PLANT', 3: 'WATER'}
CELL_TYPES = {'GRASS': 1, 'ROCK': 2, 'WATER': 3,
              1: 'GRASS', 2: 'ROCK', 3: 'WATER'}

ATTRIBUTES = {'FOOD', 'DEADLY', 'ACTOR', 'WATER', 'PLANT', 'GRASS', 'ROCK'}

DIRECTIONS = {"NORTH", "SOUTH", "EAST", "WEST"}

PARSER = AiScriptParser()


class CoordParseMixin:
    """A bunch of methods for reasoning about coordinates."""

    def coord_parse(self, x):
        """Handle coord parsing for ints and WorldInhabitants.

        If x is a WorldInhabitant, return it's coords. Otherwise,
        ensure x is a legal coord before returning.

        :param x: Integer tuple or WorldInhabitant
        :return: x,y integer tuple of coord
        """
        if isinstance(x, WorldInhabitant):
            x, y = self.coord_parse(x._coords)
            return x, y
        elif isinstance(x, tuple):
            y, z = x
            if isinstance(y, int) and isinstance(z, int):
                return y, z
        tmp = "Can't parse coords from ({}, {})."
        raise ValueError(tmp.format(x))

    def direction_fn(self, from_coord, to_coord):
        """Calculate directions that lead from from_coord to to_coord.

        This won't check anything about the world... It just gives
        back a list of directions that will get you closer to the target.

        :return list of directions that lead from from_coord to to_coord.
        """
        x1, y1 = self.coord_parse(from_coord)
        x2, y2 = self.coord_parse(to_coord)
        dirs = []

        if x2 > x1:
            dirs.append('EAST')
        if x2 < x1:
            dirs.append('WEST')
        if y2 > y1:
            dirs.append('NORTH')
        if y2 < y1:
            dirs.append('SOUTH')

        return dirs

    def distance_fn(self, from_coord, to_coord):
        """Calculate distance between tow coords."""

        x1, y1 = self.coord_parse(from_coord)
        x2, y2 = self.coord_parse(to_coord)

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
        scan_x = range(x-radius, x+radius+1)
        scan_y = range(y-radius, y+radius+1)
        area_tuples = []

        for x1 in scan_x:
            for y1 in scan_y:
                if x1 == x and y1 == y:
                    continue
                area_tuples.append((x1, y1))

        if dist_sort:
            dist_key = partial(self.distance_fn, to_coord=(x, y))
            area_tuples = sorted(area_tuples, key=dist_key)

        return area_tuples


class WorldInhabitant(CoordParseMixin):
    _coords = (-1, -1)
    wrap = 50
    is_food = False
    is_deadly = False
    is_actor = False
    is_water = False
    is_grass = False
    is_plant = False
    is_rock = False
    smell_code = None

    @property
    def x(self):
        return self._coords[0]

    @property
    def y(self):
        return self._coords[1]

    def wrapper(self, coord):
        x, y = coord
        return x % self.wrap, y % self.wrap

    def north(self, n=1):
        y = self._coords[1] + n
        return self.wrapper((self.x, y))

    def south(self, n=1):
        y = self._coords[1] - n
        return self.wrapper((self.x, y))

    def east(self, n=1):
        x = self._coords[0] + n
        return self.wrapper((x, self.y))

    def west(self, n=1):
        x = self._coords[0] - n
        return self.wrapper((x, self.y))

    def distance_to(self, other):
        """Calculate distance between self and other."""

        return self.distance(self, other)

    def direction_to(self, other):
        """Calculate best direction to go from self to other.

        This won't check anything about the world... It just gives
        back a list of directions that will get you closer to the target.

        :return list of directions that lead to other. Empty list if you are
                standing on other.
        """
        return self.direction_fn(self, other)


class Cell(WorldInhabitant):

    def __init__(self, x=0, y=0, ctype=1, elevation=1, json_dump=None):
        if json_dump is not None:
            json_in = json.loads(json_dump)
            self.ctype = CELL_TYPES[json_in["ctype"]]
            self._coords = (json_in["coords"]["x"], json_in["coords"]["y"])
            self.elevation = json_in["elevation"]
        else:
            self.ctype = ctype if ctype in [1, 2, 3] else CELL_TYPES[ctype]
            self._coords = (x, y)
            self.elevation = elevation

    def __repr__(self):
        temp = "Cell({}, {}, {}, {})"
        return temp.format(self.x, self.y, CELL_TYPES[self.ctype], self.elevation)

    @property
    def is_water(self):
        if self.ctype == CELL_TYPES['WATER']:
            return True
        return False

    @property
    def is_grass(self):
        if self.ctype == CELL_TYPES['GRASS']:
            return True
        return False

    @property
    def is_plant(self):
        if self.ctype == CELL_TYPES['PLANT']:
            return True
        return False

    @property
    def is_rock(self):
        if self.ctype == CELL_TYPES['ROCK']:
            return True
        return False

    def toJson(self):
        serialized = {
            "type": CELL_TYPES[self.ctype],
            "coords": {"x": self.x, "y": self.y},
            "elevation": self.elevation
        }

        return json.dumps(serialized)
