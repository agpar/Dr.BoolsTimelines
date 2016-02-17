"""The globals which are relevant to the gamelogic engine"""

def is_edible(obj):
    return obj.EDIBLE

ACTIONS = {

}

VARIABLES = {
    "EDIBLE": is_edible
}

# A set of all words to quickly check for membership
GRAMMAR = set()
GRAMMAR.update(ACTIONS.keys())
GRAMMAR.update(VARIABLES.keys())

