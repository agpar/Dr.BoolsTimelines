import random
import uuid
import ujson as json
import math
import sys
from collections import deque, defaultdict

# Handle both relative and local importing schemes.
try:
    from .actor import Actor
    from .globals import *
    from .world_state import WorldState
except SystemError:
    from actor import Actor
    from globals import *
    from world_state import WorldState


SMELL_SPREAD = 30

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
            self.current_turn = 0
            self.world = WorldState(current_turn=self.current_turn)
        else:
            self.uuid = str(model.uuid)
            self.current_turn = model.current_turn
            self.actors = {}
            if model.seed:
                seed = json.loads(model.seed)
                if model.cells:
                    seed['cells'] = json.loads(model.cells)
                else:
                    seed['cells'] = {}
                self.world = WorldState(json_dump=seed)
            else:
                self.world = WorldState(current_turn=self.current_turn)

            self.current_turn = model.current_turn

            for a in model.actors.all():
                self.add_actor(Actor(model=a))

        self.smell_matrix = defaultdict(list)

    def __getitem__(self, key):
        return self.world[key]

    def __setitem__(self, key, item):
        self.world[key] = item

    @property
    def is_night(self):
        return (self.current_turn / 12) % 2 == 0

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

        # Insert actor at nearby location if spot is full.
        atest = self.get_actor((x, y))
        if atest:
            for x1, y1 in self.circle_at((x, y), 4):
                atest = self.get_actor((x1, y1))
                if not atest:
                    self.actors[a.uuid] = a
                    a._coords = (x1, y1)
                    a.gameInstance = self
                    self.world.add_inhabitant(a)
                    warn = "Warning, actor already at ({},{}): '{}' inserted at ({},{})."
                    print(warn.format(x, y, a.name, x1, y1))
                    break
        else:
            self.actors[a.uuid] = a
            a._coords = (x, y)
            a.gameInstance = self
            self.world.add_inhabitant(a)

    def remove_actor(self, act_uuid):
        """Remove an actor from the GameInstance. Fail silently.

        :param xy_or_WI: x,y coord OR a WorldInhabitant object.
        """
        actr = self.get_actor(act_uuid)
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
        try:
            uuid.UUID(xy_or_UUID)
            is_uuid = True
        except Exception as e:
            is_uuid = False

        if is_uuid:
            return self.actors.get(xy_or_UUID)
        else:
            x, y = self.coord_parse(xy_or_UUID)

        content = self[x][y]
        if len(content) > 1:
            for z in content:
                if isinstance(z, Actor):
                    return z
        return None

    def check_actor(self, xy):
        """ Check to see if actor is currently in location specified by param.
        :param xy: x,y coord of gameInstance
        :return Boolean if Actor is at xy location or False if not
        """
        x, y = self.coord_parse(xy)
        content = self[x][y]
        if len(content) > 1:
            for z in content:
                if isinstance(z, Actor):
                    return True
        return False

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

        vision_radius = 2 if self.is_night else 4
        scan_area = self.circle_at(xy_or_WI, vision_radius)

        for x, y in scan_area:
            coord_contents = self.world[x][y]
            for content in coord_contents:
                if self.has_attr(content, attr):
                    return x, y
        return self.coord_parse(xy_or_WI)

    def actor_turn_effects(self, actor_turn):
        """ Receive a turn and determine if it has any reprocussions.

        :param actor_turn: the delta that the actor wants to execute
        :return: delta of any direct changes that have occured.
        """

        effects = []
        if not actor_turn:
            return []
        if not isinstance(actor_turn, list):
            actor_turn = [actor_turn]

        # Calculate side effects of the actor's turn.
        for delta in actor_turn:
            actor = self.get_actor(delta['actorID'])

            if delta['varTarget'] == "_coords":
                new_x = delta["to"][0]
                new_y = delta["to"][1]
                coord_contents = self.world.get_cell((new_x, new_y))
                if self.has_attr(coord_contents, "WATER"):
                    effects.append({
                        "type": "actorDelta",
                        "coords": {'x': new_x, 'y': new_y},
                        "actorID": actor.uuid,
                        "varTarget": "health",
                        "from": actor.health,
                        "to": 0,
                        "message": actor.name + " has drowned!"
                    })
                if self.has_attr(coord_contents, "DEADLY"):
                     effects.append({
                        "type": "actorDelta",
                        "coords": {'x': new_x, 'y': new_y},
                        "actorID": actor.uuid,
                        "varTarget": "health",
                        "from": actor.health,
                        "to": actor.health-50
                    })

            # Check if actor is alive
            if delta['varTarget'] == 'health':
                if delta['to'] <= 0:
                    effects.append({
                        "type": "actorDelta",
                        "coords": {'x': delta["coords"]['x'], 'y': delta["coords"]['y']},
                        "actorID": actor.uuid,
                        "varTarget": "is_alive",
                        "from": True,
                        "to": False,
                        "message:": actor.name + " has died!"
                    })

        # Calculate any side effects of the side effects.
        old_effects = effects
        while old_effects:
            new_effects = self.actor_turn_effects(old_effects)
            old_effects = new_effects
            effects.extend(old_effects)

        return effects

    def global_turn_effects(self):
        """Calculate the effects of this turn not necessarily related to actor action."""
        effects = []

        for u, actr in self.actors.items():
            if not actr.is_alive:
                continue
            if actr.sleep <= 1 and not actr.is_sleeping:
                sleep_action = actr.sleep_action()
                sleep_action['message'] = actr.name + " is exhauseted and fell asleep!"
                effects.append(sleep_action)

            if actr.sleep >= 100 and actr.is_sleeping:
                wake_action = actr.wake_action()
                wake_action['message'] = actr.name + " is fully rested and has woken up!"
                effects.append(wake_action)

            if actr.hunger <= 1:
                effects.append({
                    "type": "actorDelta",
                    "coords": {'x': actr.x, 'y': actr.y},
                    "actorID": actr.uuid,
                    "varTarget": "health",
                    "from": actr.health,
                    "to": actr.health-5,
                    "message": actr.name + " is starving!"
                })
        return effects


    def do_turn(self, up_to=0):
        """High level function for returning a list of turns in this game."""
        all_turns = []
        while self.current_turn < up_to:
            this_turn = {'number': self.current_turn, 'deltas': [], }
            self.current_turn += 1
            this_turn['diff'] = self.world.apply_updates() #Returns diff each call. They should be stored though.
            self.compute_smells()

            for uuid, actor in self.actors.items():
                turn_res = []

                aturn = actor.do_turn()
                if aturn:
                    turn_res.append(aturn)

                effects = self.actor_turn_effects(turn_res)
                if effects:
                    turn_res.extend(effects)

                if turn_res:
                    self.apply_deltas(turn_res)
                    this_turn['deltas'].extend(turn_res)

            global_effects = self.global_turn_effects()
            self.apply_deltas(global_effects)
            this_turn['deltas'].extend(global_effects)
            all_turns.append(this_turn)

        return all_turns

    def apply_deltas(self, delta_list, reverse=False):
        """Apply the deltas produced during turns."""
        for delta in delta_list:
            if reverse:
                val = delta['from']
            else:
                val = delta['to']
            actr = self.get_actor(delta['actorID'])
            if delta['varTarget'] == '_coords':
                self.move_actor(actr, val)
            if delta['varTarget'] == 'health':
                actr.health = val
            if delta['varTarget'] == 'is_sleeping':
                actr.is_sleeping = val

        if reverse:
            for act in self.actors.values():
                act._turn_stat_change(reverse=True)

    def to_dict(self, withseed=True):
        d = self.world.to_dict(withseed=withseed)
        return d

    def _coord_neighbors(self, xy):
        x, y = xy
        return (x-1, y), (x+1, y), (x,y-1), (x, y+1)

    def compute_smells(self):
        self.smell_matrix = defaultdict(list)
        for act in self.actors.values():
            self._bfs_smell_spread(act)

    def _bfs_smell_spread(self, world_inhabitant):
        smell_code = world_inhabitant.smell_code
        x, y = world_inhabitant._coords
        z = self.world.get_cell((x, y)).elevation

        q = deque()
        visited = set()

        neighbors = world_inhabitant.neighbors
        q.extendleft(neighbors)
        visited.add(world_inhabitant._coords)
        visited = visited.union(neighbors)

        #  BFS to populate smell matrix for the turn.
        while q:
            # get first coord
            x1, y1 = q.pop()
            z1 = self.world.get_cell((x1,y1)).elevation

            x2,y2,z2 = x1-x, y1-y, z1-z
            intensity = math.exp(-(x2**2 + y2**2 + z2**2)/SMELL_SPREAD)

            if intensity > .3:
                # get its unvisited neighbors and put them in their place.
                neighbors = set(self._coord_neighbors((x1, y1)))
                neighbors = neighbors.difference(visited)
                q.extendleft(neighbors)
                visited = visited.union(neighbors)

                self.smell_matrix[(x1, y1)].append((smell_code, intensity))


