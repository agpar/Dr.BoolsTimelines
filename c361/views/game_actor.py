import re
from django.http import HttpResponseRedirect
from rest_framework.views import APIView
from rest_framework.response import Response

from c361.models import GameActorModel
from c361.serializers.game_actor import GameActorFullSerializer
from c361.views.main import BaseListCreateView, BaseDetailView
from c361.gamelogic.globals import PARSER
from c361.gamelogic.actor import Actor
from c361.gamelogic.game_instance import GameInstance


class MyActorList(BaseDetailView):
    """Redirect to the ActorList with appropriate query parameter."""
    model = GameActorModel
    serializer_class = GameActorFullSerializer

    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            username = request.user.username
            return HttpResponseRedirect("/actors/?creator={0}".format(username))
        return HttpResponseRedirect("/login")


class ActorList(BaseListCreateView):
    """View for list of Actors"""
    model = GameActorModel
    serializer_class = GameActorFullSerializer


class ActorDetail(BaseDetailView):
    """View for detail of specific actor."""
    model = GameActorModel
    serializer_class = GameActorFullSerializer


class ScriptSyntaxChecker(APIView):

    def post(self, request, *args, **kwargs):
        aiscript = request.POST['script']
        lines = aiscript.split("\n")

        # Check for flagrant syntax errors.
        try:
            res = PARSER.parse(aiscript)

            g = GameInstance()
            a = Actor(x=1, y=1, script=aiscript)
            g.add_actor(a)
            for rule in a.behaviours.rules:
                rule.eval(a)
                for action in rule.actions:
                    action.eval(a)

        # Our custom written functions throw a SyntaxError when things go bad.
        except SyntaxError as e:
            badsyntax = re.findall("'([^']*)'", str(e))[0]

            for i, l in enumerate(lines):
                if badsyntax in l:
                    break

            return Response({"error":  "Line {}: {}".format(i+1, e)})
        # Our parser library throws unspecified Exceptions :/
        except Exception as e:
            badsyntax = re.findall("'([^']*)'", str(e))[0]

            for i, l in enumerate(lines):
                if badsyntax in l:
                    break
            return Response({"error":  "Line {}: Syntax error: '{}'".format(i+1, badsyntax)})

        return Response({"error": None})
