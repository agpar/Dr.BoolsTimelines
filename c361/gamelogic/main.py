from actor import Actor
from game_instance import GameInstance
import IPython

"""Use this file to set up tests and toy situations.
By running on command line, it will execute these lines then
open an IPython shell for you to interact with."""

testscript = """
    if myhunger == 100 and false
    then
        do
            sleep;
        done
    endif

    if 4 > 5
    then
        do
            walknorth;
        done
    endif

    """

a = Actor(1, 1, "Alex", testscript)
g = GameInstance()
g.init_empty_world()
IPython.embed()