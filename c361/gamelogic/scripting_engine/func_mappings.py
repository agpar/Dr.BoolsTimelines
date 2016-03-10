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


def actor_hunger(actor):
    return actor.hunger


FUNC_MAP = {
    '<': lt,
    '<=': lte,
    '>': gt,
    '>=': gte,
    '==': eq,
    'or': or_fn,
    'and': and_fn,
}

SYM_MAP = {
    'myhunger': actor_hunger
}