
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

def actor_direction(actor):
    return actor.direction

def actor_rock(actor):
    return actor.is_rock

def actor_food(actor):
    return actor.is_food

def actor_issleeping(actor):
    return actor.is_sleeping

# Action Functions #
# ================ #


def sleep_fn(actor):
    return actor.sleep_action()

def eat_fn(actor):
    """If an actor has food, eat, otherwise do nothing

    :return Delta 
    """
    if actor_food(actor):
        return actor.eat()
    else: 
        return

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

    if isinstance(direction, str):
        direction = [direction]

    if isinstance(direction, list):
        for dir in direction:
            if actor.can_walk(dir):
                return actor.walk(dir)



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
    'direction': direction_fn,
    'nearest': nearest_fn,
    'walk': walk_fn,
    'eat': eat_fn
}

SYM_MAP = {
    'NORTH': lambda x: 'NORTH',
    'EAST': lambda x: 'EAST',
    'SOUTH': lambda x: 'SOUTH',
    'WEST': lambda x: 'WEST',
    'myhunger': actor_hunger,
    'mylocation': actor_location,
    'myhealth': actor_health,
    'mydirection' : actor_direction,
    'myrock' : actor_rock,
    'myfood' : actor_food,
    'asleep' : actor_issleeping

}
