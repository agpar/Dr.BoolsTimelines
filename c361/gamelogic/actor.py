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
            self.has_food = True
            self.has_rock = False
            self.has_block = True
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
            self.has_block = True
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

    @property
    def is_alive(self):
        return True if self.health > 0 else False
    
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
            'has_rock': self.has_rock,
            'has_block': self.has_block,
            'has_food': self.has_food
        }
        return d

    def do_turn(self):
        """Returns a list of deltas the actor wishes to do."""
        if not self.is_alive:
            return None
        self._turn_stat_change()
        return self.behaviours.get_action(self)

    def _turn_stat_change(self, reverse=False):
        if reverse:
            self.hunger += 1
            if self.is_sleeping:
                self.sleep -= 20
            else:
                self.sleep += 1
        else:
            self.hunger -= 1
            if self.is_sleeping:
                self.sleep += 20
            else:
                self.sleep -= 1

    def can_walk(self, direction):
        """Figure out if you can walk in a direction."""
        x1,y1 = self._coords
        x2,y2 = self.get_coord(direction)
        c1 = self.gameInstance.world.get_cell((x1,y1))
        c2 = self.gameInstance.world.get_cell((x2,y2))
        if abs(c1.elevation - c2.elevation) > 5:
            return False
        if self.gameInstance.get_actor((x2,y2)):
            return False
        return True

    def get_coord(self, direction):
        if direction == 'NORTH':
            return self.north()
        if direction == 'EAST':
            return self.east()
        if direction == 'SOUTH':
            return self.south()
        if direction == 'WEST':
            return self.west()

    def get_oppCoord(self,direction):
        if direction == 'NORTH':
            return 'SOUTH'
        if direction == 'EAST':
            return 'WEST'
        if direction == 'SOUTH':
            return 'NORTH'
        if direction == 'WEST':
            return 'EAST'

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
            "sleep": self.sleep_action,
            "attack": self.attack
        }

    def eat(self):
        if self.has_food :
            return {
                "type": "actorDelta",
                "coords": {'x': self.x, 'y': self.y},
                "actorID": self.uuid,
                "varTarget": "hunger",
                "to": self.hunger + 50
            }
            
    def attack(self, direction):
        coords = self.get_coord(direction)
        actor = self.gameInstance.get_actor(coords)
        x,y = actor._coords
        return {
            "type": "actorDelta",
            "coords": {'x': x, 'y': y},
            "actorID": actor.uuid,
            "varTarget": "health",
            "from": actor.health,
            "to": actor.health - 10
        }

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

    def pickup(self, direction):
        """ Pickup something in a certain direction. If 
        no direction given, attempt pickup in current direction

        return: resulting delta from a pickup
        """
        coords = self.get_coord(direction)
        return {
            "type": "worldDelta",
            "coords": {'x': coords[0], 'y': coords[1]},
            "actorID": self.uuid,
            "varTarget": "block",
            "to": None
        }

    def harvest(self, direction):
        """ Harvest something in a direction. If no direction specified 
        harvest in current direction

        return: harvest resulting delta
        """
        self.direction = direction
        #print(self.direction)
        coords = self.get_coord(direction)
        if (self.gameInstance.check_plant(coords)):
            return {
                "type": "worldDelta",
                "coords": {'x': coords[0], 'y': coords[1]},
                "actorID": self.uuid,
                "varTarget": "plant",
                "to": None
            }
        else:
            return

    def drop(self, attr):
        """ Drop something in a certain direction. If no
        direction specified drop in current direction

        return: delta for drop
        """
        coords = self.get_coord(self.direction)
        if (attr == "FOOD"):
            if self.has_food:
                return {
                    "type": "worldDelta",
                    "coords": {'x': coords[0], 'y': coords[1]},
                    "actorID" : self.uuid,
                    "varTarget": "plant",
                    "to": True
                }
        if (attr == "BLOCK"):
            if self.has_block:
                return {
                    "type": "worldDelta",
                    "coords": {'x': coords[0], 'y': coords[1]},
                    "actorID": self.uuid,
                    "varTarget": "block",
                    "to": True
                }


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
        return {
                    "type": "actorDelta",
                    "coords": {'x': self.x, 'y': self.y},
                    "actorID": self.uuid,
                    "varTarget": "is_sleeping",
                    "from": False,
                    "to": True
                }

    def wake_action(self):
        return {
            "type": "actorDelta",
            "coords": {'x': self.x, 'y': self.y},
            "actorID": self.uuid,
            "varTarget": "is_sleeping",
            "from": True,
            "to": False
        }