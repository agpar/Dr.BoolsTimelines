from actor import Actor
from game_instance import GameInstance
import IPython

"""Use this file to set up tests and toy situations.
By running on command line, it will execute these lines then
open an IPython shell for you to interact with."""

a = Actor(name="Alex")
g = GameInstance()
g.init_empty_world()
IPython.embed()