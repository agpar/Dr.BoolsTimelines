from c361.gamelogic.world_state import WorldState
from c361.gamelogic.globals import *
from random import random
from math import floor

def random_diffs():
    a = WorldState()
    b = WorldState(json_dump=a.to_dict().copy())
    diffs = []
    for i in range(400):
        typ = random()
        x,y = floor(random()*100), floor(random()*100)
        if typ > 0.66:
            a[x][y] = Cell(ctype="ROCK", elevation=typ*10)
        elif typ > 0.33:
            a[x][y] = Cell(ctype="GRASS", elevation=typ*10)
        else:
            a[x][y] = Cell(ctype="WATER", elevation=typ*10)

        diffs.append(a.apply_updates())

    a.unpatch(diffs[::-1])
    assert a.to_dict(False) == b.to_dict(False)
    print(a.to_dict(False) == b.to_dict(False))
