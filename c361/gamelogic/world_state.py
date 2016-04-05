import math
import json
from random import random as rand
from collections import defaultdict
from functools import reduce

try:
    from .globals import *
except SystemError:
    from globals import *


class WorldState(CoordParseMixin):
    SEED_SIZE = 300
    STANDARD_HEIGHT = 15

    def __init__(self, size=(1000,1000), json_dump=None, current_turn=0, chunk_size=6, water_threshold=0.2, rock_threshold=0.175):
        if json_dump is not None:
            self.current_turn = json_dump["current_turn"]
            self._size = (json_dump["width"], json_dump["length"])
            self._chunk_size = json_dump["chunkSize"]
            self._water_threshold = json_dump["waterThreshold"]
            self._rock_threshold = json_dump["rockThreshold"]

            cell_data = [
                {
                    "coords": (cell_json['coords']['x'], cell_json['coords']['y']),
                    "cell": Cell(json_dump=cell_json),
                    "contents": cell_json["contents"]
                }

                for k, cell_json in json_dump["cells"].items()
            ]

            self._inhabitants = defaultdict(list)
            self._cells = defaultdict(dict)

            for pair in cell_data:
                self._cells[pair['coords'][0]][pair['coords'][1]] = pair["cell"]

                cts = pair["contents"]
                for cont in pair["contents"]:
                    data = cont

                    inhab = None
                    if data["type"] == "MUSH":
                        inhab = Plant(from_dict=data)

                    #Add more types here

                    if inhab:
                        self._inhabitants[(pair['coords'][0], pair['coords'][0])].append(inhab)

            if json_dump.get("seed") is not None:
                self._seed = json_dump["seed"]
            else:
                raise Exception("No seed present in JSON dump of world state.")
        else:
            self.current_turn = current_turn
            self._size = size
            self._chunk_size = chunk_size
            self._water_threshold = water_threshold
            self._rock_threshold = rock_threshold
            self._cells = {}
            self._seed = [[rand() for j in range(self.SEED_SIZE)] for i in range(self.SEED_SIZE)]
            self._inhabitants = defaultdict(list)

        self._prev_state = self.to_dict(False)

    def __getitem__(self, key):
        return self.PartialTerrainGen(self, key)

    def __setitem__(self, key, item):
        return self.PartialTerrainGen(self, key)

    def __repr__(self):
        return json.dumps(self.to_dict(False))

    def apply_updates(self):
        self.current_turn += 1
        diff = self.diff(self._prev_state)
        self._prev_state = self.to_dict(False)
        return diff

    def to_dict(self, withseed=True):
        serialized = {
            "current_turn": self.current_turn,
            "standardHeight": self.STANDARD_HEIGHT,
            "width": self._size[0],
            "length": self._size[1],
            "chunkSize": self._chunk_size,
            "waterThreshold": self._water_threshold,
            "rockThreshold": self._rock_threshold,
            "seedsize": self.SEED_SIZE
        }

        if withseed:
            serialized["seed"] = self._seed

        #Force create cells with defined contents
        for inh in self._inhabitants:
            if inh[0] not in self._cells:
                self._cells[inh[0]] = {}

            if inh[1] not in self._cells[inh[0]]:
                self._cells[inh[0]][inh[1]] = self.__getitem__(inh[0])[inh[1]][0]


        #Remove useless cells if they are equal to default terrain cell
        delQueue = []
        for row in self._cells:
             for c in self._cells[row]:
                fmt = (self._cells[row][c].x,
                        self._cells[row][c].y)

                tgen = self._terrainGen(row,c)

                if not self._inhabitants[row, c] and str(self._cells[row][c]) == str(tgen):
                    delQueue.append((row, c))

                    if not self._cells[row]:
                        delQueue.append((row,None))

        for d in delQueue:
            del self._cells[d[0]][d[1]]
            if d[1] is None:
                del self._cells[d[0]]


        cell_dict = {}
        for row in self._cells:
             for c in self._cells[row]:
                fmt = (self._cells[row][c].x,
                        self._cells[row][c].y)

                cell_dict["%d %d" % fmt] = self._cells[row][c].to_dict()
                cell_dict["%d %d" % fmt]["contents"] = [x.to_dict() for x in self._inhabitants[fmt]]

        serialized["cells"] = cell_dict
        return serialized

    def _terrainGen(self, x, y):
        height, slope = self._computeCell(x,y)
        cellheight = height*self.STANDARD_HEIGHT + 1.0

        if height <= self._water_threshold:
            return Cell(x, y, 'WATER', cellheight)
        if slope > self._rock_threshold:
            return Cell(x, y, 'ROCK', cellheight)

        return Cell(x, y, 'GRASS', cellheight)

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

    def get_cell(self, xy):
        x,y = xy
        lst = self[x][y]
        for x in lst:
            if isinstance(x, Cell):
                return x

    def patch_dicts(self, f_diff, t_diff, reverse=False, cell_dict=False):
        patched = f_diff
        for k in t_diff.keys():
            if f_diff.get(k) is None:
                patched[k] = t_diff[k]
            elif isinstance(f_diff[k], dict) and isinstance(t_diff[k], dict):
                patched[k] = self.patch_dicts(f_diff[k], t_diff[k], reverse=reverse, cell_dict=True)
            else:
                patched[k] = t_diff[k]

        if reverse and cell_dict:
            del_queue = []
            for k in f_diff.keys():
                if t_diff.get(k) is None:
                    del_queue.append(k)

            for k in del_queue:
                del patched[k]

        return patched

    def unpatch_dicts(self, f_diff, t_diff):
        return self.patch_dicts(f_diff, t_diff, reverse=True)

    def patch(self, diffs, reverse=False):
        patch_diffs = []
        if reverse:
            patch_diffs = [diff["pre"] for diff in diffs]
        else:
            patch_diffs = [diff["post"] for diff in diffs]

        i = 0
        for diff in patch_diffs:
            i += diff["current_turn"]

        if reverse:
            if i != len(diffs)*(len(diffs) - 1)/2 - patch_diffs[-1]["current_turn"]:
                raise Exception("Diff stream contains holes.")
        else:
            if i != len(diffs)*(len(diffs) + 1)/2 - patch_diffs[0]["current_turn"] + 1:
                raise Exception("Diff stream contains holes.")


        if reverse:
            patched = reduce(self.unpatch_dicts, patch_diffs, self.to_dict(False))
        else:
            patched = reduce(self.patch_dicts, patch_diffs, self.to_dict(False))

        patched["seed"] = self._seed
        self.__init__(json_dump=patched)
        return patched

    def unpatch(self, diffs):
        patched = self.patch(diffs, reverse=True)
        return patched

    def _diff_dict(self, f_dict, t_dict):
        pre = {}
        post = {}

        for k in f_dict:
            if t_dict.get(k) is None:
                pre[k] = f_dict[k]
            elif f_dict.get(k) != t_dict.get(k):
                if isinstance(f_dict.get(k), dict) and isinstance(t_dict.get(k), dict):
                    pre[k], post[k] = self._diff_dict(f_dict.get(k), t_dict.get(k))
                else:
                    pre[k], post[k] = f_dict.get(k), t_dict.get(k)

        for k in t_dict:
            if f_dict.get(k) is None:
                post[k] = t_dict[k]

        return pre, post

    def diff(self, other):
        f_dict = other
        t_dict = self.to_dict(False)
        pre, post = self._diff_dict(f_dict, t_dict)

        return {
            'pre': pre,
            'post': post
        }


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

            val = []
            if col and key in col:
                val = [col[key]]
            else:
                val = [self.world._terrainGen(self.row, key)]

            val.extend(self.world._inhabitants[self.row, key])
            return val

        def __setitem__(self, key, value):
            if isinstance(value, Cell):
                value._coords = (self.row, key)
            col = self.world._cells.get(self.row)
            if not col:
                self.world._cells[self.row] = {}
            self.world._cells[self.row][key] = value

        def __iter__(self):
            return (self[x] for x in range(int(self.world._size[1]/2)))
