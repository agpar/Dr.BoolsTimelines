
import collections

try:
    from .func_mappings import *
except ImportError:
    from c361.gamelogic.scripting_engine.func_mappings import *

ATTRIBUTES = {'FOOD', 'DEADLY', 'ACTOR', 'WATER', 'PLANT', 'GRASS', 'ROCK'}


class Node:
    def eval(self, actor):
        raise NotImplemented

    def _eval_down(self, actor, val):
        res = val
        while isinstance(res, Node):
            res = res.eval(actor)
        # If the argument is not evaluated down to a value.
        if hasattr(res, '__call__'):
            raise(SyntaxError("Function error: '{}' was improperly called.".format(val.value)))

        return res


class SymbolAtom(Node):
    """A node which holds a single symbol."""
    def __init__(self, val):
        self.value = val
        if isinstance(val, collections.Hashable):
            self.symb = SYM_MAP.get(val)
            self.func = FUNC_MAP.get(val)
        else:
            self.symb = None
            self.func = None

    def __repr__(self):
        return "SymbolAtom({})".format(self.value)

    def eval(self, actor):

        if isinstance(self.value, str) and \
                not (self.symb or self.func or self.value in ATTRIBUTES):
            raise SyntaxError("Unknown symbol: '{}'".format(self.value))

        if self.func:
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
            evaluated_args[i] = self._eval_down(actor, arg)


        fn = self.symbol.eval(actor)
        try:
            return SymbolAtom(fn(actor, *evaluated_args))
        except Exception as e:
            strargs = [str(arg) for arg in evaluated_args]
            raise SyntaxError("Function error: '{}' is not compatible with arguments ({}) ".format(self.symbol.value, ",".join(strargs)))


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
        eleft = self._eval_down(actor, self.left)
        eright = self._eval_down(actor, self.right)

        try:
            return self.operation(eleft, eright)
        except Exception as e:
            raise SyntaxError("Can't operate '{} with {}': ".format(self.left, self.format ))


class NumRelationship(Node):
    """Evaluate a relationship between two numbers to True or False."""
    def __init__(self, left, relation, right):
        self.left = left
        self.right = right
        self.relation = FUNC_MAP[relation]

    def eval(self, actor):
        eleft = self._eval_down(actor, self.left)
        eright = self._eval_down(actor, self.right)
        return self.relation(eleft, eright)


class UnaryNumOperation(Node):
    """Unary operation on a number (such as negating) """
    def __init__(self, operation, operand):
        self.operation = operation
        self.operand = operand

    def eval(self, actor):
        eop = self._eval_down(actor, self.operand)
        if self.operation == '+':
            return abs(eop)
        elif self.operation == '-':
            return -(eop)


class BinaryBoolOperation(Node):
    """Evaluate a boolean statement to True or False"""
    def __init__(self, left, operation, right):
        self.left = left
        self.operation = FUNC_MAP[operation]
        self.right = right

    def eval(self, actor):
        eleft = self._eval_down(actor, self.left)
        eright = self._eval_down(actor, self.right)
        return self.operation(eleft, eright)

class UnaryBoolOperation(Node):
    """Not or other unary boolean operators (are there others)?"""
    def __init__(self, operation, operand):
        self.operation = operation
        self.operand = operand

    def eval(self, actor):
        eop = self._eval_down(actor, self.operand)

        if self.operation == 'not':
            return not eop