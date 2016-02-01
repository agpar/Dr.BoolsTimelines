"""The globals which are relevant to the gamelogic engine"""

from .actions import *

ACTIONS = {

}

VARIABLES = {
    "UP": var_up,

}

# A set of all words to quickly check for membership
GRAMMAR = set()
GRAMMAR.update(ACTIONS.keys())
GRAMMAR.update(VARIABLES.keys())

