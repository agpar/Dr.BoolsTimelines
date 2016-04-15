import random

try:
    from ..globals import *
except ImportError:
    from c361.gamelogic.globals import *

def to_list(value):
    """Cast any non-list to a list with one element."""
    if isinstance(value, list):
        return value
    if value is None:
        return []
    return [value]

# Comparisons #
# =========== #


def eq(left, right):
    return left == right


def lt(left, right):
    return left < right


def lte(left, right):
    return left <= right


def gt(left, right):
    return left > right


def gte(left, right):
    return left >= right


# Boolean Operations #
# ================== #

def or_fn(left, right):
    return left or right


def and_fn(left, right):
    return left and right


def not_fn(operand):
    return not operand


# Math Operations #
# =============== #


def add_fn(left, right):
    return left + right


def minus_fn(left, right):
    return left - right


def div_fn(left, right):
    return left/right


def mult_fn(left, right):
    return left * right


# Other Functions #
# =============== #


# World/Actor Variables #
# ===================== #


def actor_hunger(actor):
    """Get actor hunger.

    :return: Integer.
    """
    return actor.hunger


def actor_location(actor):
    """Get actor location.

    Functions that return locations might be good to
    pass into another function, like direction(), which
    figures out which way to move to get to the given location.
    That way, a user could input the action:

        move(direction([some coords]))

    :return: 2-tuple of Integers.
    """
    return actor._coords


def actor_health(actor):
    return actor.health


def actor_energy(actor):
    return actor.sleep


def actor_direction(actor):
    return actor.direction


def actor_rock(actor):
    return actor.has_rock


def actor_food(actor):
    return actor.has_food


def actor_issleeping(actor):
    return actor.is_sleeping

def actor_holdingblock(actor):
    return actor.has_block

def check_fn(actor, attr):
    #print("yes")
    
    if (actor.gameInstance.has_attr(actor.gameInstance.world.get_cell(actor._coords), attr)):
         #print("attr is at actor location")
        return True
    else:
        return False

# Action Functions #
# ================ #


def sleep_fn(actor):
    return actor.sleep_action()


def wake_fn(actor):
    return actor.wake_action()


def eat_fn(actor):
    """If an actor has food, eat, otherwise do nothing

    :return delta for eat effect
    """
    if actor.has_food:
        return actor.eat()
    else:
        return


def drop_fn(actor, attr):
    """ Drop rock object

    :return delta for drop
    """
    if attr not in ("BLOCK", "FOOD"):
        return None
    
    return actor.drop(attr)


def harvest_fn(actor, direction):
    """ Harvest a plant.
    :param is the direction of the plant, NORTH, SOUTH, WEST, EAST
    :return delta for harvest
    """
    if actor.has_food:
        return
    return actor.harvest(direction)


def pickup_fn(actor, direction):
    """ Pickup a rock

    :return delta to pick up rock
    """

    if actor.has_block:
        return 
    #elif :
    return actor.pickup(direction)


def direction_fn(actor, xy, y=None):
    """Can accept input from nearest_fn, or 2 numbers.
    So, in a script you can call it like:

    direction(nearest(WATER))
    direction(0, 3)

    :return List of directions to the coord.
    """
    if y == None:
        xy, y = xy
    return actor.direction_to((xy, y))


def nearest_fn(actor, attr):
    """Call from script like:

    nearest(ATTRIBUTE)

    :return A two-tuple coordinate.
    """
    return actor.gameInstance.find_nearest(actor, attr)


def walk_fn(actor, direction):
    """Return delta for walking in some direction.

    :param actor: An actor to walk.
    :param direction: A constant (or list of) from globals.DIRECTIONS.
    """

    direction = to_list(direction)
    for dir in direction:
        if actor.can_walk(dir):
            return actor.walk(dir)


def scavenge_fn(actor, attr):
    """ Search for nearest food source

    :param actor: An actor to Search
    :param attr: attribute (food type) to look for
    """
    if attr not in ("PLANT", "FOOD"):
        return None
    vision_radius = 2 if actor.gameInstance.is_night else 4
    scan_area = actor.gameInstance.circle_at(actor, vision_radius)
    nearest = actor._coords
    for x, y in scan_area:
        coord_contents = actor.gameInstance.world[x][y]
        for content in coord_contents:
            if actor.gameInstance.check_plant(content._coords):
                nearest = content._coords
                break
    print(nearest[1])
    print(nearest[0])
    if actor.can_reach(nearest):
        #print(nearest)
        #print(actor.direction(nearest))
        direction = actor.direction_to(nearest)
        for dir in direction:
            return harvest_fn(actor, dir)
    elif nearest == actor._coords:
        print("here1")
        dirs = {"NORTH", "SOUTH", "EAST", "WEST"}
        #problem with random.shuffle(dirs)
        return walk_fn(actor, 'NORTH')
    else:
        direction = actor.direction_to(nearest)
        print(direction)
        for dir in direction:
            return actor.walk(dir)
        




def flee_fn(actor):
    """ Move away from the nearest "deadly"
    by going in the opposite direction of path to deadly
    """

    [direction] = (direction_fn(nearest_fn("DEADLY")));

    for dir in direction:
        if actor.can_walk(actor.get_oppCoord(dir)):
            return actor.walk(actor.get_oppCoord(dir))


def attack_fn(actor):
    distance = 100000
    if (len(actor.gameInstance.actors) > 1):
        for key in actor.gameInstance.actors:
            if (key == actor.uuid):
                continue
            tmp_actor = actor.gameInstance.get_actor(key)
            tmp_distance = actor.distance_to(tmp_actor._coords)
            if (tmp_distance < distance):
                distance = tmp_distance
                nearest_actor = tmp_actor._coords
        if actor.can_reach(nearest_actor):
            for dir in actor.direction_to(nearest_actor):
                return actor.attack(dir)
        else:
            for dir in actor.direction_to(nearest_actor):
                return actor.walk(dir)
    else:
        return


FUNC_MAP = {
    '<': lt,
    '<=': lte,
    '>': gt,
    '>=': gte,
    '==': eq,
    'or': or_fn,
    'and': and_fn,
    'not': not_fn,
    '+': add_fn,
    '-': minus_fn,
    '/': div_fn,
    '*': mult_fn,
    'sleep': sleep_fn,
    'wake': wake_fn,
    'direction': direction_fn,
    'nearest': nearest_fn,
    'walk': walk_fn,
    'eat': eat_fn,
    'drop': drop_fn,
    'harvest': harvest_fn,
    'pickup': pickup_fn,
    'scavenge': scavenge_fn,
    'flee': flee_fn,
    'attack': attack_fn,
    'CHECK': check_fn
}

SYM_MAP = {
    'NORTH': lambda x: 'NORTH',
    'EAST': lambda x: 'EAST',
    'SOUTH': lambda x: 'SOUTH',
    'WEST': lambda x: 'WEST',
    'MY_HUNGER': actor_hunger,
    'MY_LOCATION': actor_location,
    'MY_HEALTH': actor_health,
    'MY_ENERGY': actor_energy,
    'MY_DIRECTION' : actor_direction,
    'HOLDING_ROCK' : actor_rock,
    'HOLDING_FOOD' : actor_food,
    'SLEEPING' : actor_issleeping,
    'HOLDING_BLOCK': actor_holdingblock
}
