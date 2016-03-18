import math
import json
from random import random as rand
from collections import defaultdict

try:
    from .globals import *
except SystemError:
    from globals import *


class WorldState(CoordParseMixin):
    SEED_SIZE = 600
    STANDARD_HEIGHT = 15

    def __init__(self, size=(1000,1000), json_dump=None, chunk_size=6, water_threshold=0.2, rock_threshold=0.175):
        if json_dump is not None:
            json_in = json.loads(json_dump)
            self._size = (json_in["width"], json_in["length"])
            self._chunk_size = json_in["chunkSize"]
            self._water_threshold = json_in["waterThreshold"]
            self._rock_threshold = json_in["rockThreshold"]
            self._cells = [Cell(json_dump=cell_json) for cell_json in json_in["cells"]]
            self._inhabitants = defaultdict(list)
            if json_in.get("seed") is not None:
                self._seed = json_in["seed"]
            else:
                raise Exception("No seed present in JSON dump of world state.")
        else:
            self._size = size
            self._chunk_size = chunk_size
            self._water_threshold = water_threshold
            self._rock_threshold = rock_threshold
            self._cells = {}
            self._seed = [[rand() for j in range(self.SEED_SIZE)] for i in range(self.SEED_SIZE)]
            self._inhabitants = defaultdict(list)

    def __getitem__(self, key):
        return self.PartialTerrainGen(self, key)

    def __setitem__(self, key, item):
        return self.PartialTerrainGen(self, key)

    def __repr__(self):
        return self.toJson(False)


    def toJson(self, withseed=True):
        json_out  = "{'standardHeight': %d," % self.STANDARD_HEIGHT
        json_out += " 'width': %d," % self._size[0]
        json_out += " 'length': %d," % self._size[1]
        json_out += " 'chunkSize': %d," % self._chunk_size
        json_out += " 'waterThreshold': %f," % self._water_threshold
        json_out += " 'rockThreshold': %f," % self._rock_threshold
        json_out += " 'cells': { "

        cells_json = []

        for row in self._cells:
             for c in cells[row]:
                 fmt = (self._cells[row][c].x,
                        self._cells[row][c].y,
                        self._cells[row][c].toJson())

                 cells_json.append("'%d %d': %s" % fmt)

        cell_json = ""

        if len(self._cells) > 1:
            for c in cells_json[:-1]:
                cell_json += c + ", "

        if len(self._cells) > 0:
            cell_json += cells_json[-1]

        cell_json += "},"

        json_out += cell_json

        if withseed:
            json_out += " 'seedSize': %d," % self.SEED_SIZE
            json_out += " 'seed': " + str(self._seed)
        else:
            json_out += " 'seedSize': %d" % self.SEED_SIZE

        json_out += "}"

        return json_out

    def _terrainGen(self, x, y):
        height, slope = self._computeCell(x,y)
        cellheight = height*self.STANDARD_HEIGHT + 1.0

        if height <= self._water_threshold:
            return Cell(x, y, 3, cellheight)
        if slope > self._rock_threshold:
            return Cell(x, y, 2, cellheight)

        return Cell(x, y, 1, cellheight)

    def _cosineInterp(self, v0, v1, t):
        phase = (1-math.cos(t*math.pi))/2.0
        dphase = math.sin(t*math.pi)/2

        return (v0*(1-phase) + v1*phase, -v0*dphase + v1*dphase)

    def _computeCell(self, x, y):
        cell_x = math.floor(x + self._size[0]/2.0)
        cell_y = math.floor(y + self._size[1]/2.0)

        if cell_x < 0:
            return None
        if cell_y < 0:
            return None
        if cell_x >= self._size[0]:
            return None
        if cell_y >= self._size[1]:
            return None

        x0 = int(cell_x/self._chunk_size) % self.SEED_SIZE
        x1 = (x0 + 1) % self.SEED_SIZE
        dx = cell_x/self._chunk_size - x0

        y0 = int(cell_y/self._chunk_size) % self.SEED_SIZE
        y1 = (y0 + 1) % self.SEED_SIZE
        dy = cell_y/self._chunk_size - y0

        f0 = self._cosineInterp(self._seed[y0][x0], self._seed[y0][x1], dx)
        f1 = self._cosineInterp(self._seed[y1][x0], self._seed[y1][x1], dx)

        fout = self._cosineInterp(f0[0], f1[0], dy)
        x_slope , _ = self._cosineInterp(f0[1], f1[1], dy)

        gradient = math.sqrt(x_slope**2 + fout[1]**2)

        return (fout[0], gradient)

    def get_inhabitants(self, xy):
        """Get all the inhabitants at a location.

        :param xy: A coordinate tuple.
        :return: A list of inhabitants at (x,y) (not including Cell)
        """
        x, y = self.coord_parse(xy)
        return self._inhabitants[x, y]

    def add_inhabitant(self, worldinhabitant):
        """Remove a WI from the inhabitants using their current coord."""
        x, y = self.coord_parse(worldinhabitant)
        self._inhabitants[x, y].append(worldinhabitant)

    def remove_inhabitant(self, worldinhabitant):
        """Add a WI to the inhabitants using their current coord."""
        x, y = self.coord_parse(worldinhabitant)
        self._inhabitants[x, y].remove(worldinhabitant)

    class PartialTerrainGen:
        """A class solely for storing half of a request to get or set a cell

        Allows for proper getting and setting of world locations.

        w[0][0] instead of w[0,0]

        When you call w[x][y], the w[x] returns a PartialTerrainGen with
        it's row set to x. After this is evaluated, the rest of the statement
        (which you should imagine as PartialTerrainGen()[y]) returns it's yth
        item, which is the yth item of the xth row of the world.

        Also places cells into lists and includes inhabitants at the location.
        """
        def __init__(self, world, row):
            self.world = world
            self.row = row

        def __getitem__(self, key):
            col = self.world._cells.get(self.row)
            if col and key in col:
                val = [col[key]]
            val = [self.world._terrainGen(self.row, key)]
            val.extend(self.world._inhabitants[self.row, key])
            return val

        def __setitem__(self, key, value):
            col = self.world._cells.get(self.row)
            if not col:
                self.world._cells[self.row] = {}
            self.world._cells[self.row][key] = value

        def __iter__(self):
            return (self[x] for x in range(int(self.world._size[1]/2)))


