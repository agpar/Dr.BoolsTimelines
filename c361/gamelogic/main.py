from actor import Actor
from game_instance import GameInstance
import IPython

a = Actor(name="Alex")
g = GameInstance()
g.init_empty_world()
IPython.embed()