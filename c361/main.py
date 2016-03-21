from gamelogic.actor import Actor
from gamelogic.game_instance import GameInstance
import IPython

"""Use this file to set up tests and toy situations.
By running on command line, it will execute these lines then
open an IPython shell for you to interact with."""

testscript = """
if nearest(WATER) == mylocation
then
    do
        walk(NORTH);
    done
endif

if true
then
    do
        walk(direction(nearest(WATER)));
    done
endif
    """

a = Actor(1, 1, "Alex", testscript)
g = GameInstance()
#g.init_empty_world()
g.add_actor(a)
print(a.behaviours.rules[0].condition.eval(a))
IPython.embed()
