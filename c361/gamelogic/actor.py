import uuid

try:
    from .globals import *
except SystemError:
    from globals import *

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
            self.dbid = model.id
            self.uuid = str(model.uuid)
            self.name = model.title
            self._coords = model.coords
            self.health = model.health
            self.hunger = model.hunger
            self.sleep = model.sleep
            self.has_food = False
            self.has_rock = False
            self.is_sleeping = model.is_sleeping
            self.direction = model.direction
            self.script = model.behaviour_script
        else:
            self.dbid = -1
            self.uuid = str(uuid.uuid4())
            self.name = name
            self._coords = (x, y)
            self.health = 100
            self.hunger = 100
            self.sleep = 100
            self.has_food = True
            self.has_rock = False
            self.is_sleeping = False
            self.direction = "NORTH"
            self.script = script

        self.info = {}
        self.gameInstance = None
        self.is_food = False
        self.is_rock = False
        self.is_actor = True
        self.smell_code = SMELL_CODES['ACTOR']

        self.behaviours = PARSER.parse(self.script)

    def __repr__(self):
        temp = "Actor({}, {}, '{}')"
        return temp.format(self.x, self.y, self.name)

    def to_dict(self):
        d = {
            'dbid': self.dbid,
            'type': 'ACTOR',
            'uuid': self.uuid,
            'title': self.name,
            'x_coord': self.x,
            'y_coord': self.y,
            'health': self.health,
            'hunger': self.hunger,
            'sleep': self.sleep,
            'is_sleeping': self.is_sleeping,
            'direction': self.direction,
            'behaviour_script': self.script,
            'smell_code': self.smell_code,
        }
        return d

    def do_turn(self):
        """Returns a list of deltas the actor wishes to do."""
        self._turn_stat_change()
        return self.behaviours.get_action(self)

    def _turn_stat_change(self):
        self.hunger -= 1
        if self.is_sleeping:
            self.sleep = self.sleep + 7
            if self.sleep >= 100:
                self.is_sleeping = False
                self.sleep = 100
        else:
            self.sleep -= 1

    @property
    def is_alive(self):
        return True if self.health > 0 else False

    def get_coord(self, direction):
        if direction == 'NORTH':
            return self.north()
        if direction == 'EAST':
            return self.east()
        if direction == 'SOUTH':
            return self.south()
        if direction == 'WEST':
            return self.west()

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
            "sleep": self.sleep_action
        }

    def eat(self):
        if self.has_food :
            return [{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "has_food",
                "from": True,
                "to": False
            }, {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "hunger",
                "to": self.hunger + 50
            }]

    def walk(self, direction):
        """Return a delta for walking in direction."""
        return {
            "type": "actorDelta",
            "coords": {'x': self.x, 'y': self.y},
            "actorID": self.uuid,
            "varTarget": "_coords",
            "from": self._coords,
            "to": self.get_coord(direction)
        }

    def turn_right(self):
        if self.direction == "NORTH":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "direction",
                "from": "NORTH",
                "to": "EAST"
            }
        elif self.direction == "EAST":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "direction",
                "from": "EAST",
                "to": "SOUTH"
            }
        elif self.direction == "WEST":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "direction",
                "from": "WEST",
                "to": "NORTH"
            }
        elif self.direction == "SOUTH":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  #Used instead of coords
                "varTarget": "direction",
                "from": "SOUTH",
                "to": "WEST"
            }

    def turn_left(self):
        if self.direction == "NORTH":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "direction",
                "from": "NORTH",
                "to": "WEST"
            }
        elif self.direction == "EAST":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "direction",
                "from": "EAST",
                "to": "NORTH"
            }
        elif self.direction == "WEST":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "direction",
                "from": "WEST",
                "to": "SOUTH"
            }
        elif self.direction == "SOUTH":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,  #Used instead of coords
                "varTarget": "direction",
                "from": "SOUTH",
                "to": "EAST"
            }

    def face_direction(self, direction):
        """Return a delta to face the direction."""
        if direction not in DIRECTIONS:
            raise SyntaxError("Can not face direction '{}'".format(direction))
        if self.direction == direction:
            return None
        return {
            "type": "actorDelta",
            "coords": {'x': self.x, 'y': self.y},
            "actorID": self.uuid,  #Used instead of coords
            "varTarget": "direction",
            "from": self.direction,
            "to": direction
        }

    def can_walk(self, direction):
        """Figure out if you can walk in a direction."""
        x1,y1 = self._coords
        x2,y2 = self.get_coord(direction)
        c1 = self.gameInstance.world.get_cell((x1,y1))
        c2 = self.gameInstance.world.get_cell((x2,y2))
        if abs(c1.elevation - c2.elevation) > 5:
            return False
        return True

    def pickup(self, direction):
        """ Pickup something in a certain direction. If 
        no direction given, attempt pickup in current direction

        return: resulting delta from a pickup
        """
        if direction not in DIRECTIONS:
            direction = self.direction

        if not has_rock:
            return [{
                "type": "worldDelta",
                "coords": self.get_coord(direction),
                "actorID": self.uuid,
                "varTarget": "ROCK",
                "to": None
            },{
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "has_rock",
                "to": True
            }]

    def harvest(self, direction):
        """ Harvest something in a direction. If no direction specified 
        harvest in current direction

        return: harvest resulting delta
        """
        if direction not in DIRECTIONS:
            direction = self.direction

        return [{
            "type": "worldDelta",
            "coords": self.get_coord(direction),
            "actorID": self.uuid,
            "varTarget": "plant",
            "to": None
        },{
            "type": "actorDelta",
            "coords": {'x': self.x, 'y': self.y},
            "actorID" : self.uuid,
            "varTarget": "has_food",
            "to": True
        }] 

    def drop(self, direction):
        """ Drop something in a certain direction. If no
        direction specified drop in current direction

        return: delta for drop
        """
        if direction not in DIRECTIONS:
            direction = self.direction

        if self.has_food:
            return [{
                "type": "worldDelta",
                "coords": self.get_coord(direction),
                "actorID": self.uuid,
                "varTarget": "cell",
                "to": "FOOD"
            }, {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID" : self.uuid,
                "varTarget": "is_food",
                "to": False
            }]

        if self.has_rock:
            return [{
                "type": "worldDelta",
                "coords": self.get_coord(direction),
                "actorID": self.uuid,
                "varTarget": "cell",
                "to": "ROCK"
            }, {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "has_rock",
                "to": False
            }]


    # See should return what is directly in front of avatar, as well as one extra cell further
    def see(self):
        if self.direction == "NORTH":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "sight_line",
                "to": []
            }
        elif self.direction == "EAST":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "sight_line",
                "to": []
            }
        elif self.direction == "WEST":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "sight_line",
                "to": []
            }
        elif self.direction == "SOUTH":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "sight_line",
                "to": []
            }

    def smell(self):
        if self.direction == "NORTH":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "smells_near",
                "to": [{



                }]
            }
        elif self.direction == "EAST":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "smells_near",
                "to": [{


                }]
            }
        elif self.direction == "WEST":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "smells_near",
                "to": [{


                }]
            }
        elif self.direction == "SOUTH":
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "varTarget": "smells_near",
                "to": [{

                
                }]
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

