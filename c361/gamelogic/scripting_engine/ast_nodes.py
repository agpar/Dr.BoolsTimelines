from .func_mappings import *


class Node:
    def eval(self, actor):
        raise NotImplemented


class SymbolAtom(Node):
    """A node which holds a single symbol."""
    def __init__(self, val):
        self.value = val
        self.func_val = FUNC_MAP.get(val)

    def __repr__(self):
        return "SymbolAtom({})".format(self.value)

    def eval(self, actor=None):
        if self.func_val:
            return self.func_val(actor)
        return self.value


class Function(Node):
    def __init__(self, symbol, arguments):
        self.symbol = symbol
        self.arguments = arguments

    def __repr__(self):
        return "{}({})".format(self.symbol.value, self.arguments)

    def eval(self, actor):
        evaluated_args = [x.eval(actor) for x in self.arguments]
        fn = self.symbol.eval(actor)
        return fn(*evaluated_args)


class Assignment(Node):
    def __init__(self, symbol, value):
        self.symbol = symbol
        self.value = value


class IfStatement(Node):
    def __init__(self, condition, inferences, actions):
        self.condition = condition
        self.inferences = inferences
        self.actions = actions

    def eval(self, actor):
        """Test the condition."""
        return self.condition.eval(actor)


class BinaryNumOperation(Node):
    def __init__(self, left, operation, right):
        self.left = left
        self.operation = FUNC_MAP[operation]
        self.right = right

    def eval(self, actor):
        return self.operation(self.left.eval(actor), self.right.eval(actor))


class NumRelationship(Node):
    """Evaluate a relationship between two numbers to True or False."""
    def __init__(self, left, relation, right):
        self.left = left
        self.right = right
        self.relation = FUNC_MAP[relation]

    def eval(self, actor):
        return self.relation(self.left.eval(actor), self.left.eval(actor))


class UnaryNumOperation(Node):
    """Unary operation on a number (such as negating) """
    def __init__(self, operation, operand):
        self.operation = operation
        self.operand = operand

    def eval(self, actor):
        if self.operation == '+':
            return abs(self.operand.eval(actor))
        elif self.operation == '-':
            return -(self.operand.eval(actor))


class BinaryBoolOperation(Node):
    """Evaluate a boolean statement to True or False"""
    def __init__(self, left, operation, right):
        self.left = left
        self.operation = FUNC_MAP[operation]
        self.right = right

    def eval(self, actor):
        return self.operation(self.left.eval(actor), self.right.eval(actor))


class UnaryBoolOperation(Node):
    """Not or other unary boolean operators (are there others)?"""
    def __init__(self, operation, operand):
        self.operation = operation
        self.operand = operand

    def eval(self, actor):
        if self.operation == 'not':
            return not self.operand.eval(actor)
