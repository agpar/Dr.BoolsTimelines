import re
from django.http import HttpResponseRedirect
from rest_framework.status import HTTP_201_CREATED, HTTP_202_ACCEPTED
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from django.apps import apps

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

    def post(self, request, *args, **kwargs):
        inpt = request.POST
        d = {
            'title': inpt['title'],
            'behaviour_script': inpt['behaviour_script'],
            'creator': request.user
        }
        g = GameActorModel(**d)
        g.save()
        return Response(status=HTTP_201_CREATED)

    def get_queryset(self):
        user = None if self.request.user.is_anonymous() else self.request.user
        Qlist = []

        Qlist.append(Q(copy_of=None))
        creator = self.request.GET.get('creator')
        if creator:
            Qlist.append(Q(creator__username=creator))

        startswith = self.request.GET.get('startswith')
        if startswith:
            Qlist.append(Q(title__istartswith=startswith))

        if Qlist:
            return GameActorModel.objects.filter(*Qlist)
        else:
            return GameActorModel.objects.all()


class ActorDetail(BaseDetailView):
    """View for detail of specific actor."""
    model = GameActorModel
    serializer_class = GameActorFullSerializer

    def patch(self, request, *args, **kwargs):
        changes = request.POST
        act = super().get_object()
        act.title = changes['title']
        act.behaviour_script = changes['behaviour_script']
        act.save()
        return Response(status=HTTP_202_ACCEPTED)


class ScriptSyntaxChecker(APIView):

    def post(self, request, *args, **kwargs):
        aiscript = request.POST['script']
        lines = aiscript.split("\n")

        aiscript = "\n".join(lines)
        # Check for flagrant syntax errors.
        try:
            res = PARSER.parse(aiscript)

            game = GameInstance()
            actor = Actor(x=1, y=1, script=aiscript)
            game.add_actor(actor)
            for rule in actor.behaviours.rules:
                rule.eval(actor)
                for action in rule.actions:
                    action.eval(actor)

        # Our custom written functions throw a SyntaxError when things go bad.
        except SyntaxError as e:
            if "Line: " in str(e):
                return Response({"error":  str(e)})
            else:
                return Response({'error': "Unknown error! '{}'".format(e)})

        # Our parser library throws unspecified Exceptions :/
        except Exception as e:
            badsyntax = re.findall("'([^']*)'", str(e))
            if not badsyntax:
                return Response({'error': "Unknown error! '{}'".format(e)})
            else:
                badsyntax = badsyntax[0]

            for i, l in enumerate(lines):
                if badsyntax in l:
                    break
            return Response({"error":  "Line {}: Syntax error: '{}'".format(i+1, badsyntax)})

        return Response({"error": None})
