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

# Action Functions #
# ================ #


def sleep_fn(actor):
    return actor.sleep_action()


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
    '*': mult_fn
}

SYM_MAP = {
    'myhunger': actor_hunger,
    'mylocation': actor_location,
    'myhealth': actor_health
}

ACTION_MAP = {
    'sleep': sleep_fn
}