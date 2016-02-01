
class WorldInhabitant:
    coords = (-1, -1)
    wrap = 50

    @property
    def x(self):
        return self.coords[0]

    @property
    def y(self):
        return self.coords[1]

    def wrapper(self, coord):
        x,y = coord
        return x % self.wrap, y % self.wrap

    def north(self, n=1):
        y = self.coords[1] + n
        return self.wrapper((self.x, y))

    def south(self, n=1):
        y = self.coords[1] - n
        return self.wrapper((self.x, y))

    def east(self, n=1):
        x = self.coords[0] - n
        return self.wrapper((x, self.y))

    def west(self, n=1):
        x = self.coords[0] + n
        return self.wrapper((x, self.y))


class Cell(WorldInhabitant):
    def __init__(self, x, y, ctype, elevation):
        if ctype not in [0, 1, 2]:
            raise ValueError("ctype does not exist.")
        self.ctype = ctype
        self.coords = (x,y)
        self.elevation = elevation

    def __repr__(self):
        temp = "Cell({}, {}, {}, {})"
        return temp.format(self.x, self.y, self.ctype, self.elevation)
