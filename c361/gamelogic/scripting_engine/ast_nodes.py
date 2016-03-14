from .func_mappings import *
import collections


class Node:
    def eval(self, actor):
        raise NotImplemented


class SymbolAtom(Node):
    """A node which holds a single symbol."""
    def __init__(self, val):
        self.value = val
        if isinstance(val, collections.Hashable):
            self.symb = SYM_MAP.get(val)
            self.func = FUNC_MAP.get(val)

    def __repr__(self):
        return "SymbolAtom({})".format(self.value)

    def eval(self, actor):
        if self.func:
            import pdb
            pdb.set_trace()
            return self.func
        if self.symb:
            return self.symb(actor)
        return self.value

class Function(Node):
    def __init__(self, symbol, arguments):
        self.symbol = symbol
        self.arguments = arguments

    def __repr__(self):
        return "{}({})".format(self.symbol.value, self.arguments)

    def eval(self, actor):
        evaluated_args = [x.eval(actor) for x in self.arguments]
        for i, arg in enumerate(evaluated_args):
            while isinstance(arg, Node):
                arg = arg.eval(actor)
                evaluated_args[i] = arg

        fn = self.symbol.eval(actor)

        return SymbolAtom(fn(actor, *evaluated_args))


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
