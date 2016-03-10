from .func_mappings import *


class Node:
    pass


class SymbolAtom:
    """A node which holds a single symbol."""
    def __init__(self, val):
        self.value = val
        self.func_val = SYM_MAP.get(val)

    def __repr__(self):
        return "SymbolAtom({})".format(self.value)

    def eval(self, actor=None):
        if self.func_val:
            return self.func_val(actor)
        return self.value


class Assignment(Node):
    def __init__(self, symbol, value):
        self.symbol = symbol
        self.value = value


class IfStatementAction(Node):
    def __init__(self, condition, actions):
        self.condition = condition
        self.actions = actions
        
    def eval(self, actor):
        """Test the condition."""
        return self.condition.eval(actor)


class IfStatementInference(Node):
    def __init__(self, condition, inferences):
        self.condition = condition
        self.inferences = inferences


class BinaryNumOperation(Node):
    def __init__(self, left, operation, right):
        self.left = left
        self.operation = operation
        self.right = right


class NumRelationship(Node):
    def __init__(self, left, relation, right):
        self.left = left
        self.right = right
        self.relation = FUNC_MAP[relation]

    def eval(self, actor):
        return self.relation(self.left.eval(actor), self.left.eval(actor))


class UnaryNumOperation(Node):
    def __init__(self, operation, operand):
        self.operation = operation
        self.operand = operand


class BinaryBoolOperation(Node):
    def __init__(self, left, operation, right):
        self.left = left
        self.operation = FUNC_MAP[operation]
        self.right = right

    def eval(self, actor):
        return self.operation(self.left.eval(actor), self.right.eval(actor))


class UnaryBoolOperation(Node):
    def __init__(self, operation, operand):
        self.operation = operation
        self.operand = operand
