from c361.gamelogic.world_state import WorldState
from c361.gamelogic.globals import *
from random import random
from math import floor
from copy import deepcopy
#from datadiff import diff
def random_diffs(n):
    a = WorldState()
    b = WorldState(json_dump=deepcopy(a.to_dict()))
    c = WorldState(json_dump=deepcopy(a.to_dict()))

    diffs = []
    for i in range(n):
        typ = random()
        x,y = floor(random()*100), floor(random()*100)
        if typ > 0.66:
            a[x][y] = Cell(ctype="ROCK", elevation=typ*10)
        elif typ > 0.33:
            a[x][y] = Cell(ctype="GRASS", elevation=typ*10)
        else:
            a[x][y] = Cell(ctype="WATER", elevation=typ*10)

        diffs.append(a.apply_updates())


    b.patch(diffs)
#    diff(a.to_dict(False), b.to_dict(False))
    assert a.to_dict(False) == b.to_dict(False)
    print("Equal states forward diff? " + str(a.to_dict(False) == b.to_dict(False)))

    a.unpatch(diffs[::-1])
    assert a.to_dict(False) == c.to_dict(False)
    print("Equal states reverse diff? " + str(a.to_dict(False) == c.to_dict(False)))
