# Comparisons #
# =========== #


def eq(left, right):
    if left == right:
        return True
    return False


def lt(left, right):
    if left < right:
        return True
    return False


def lte(left, right):
    if left <= right:
        return True
    return False


def gt(left, right):
    if left > right:
        return True
    return False


def gte(left, right):
    if left >= right:
        return True
    return False


def actor_hunger(actor):
    return actor.hunger


FUNC_MAP = {
    '<': lt,
    '<=': lte,
    '>': gt,
    '>=': gte,
    '==': eq,
}

SYM_MAP = {
    'myhunger': actor_hunger
}