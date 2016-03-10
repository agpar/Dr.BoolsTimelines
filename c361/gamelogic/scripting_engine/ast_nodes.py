from .func_mappings import *

class Node:
    pass

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
        return self.condition.eval()


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
        self.left_func = SYM_MAP.get(left)
        self.right_func = SYM_MAP.get(right)
        self.relation = FUNC_MAP[relation]

    def eval(self, actor):
        # Check if operands are builtin symbols.
        if self.left_func:
            left = self.left_func(actor)
        else:
            left = self.left
        if self.right_func:
            right = self.right_func(actor)
        else:
            right = self.right

        return self.relation(left, right)


class UnaryNumOperation(Node):
    def __init__(self, operation, operand):
        self.operation = operation
        self.operand = operand


class BinaryBoolOperation(Node):
    def __init__(self, left, operation, right):
        self.left = left
        self.operation = operation
        self.right = right


class UnaryBoolOperation(Node):
    def __init__(self, operation, operand):
        self.operation = operation
        self.operand = operand
