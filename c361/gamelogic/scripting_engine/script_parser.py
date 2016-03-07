import ply.lex as lex
import ply.yacc as yacc
import c361.gamelogic.scripting_engine.ast_nodes as ast
from c361.gamelogic.scripting_engine.behaviour import Behaviour


reserved = {
    'and': 'AND',
    'or': 'OR',
    'if': 'IF',
    'not': 'NOT',
    'then': 'THEN',
    'endif': 'ENDIF',
    'do': 'DO',
    'done': 'DONE',
    'is': 'IS',
    'true': 'TRUE',
    'false': 'FALSE'
}

tokens = list(reserved.values())
tokens = tokens + ['SYMBOL', 'NUMBER', 'LPAREN', 'RPAREN', 'SEMI']
tokens = tokens + ['PLUS', 'MINUS', 'MULT', 'DIVIDE']
tokens = tokens + ['LT', 'LEQT', 'GT', 'GEQT', 'EQ']


t_AND    = r'and'
t_OR     = r'or'
t_NOT    = r'not'
t_IF     = r'if'
t_THEN   = r'then'
t_ENDIF  = r'endif'
t_DO     = r'do'
t_IS     = r'is'
t_TRUE   = r'true'
t_FALSE  = r'false'
t_LPAREN = r'\('
t_RPAREN = r'\)'
t_SEMI   = r';'
t_PLUS   = r'\+'
t_MINUS  = r'-'
t_MULT   = r'\*'
t_DIVIDE = r'/'
t_LT     = r'\<'
t_LEQT   = r'\<='
t_GT     = r'>'
t_GEQT   = r'>='
t_EQ     = r'=='


def t_SYMBOL(t):
    r'[a-z][a-z0-9]*'
    if t.value in reserved:
        t.type = reserved.get(t.value,'SYMBOL')
    return t


def t_NUMBER(t):
    r'\d+'
    t.value = int(t.value)
    return t


def t_newline(t):
    r'\n+'
    t.lexer.lineno += len(t.value)


t_ignore_COMMENT = r'\#.*'
t_ignore = ' \t'


def t_error(t):
    err_info = (t.lexer.lineno, t.lexer.lexpos, t.value[0])
    print("Syntax error at %d, %d, unknown: '%s'" % err_info)
    t.lexer.skip(1)


lexer = lex.lex()



precedence = (
    ('left', 'PLUS', 'MINUS'),
    ('left', 'MULT', 'DIVIDE'),
    ('right', 'UMINUS'),
    ('left', 'AND'),
    ('left', 'OR'),
    ('right', 'NOT')
)


def p_behaviour(p):
    "behaviour : rules"
    p[0] = Behaviour(rules)


def p_rules(p):
    """
    rules : rule rules
          | rule
    """
    if len(p) == 3:
        p[0] = [p[1]] + p[2]
    else:
        p[0] = [p[1]]


def p_rule_actions(p):
    "rule : IF boolexp THEN DO actions DONE ENDIF"
    p[0] = ast.IfStatementAction(p[2],p[5])


def p_rule_inference(p):
    "rule : IF boolexp THEN inferences ENDIF"
    p[0] = ast.IfStatementInference(p[2], p[4])


def p_actions(p):
    """
    actions : SYMBOL SEMI actions
            | SYMBOL SEMI
    """
    if len(p) == 4:
        p[0] = [p[1]] + p[3]
    else:
        p[0] = [p[1]]


def p_inferences(p):
    """
    inferences  : inference SEMI inferences
                | inference SEMI
    """
    if len(p) == 4:
        p[0] = [p[1]] + p[3]
    else:
        p[0] = [p[1]]


def p_inference(p):
    """
    inference : SYMBOL IS boolexp
              | SYMBOL IS numexp
    """
    p[0] = ast.Assignment(p[1], p[3])



def p_numexp_binop(p):
    """
    numexp  : numexp PLUS numexp
            | numexp MINUS numexp
            | numexp MULT numexp
            | numexp DIVIDE numexp
    """
    p[0] = ast.BinaryNumOperation(p[1], p[2], p[3])


def p_numexp_unop(p):
    "numexp : MINUS numexp %prec UMINUS"
    p[0] = ast.UnaryNumOperation(p[1], p[2])


def p_numexp_atom(p):
    """
    numexp  : LPAREN numexp RPAREN
            | NUMBER
            | SYMBOL
    """
    if len(p) == 4:
        p[0] = p[2]
    else:
        p[0] = p[1]


def p_numrel(p):
    """
    numrel : numexp LT numexp
           | numexp LEQT numexp
           | numexp GT numexp
           | numexp GEQT numexp
           | numexp EQ numexp
    """
    p[0] = ast.NumRelationship(p[1], p[2], [3])


def p_boolexp_binop(p):
    """
    boolexp : boolexp AND boolexp
            | boolexp OR boolexp
    """
    p[0] = ast.BinaryBoolOperation(p[1], p[2], p[3])


def p_boolexp_unop(p):
    "boolexp : NOT boolexp"
    p[0] = ast.UnaryBoolOperation(p[1], p[2])


def p_boolexp_atom(p):
    """
    boolexp : LPAREN boolexp RPAREN
            | TRUE
            | FALSE
            | SYMBOL
            | numrel
    """
    if len(p) == 4:
        p[0] = p[2]
    else:
        p[0] = p[1]


def p_error(p):
    err_info = (p.value, p.lineno, p.lexpos)
    print("Syntax error: '%s' at: %d, %d" % err_info)


class AiScriptParser(object):
    def __init__(self, script):
        yacc.yacc()
        self.parse = yacc.parse


#DEMO
if __name__ == "__main__":
    data = """
    if true and true then
      do
        sym1;
        sym2;
      done
    endif

    if true or false and not sym3 then
      sym4 is true;
    endif

    if not sym5 then
      sym6 is -2;
      sym7 is 3;
    endif
    """

    print("\n\n")
    parser = AiScriptParser()
    tree = parser.parse(data)
    for inf in tree:
        print(inf.condition)
        if isinstance(inf, ast.IfStatementAction):
            print(inf.actions)
        else:
            for i in inf.inferences:
                if isinstance(i.value, ast.UnaryNumOperation):
                    print(i.symbol + " is " + i.value.operation + str(i.value.operand))
                else:
                    print(i.symbol + " is " + str(i.value))
