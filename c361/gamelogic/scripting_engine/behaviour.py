from .func_mappings import FUNC_MAP


class Behaviour(object):
    def __init__(self, rules):
        self.rules = rules

    def __iter__(self):
        return iter(self.rules)

    def get_action(self, actor):
        """return the first action whos conditions eval to True"""
        if not actor.is_alive:
            return None
        for rule in self.rules:
            if rule.eval(actor):
                return rule.actions[0].eval(actor).value
