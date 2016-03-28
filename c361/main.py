from gamelogic.actor import Actor
from gamelogic.game_instance import GameInstance
import IPython

"""Use this file to set up tests and toy situations.
By running on command line, it will execute these lines then
open an IPython shell for you to interact with."""

testscript = """
if MY_ENERGY < 20
and not SLEEPING
then
    do
        sleep();
    done
endif

if SLEEPING
and MY_ENERGY >= 100
then
    do
        wake();
    done
endif
    """

a = Actor(1, 1, "Alex", testscript)
g = GameInstance()
a.sleep = 10
#g.init_empty_world()
g.add_actor(a)
print(a.behaviours.rules[0].condition.eval(a))
IPython.embed()
