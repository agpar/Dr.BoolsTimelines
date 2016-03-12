SMELL_CODES = {'ACTOR': 1, 'PLANT': 2, 'WATER': 3,
               1: 'ACTOR', 2: 'PLANT', 3: 'WATER'}
CELL_TYPES = {'GRASS': 1, 'ROCK': 2, 'WATER': 3,
              1: 'GRASS', 2: 'ROCK', 3: 'WATER'}

ATTRIBUTES = {'FOOD', 'DEADLY'}

DIRECTIONS = {"NORTH", "SOUTH", "EAST", "WEST"}


class WorldInhabitant:
    _coords = (-1, -1)
    wrap = 50
    is_food = False
    is_deadly = False
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
        x = self._coords[0] - n
        return self.wrapper((x, self.y))

    def west(self, n=1):
        x = self._coords[0] + n
        return self.wrapper((x, self.y))


class Cell(WorldInhabitant):

    def __init__(self, x, y, ctype, elevation):
        self.ctype = ctype if ctype in [1, 2, 3] else CELL_TYPES[ctype]
        self._coords = (x, y)
        self.elevation = elevation

    def __repr__(self):
        temp = "Cell({}, {}, {}, {})"
        return temp.format(self.x, self.y, CELL_TYPES[self.ctype], self.elevation)