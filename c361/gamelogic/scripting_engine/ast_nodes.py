class Assignment(object):
    def __init__(self, symbol, value):
        self.symbol = symbol
        self.value = value


class IfStatementAction(object):
    def __init__(self, condition, actions):
        self.condition = condition
        self.actions = actions


class IfStatementInference(object):
    def __init__(self, condition, inferences):
        self.condition = condition
        self.inferences = inferences


class BinaryNumOperation(object):
    def __init__(self, left, operation, right):
        self.left = left
        self.operation = operation
        self.right = right

class NumRelationship(object):
    def __init__(self, left, relation, right):
        self.left = left
        self.relation = relation
        self.right = right

class UnaryNumOperation(object):
    def __init__(self, operation, operand):
        self.operation = operation
        self.operand = operand


class BinaryBoolOperation(object):
    def __init__(self, left, operation, right):
        self.left = left
        self.operation = operation
        self.right = right


class UnaryBoolOperation(object):
    def __init__(self, operation, operand):
        self.operation = operation
        self.operand = operand
