from actor import Actor
from game_instance import GameInstance
import IPython

"""Use this file to set up tests and toy situations.
By running on command line, it will execute these lines then
open an IPython shell for you to interact with."""

testscript = """
    if not 4 > myhunger
    then
        do
            sleep();
        done
    endif
    """

a = Actor(1, 1, "Alex", testscript)
g = GameInstance()
g.init_empty_world()
IPython.embed()
