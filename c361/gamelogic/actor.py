import bisect
import uuid

from .cell import WorldInhabitant
from .scripting_engine.script_parser import AiScriptParser


class Actor(WorldInhabitant):
    """The animated inhabitants of a GameInstance

    Note, the Actor should NEVER modify ANY objects other than
    themselves. All interactions with the world and other actors
    MUST be passed through the GameInstance in order to maintain
    integrity and logic of the world.
    """

    def __init__(self, model):
        self.uuid = model.uuid
        self.name = model.title
        self._coords = model.coords
        self.health = model.health
        self.hunger = model.hunger
        self.sleep = model.sleep
        self.info = {}
        self.gameInstance = None
        self.is_sleeping = model.is_sleeping
        self.direction = model.direction
        self.food = model.food
        self.sight_line = []

    def __repr__(self):
        temp = "Actor({}, {}, '{}')"
        return temp.format(self.x, self.y, self.name)

    def do_turn(self):
        self._turn_stat_change()
        action = self.behaviour.next_action()
        action = self._action_table()[action]
        return action()

    def _turn_stat_change(self):
        self.hunger -= 5
        if self.is_sleeping:
            self.sleep = self.sleep + 7
            if self.sleep >= 100:
                self.is_sleeping = False
                self.sleep = 100
        else:
            self.sleep -= 5

    # Actions
    def _action_table(self):
        return {
            "eat": self.eat,
            "walk": self.walk,
            "turn_right": self.turn_right,
            "turn_left": self.turn_left,
            "pickup": self.pickup,
            "harvest": self.harvest,
            "drop": self.drop,
            "see": self.see,
            "smell": self.smell
        }

    def eat(self):
        return {
            "type": "actorDelta",
            "coords": {'x': self.x, 'y': self.y},
            "actorID": self.uuid,
            "varTarget": "food",
            "from": True,
            "to": False
        }

    def walk(self):
        if self.direction == "North":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "_coords",
                "from": self._coords,
                "to": self.north()
            }
        elif self.direction == "East":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "_coords",
                "from": self._coords,
                "to": self.east()
            }
        elif self.direction == "West":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "_coords",
                "from": self._coords,
                "to": self.west()
            }
        elif self.direction == "South":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  #Used instead of coords
                "varTarget": "_coords",
                "from": self._coords,
                "to": self.south()
            }

    def turn_right(self):
        if self.direction == "North":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "direction",
                "from": "North",
                "to": "East"
            }
        elif self.direction == "East":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "direction",
                "from": "East",
                "to": "South"
            }
        elif self.direction == "West":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "direction",
                "from": "West",
                "to": "North"
            }
        elif self.direction == "South":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  #Used instead of coords
                "varTarget": "direction",
                "from": "South",
                "to": "West"
            }

    def turn_left(self):
        if self.direction == "North":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "direction",
                "from": "North",
                "to": "West"
            }
        elif self.direction == "East":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "direction",
                "from": "East",
                "to": "North"
            }
        elif self.direction == "West":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "direction",
                "from": "West",
                "to": "South"
            }
        elif self.direction == "South":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  #Used instead of coords
                "varTarget": "direction",
                "from": "South",
                "to": "East"
            }

    def pickup(self):
        return {

        }

    def harvest(self):
        return {
            "type": "worldDelta",
            "coords": {'x': self.x, 'y': self.y},
            "varTarget": "plant",
            "to": None
        }

    def drop(self):
        return {
            "type": "worldDelta",
            "coords": {'x': self.x, 'y': self.y},
            "varTarget": "cell",
            "to": "food"
        }

    def see(self):
        if self.direction == "North":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "direction",
                "from": "North",
                "to": "West"
            }
        elif self.direction == "East":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "direction",
                "from": "East",
                "to": "North"
            }
        elif self.direction == "West":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  
                "varTarget": "direction",
                "from": "West",
                "to": "South"
            }
        elif self.direction == "South":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  #Used instead of coords
                "varTarget": "direction",
                "from": "South",
                "to": "East"
            }

    def smell(self):
        return {

        }














