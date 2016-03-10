

class Behaviour(object):
    def __init__(self, rules):
        self.rules = rules

    def __iter__(self):
        return iter(self.rules)
