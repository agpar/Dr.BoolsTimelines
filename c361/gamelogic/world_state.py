from random import random as rand
import math
from globals import *

class WorldState:
    SEED_SIZE = 600
    STANDARD_HEIGHT = 15


    def __init__(self, size=(1000,1000), chunk_size=6, water_threshold=0.2, rock_threshold=0.175):
        self._size = size
        self._chunk_size = chunk_size
        self._water_threshold = water_threshold
        self._rock_threshold = rock_threshold
        self._cells = {}
        self._seed = [[rand() for j in range(self.SEED_SIZE)] for i in range(self.SEED_SIZE)]

    def __getitem__(self, coords):
        if coords[0] in self._cells:
            if coords[1] in self.cells[coords[0]]:
                return self.cells[coords[0]][coords[1]]

        return self._terrainGen(coords[0], coords[1])

    def __setitem__(self, coords, cell):
        if coords[0] not in  self._cells:
            self._cells[coords[0]] = {}

        self._cells[coords[0]][coords[1]] = cell

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
