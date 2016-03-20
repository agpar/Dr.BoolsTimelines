import random
import uuid

# Handle both relative and local importing schemes.
try:
    from .actor import Actor
    from .globals import *
    from .world_state import WorldState
except SystemError:
    from actor import Actor
    from globals import *
    from world_state import WorldState



class GameInstance(CoordParseMixin):
    """Container for world and actors in world.

    GameInstance is responsible for tracking the world and the actors
    within it. It has functions to simplify interacting with the world
    and actors in it. It also provides functions that actors can call
    for information about the world, in order to aid in their decision
    making.

    Most functions that have a signature of the form fn(x,y) can
    accept a number of different arguments. The goal is to have as open
    an api as possible, given
    """
    def __init__(self, model=None):
        if not model:
            # For testing.
            self.actors = {}
            self.world = WorldState()
            self.current_turn = 0
        else:
            self.uuid = str(model.uuid)
            self.current_turn = model.current_turn_number
            self.actors = {}
            self.world = WorldState()
            self.world_size = 250
            self.current_turn = 0

            for a in model.actors.all():
                self.add_actor(Actor(a))

    def __getitem__(self, item):
        return self.world[item]

    def __setitem__(self, key, item):
        self.world[key] = item


    def add_actor(self, a, xy=None):
        """Add an Actor to the GameInstance.

        :param a: Actor object to be added.
        :param xy: x,y coord OR a WorldInhabitant (such as a Cell)
        """
        atest = self.actors.get(a.uuid)
        if atest:
            tmp = "{} already in GameInstance."
            raise ValueError(tmp.format(atest))

        if xy:
            x, y = self.coord_parse(xy)
        else:
            x, y = self.coord_parse(a)

        # TEMP CODE FOR INSERTING MANY ACTORS INTO NEW WORLD
        if x==0 and y==0:
            for x, y in zip(range(10), range(10)):
                atest = self.get_actor((x, y))
                if not atest:
                    self.actors[a.uuid] = a
                    a._coords = (x, y)
                    a.gameInstance = self
                    self.world.add_inhabitant(a)
                    break

        else:
            atest = self.get_actor((x, y))
            if atest:
                tmp = "{0} already at coord. Only 1 Actor on a cell at a time."
                raise ValueError(tmp.format(atest))

            self.actors[a.uuid] = a
            a._coords = (x, y)
            a.gameInstance = self
            self.world.add_inhabitant(a)

    def remove_actor(self, xy_or_WI):
        """Remove an actor from the GameInstance. Fail silently.

        :param xy_or_WI: x,y coord OR a WorldInhabitant object.
        """
        x,y = self.coord_parse(xy_or_WI)
        actr = self.get_actor(xy_or_WI)
        if not actr:
            return

        del self.actors[actr.uuid]
        self.world.remove_inhabitant(actr)
        actr._coords = (-1, -1)
        return

    def get_actor(self, xy_or_UUID):
        """Get actor by _coords, UUID, or WorldInhabitant.

        :param xy_or_UUID: x,y coord OR UUID of actor, or WorldInhabitant
        :return: Actor that fits description, or None
        """
        if isinstance(xy_or_UUID, uuid.UUID):
            return self.actors.get(xy_or_UUID)
        else:
            x, y = self.coord_parse(xy_or_UUID)

        content = self[x][y]
        if len(content) > 1:
            for z in content:
                if isinstance(z, Actor):
                    return z
        return None

    def move_actor(self, actor_or_UUID_or_coords, xy_or_WI):
        """Move an actor to a location.

        :param actor_or_UUID_or_coords: Exactly what it says.
        :param xy_or_WI: Coords or a WorldInhabitant (cell)
        :return: None.
        """
        if isinstance(actor_or_UUID_or_coords, Actor):
            actor = actor_or_UUID_or_coords
        else:
            actor = self.get_actor(actor_or_UUID_or_coords)

        x,y = self.coord_parse(xy_or_WI)

        self.world.remove_inhabitant(actor)
        actor._coords = (x,y)
        self.world.add_inhabitant(actor)

    def has_attr(self, world_inhab, attr):
        """Determine if the wold_inhab has an attribute.

        :param world_inhab: A WorldInhabitant.
        :param attr: A property defined in globals.ATTRIBUTES
        :return: bool
        """
        if attr == "FOOD":
            return world_inhab.is_food
        if attr == "DEADLY":
            return world_inhab.is_deadly
        if attr == "ACTOR":
            return world_inhab.is_actor
        if attr == "WATER":
            return world_inhab.is_water
        if attr == "GRASS":
            return world_inhab.is_grass
        if attr == "ROCK":
            return world_inhab.is_rock
        if attr == "PLANT":
            return world_inhab.is_plant
        else:
            return False

    def find_nearest(self, xy_or_WI, attr):
        """Find and return nearest coords of world where something with attr is.

        :param xy_or_UUID: x,y tuple OR a WorldInhabitant
        :param attr: A property defined in globals.ATTRIBUTES
        :return: Coordinate tuple of nearest cell with something having that attribute.
                Returns original coords if not found.
        """

        scan_area = self.circle_at(xy_or_WI, 2)

        for x, y in scan_area:
            coord_contents = self.world[x][y]
            for content in coord_contents:
                if self.has_attr(content, attr):
                    return x, y
        return self.coord_parse(xy_or_WI)

    def valid_turn(self, actor_turn):
        """ Receive a turn and check whether or not the turn is valid.

        :param actor_turn: the turn that the actor wants to execute
        :return: boolean on validity of the turn attempted
        """

        actor = self.get_actor(actor_turn['actorID'])
        if actor_turn['varTarget'] == "_coords":
            check_x = actor_turn["to"][0]
            check_y = actor_turn["to"][1]
            check_coord = self.world[check_x][check_y]

            if self.has_attr(check_coord, "ROCK"):
                return False
                
            elif self.has_attr(check_coord, "ACTOR"):
                return False
                
            else:
                return True


    def turn_effects(self, actor_turn):
        """ Receive a turn and determine if it has any reprocussions.

        :param actor_turn: the delta that the actor wants to execute
        :return: delta of any direct changes that have occured.
        """

        actor = self.get_actor(actor_turn['actorID'])
        if actor_turn['varTarget'] == "_coords":
            new_x = actor_turn["to"][0]
            new_y = actor_turn["to"][1]
            coord_contents = self.world[new_x][new_y]

            if self.has_attr(coord_contents, "WATER"):
                return {
                    "type": "actorDelta",
                    "coords": {'x': new_x, 'y': new_y},  # The new position of the actor
                    "actorID": actor.uuid,
                    "varTarget": "health",
                    "from": actor.health,
                    "to": 0
                }
            if self.has_attr(coord_contents, "DEADLY"):
                return {
                    "type": "actorDelta",
                    "coords": {'x': new_x, 'y': new_y},
                    "actorID": actor.uuid,
                    "varTarget": "health",
                    "from": actor.health,
                    "to": actor.health-50
                }
            if self.has_attr(coord_contents, "ACTOR"):
                return {
                     "type": "actorDelta",
                    "coords": {'x': new_x, 'y': new_y},
                    "actorID": actor.uuid,
                    "varTarget": None,
                    "from": None,
                    "to": None
                }
            if self.has_attr(coord_contents, "FOOD"):
                return {
                    "type": "actorDelta",
                    "coords": {'x': new_x, 'y': new_y},
                    "actorID": actor.uuid,
                    "varTarget": None,
                    "from": None,
                    "to": None
                }
        else:
            return None  # This method should only return new effects.

    def do_turn(self, up_to=0):
        all_turns = []
        while self.current_turn <= up_to:
            self.current_turn += 1
            this_turn = {'number': self.current_turn, 'deltas': []}
            for uuid, actor in random.shuffle(list(self.actors.items())):

                this_turn['deltas'].append(actor.do_turn())
                print(actor.do_turn())


            all_turns.append(this_turn)

            # TODO Validate the delta before accepting and returning it.
            # TODO Calculate other effects that result from the delta (health changes, deaths, etc)

        return all_turns

  








