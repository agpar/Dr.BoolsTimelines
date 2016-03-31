from .func_mappings import FUNC_MAP


class Behaviour:
    def __init__(self, rules):
        self.rules = rules

    def __iter__(self):
        return iter(self.rules)

    def get_action(self, actor):
        # Test all conditions in actor's script.
        possible_actions = []

        for rule in self.rules:
            if rule.eval(actor):
                possible_actions.append(rule.actions[0].eval(actor).value)
            elif rule.alternative:
                possible_actions.append(rule.alternative.actions[0].eval(actor).value)

        for action in possible_actions:
            if self._is_possible(actor, action):
                return action

    def _is_possible(self, actor, action):
        if actor.is_sleeping:
            return action['varTarget'] == 'is_sleeping'
        return True

