import uuid

from globals import *
from scripting_engine.script_parser import AiScriptParser


class Actor(WorldInhabitant):
    """The animated inhabitants of a GameInstance

    Note, the Actor should NEVER modify ANY objects other than
    themselves. All interactions with the world and other actors
    MUST be passed through the GameInstance in order to maintain
    integrity and logic of the world.

    Actions output a world state change delta similar to
    {
        "type": "actorDelta",
        "coords": {'x': self.x, 'y': self.y},
        "actorID": self.uuid,
        "varTarget": "_coords",
        "from": self._coords,
        "to": self.east()
    }
    """

    def __init__(self, x=-1, y=-1, name="Anonymous", script="", model=None):
        if model:
            self.uuid = str(model.uuid)
            self.name = model.title
            self._coords = model.coords
            self.health = model.health
            self.hunger = model.hunger
            self.sleep = model.sleep
            self.is_sleeping = model.is_sleeping
            self.direction = model.direction
            self.is_food = model.food
            self.block = model.block
            self.script = model.behaviour_script
        else:
            self.uuid = str(uuid.uuid4())
            self.name = name
            self._coords = (x, y)
            self.health = 100
            self.hunger = 100
            self.sleep = 100
            self.is_sleeping = False
            self.direction = "North"
            self.is_food = False
            self.block = False
            self.script = script

        self.info = {}
        self.gameInstance = None
        self.smell_code = SMELL_CODES['ACTOR']
        self.is_actor = True

        self.sight_line = []
        self.smell_measure = []

        parser = AiScriptParser()
        self.behaviours = parser.parse(self.script)

    def __repr__(self):
        temp = "Actor({}, {}, '{}')"
        return temp.format(self.x, self.y, self.name)

    def do_turn(self):
        self._turn_stat_change()
        # TODO Replace this placeholder with actions based on a parsed behaviour script.
        return self.behaviours.get_action(self)

    def _turn_stat_change(self):
        self.hunger -= 5
        if self.is_sleeping:
            self.sleep = self.sleep + 7
            if self.sleep >= 100:
                self.is_sleeping = False
                self.sleep = 100
        else:
            self.sleep -= 5

    @property
    def is_alive(self):
        return True if self.health > 0 else False

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
            "smell": self.smell,
            "sleep": self.sleep
        }


    def eat(self):
        if self.is_food :
            return [{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "food",
                "from": True,
                "to": False
            }, {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "hunger",
                "to": self.hunger + self.is_food
            }]

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
    # For picking up blocks only
    def pickup(self):
        if self.direction == "North":
            return [{
                "type": "worldDelta",
                "coords": self.north(),
                "actorID": self.uuid,
                "varTarget": "block",
                "to": None
            },{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "block",
                "to": True
            }]
        elif self.direction == "East":
            return [{
                "type": "worldDelta",
                "coords": self.east(),
                "actorID": self.uuid,
                "varTarget": "block",
                "to": None
            },{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "block",
                "to": True
            }]
        elif self.direction == "West":
            return [{
                "type": "worldDelta",
                "coords": self.west(),
                "actorID": self.uuid,
                "varTarget": "block",
                "to": None
            },{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "block",
                "to": True
            }]
        elif self.direction == "South":
            return [{
                "type": "worldDelta",
                "coords": self.south(),
                "actorID": self.uuid,
                "varTarget": "block",
                "to": None
            },{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "block",
                "to": True
            }]

    def harvest(self):
        if self.direction == "North":
            return [{
                "type": "worldDelta",
                "coords": self.north(),
                "actorID": self.uuid,
                "varTarget": "plant",
                "to": None
            },{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "food",
                "to": True
            }]
        elif self.direction == "East":
            return [{
                "type": "worldDelta",
                "coords": self.east(),
                "actorID": self.uuid,
                "varTarget": "plant",
                "to": None
            },{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "food",
                "to": True
            }]
        elif self.direction == "West":
            return [{
                "type": "worldDelta",
                "coords": self.west(),
                "actorID": self.uuid,
                "varTarget": "plant",
                "to": None
            },{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "food",
                "to": True
            }]
        elif self.direction == "South":
            return [{
                "type": "worldDelta",
                "coords": self.south(),
                "actorID": self.uuid,
                "varTarget": "plant",
                "to": None
            },{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "food",
                "to": True
            }]


    def drop(self):
        if not self.is_food:
            if self.direction == "North":
                return [{
                    "type": "worldDelta",
                    "coords": self.north(),
                    "varTarget": "cell",
                    "to": "food"
                }, {
                    "type": "actorDelta",
                    "coords": {'x': self.x, 'y': self.y},
                    "varTarget": "food",
                    "to": False
                }]
            elif self.direction == "East":
                return [{
                    "type": "worldDelta",
                    "coords": self.east(),
                    "varTarget": "cell",
                    "to": "food"
                }, {
                    "type": "actorDelta",
                    "coords": {'x': self.x, 'y': self.y},
                    "varTarget": "food",
                    "to": False
                }]
            elif self.direction == "West":
                return [{
                    "type": "worldDelta",
                    "coords": self.west(),
                    "varTarget": "cell",
                    "to": "food"
                }, {
                    "type": "actorDelta",
                    "coords": {'x': self.x, 'y': self.y},
                    "varTarget": "food",
                    "to": False
                }]
            elif self.direction == "South":
                return [{
                    "type": "worldDelta",
                    "coords": self.south(),
                    "varTarget": "cell",
                    "to": "food"
                }, {
                    "type": "actorDelta",
                    "coords": {'x': self.x, 'y': self.y},
                    "varTarget": "food",
                    "to": False
                }]

        else:
            if self.direction == "North":
                return [{
                    "type": "worldDelta",
                    "coords": self.north(),
                    "varTarget": "cell",
                    "to": "block"
                }, {
                    "type": "actorDelta",
                    "coords": {'x': self.x, 'y': self.y},
                    "varTarget": "block",
                    "to": False
                }]
            elif self.direction == "East":
                return [{
                    "type": "worldDelta",
                    "coords": self.east(),
                    "varTarget": "cell",
                    "to": "block"
                }, {
                    "type": "actorDelta",
                    "coords": {'x': self.x, 'y': self.y},
                    "varTarget": "block",
                    "to": False
                }]
            elif self.direction == "West":
                return [{
                    "type": "worldDelta",
                    "coords": self.west(),
                    "varTarget": "cell",
                    "to": "block"
                }, {
                    "type": "actorDelta",
                    "coords": {'x': self.x, 'y': self.y},
                    "varTarget": "block",
                    "to": False
                }]
            elif self.direction == "South":
                return [{
                    "type": "worldDelta",
                    "coords": self.south(),
                    "varTarget": "cell",
                    "to": "block"
                }, {
                    "type": "actorDelta",
                    "coords": {'x': self.x, 'y': self.y},
                    "varTarget": "block",
                    "to": False
                }]

    # See should return what is directly in front of avatar, as well as one extra cell further
    def see(self):
        if self.direction == "North":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "sight_line",
                "to": []
            }
        elif self.direction == "East":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "sight_line",
                "to": []
            }
        elif self.direction == "West":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "sight_line",
                "to": []
            }
        elif self.direction == "South":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "sight_line",
                "to": []
            }

    def smell(self):
        if self.direction == "North":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "smell_measure",
                "to": []
            }
        elif self.direction == "East":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "smell_measure",
                "to": []
            }
        elif self.direction == "West":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "smell_measure",
                "to": []
            }
        elif self.direction == "South":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "smell_measure",
                "to": []
            }

    def sleep_action(self):
        if not self.is_sleeping:
            return {
                        "type": "actorDelta",
                        "coords": {'x': self.x, 'y': self.y},
                        "actorID": self.uuid,
                        "varTarget": "is_sleeping",
                        "from": False,
                        "to": True
                    }
        else:
            return {
                        "type": "actorDelta",
                        "coords": {'x': self.x, 'y': self.y},
                        "actorID": self.uuid,
                        "varTarget": "is_sleeping",
                        "from": True,
                        "to": False
                    }
