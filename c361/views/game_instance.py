from django.http import HttpResponseRedirect
from rest_framework.response import Response
from c361.models import GameInstanceModel
from c361.serializers.game_instance import GameInstanceFullSerializer
from c361.views.main import BaseListCreateView, BaseDetailView
from rest_framework import status


class MyGameList(BaseDetailView):
    """Redirect to the GameList with appropriate query parameter."""
    model = GameInstanceModel
    serializer_class = GameInstanceFullSerializer

    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated():
            username = request.user.username
            return HttpResponseRedirect("/games/?creator={0}".format(username))
        else:
            if request.META['CONTENT_TYPE'] == "application/json":
                return Response(data={"ERROR: You are not logged in."})
            else:
                return HttpResponseRedirect("/login")


class GameList(BaseListCreateView):
    """View for list of Games"""
    model = GameInstanceModel
    serializer_class = GameInstanceFullSerializer


class GameDetail(BaseDetailView):
    """View for detail of specific Game."""
    model = GameInstanceModel
    serializer_class = GameInstanceFullSerializer

    get_args = {"start", "stop", "do_turn"}

    def get(self, request, *args, **kwargs):
        game_instance = self.get_object()
        if request.GET.get('start'):
            if not game_instance.is_active():
                game_instance.start()
                return Response("Pykka actor created.")
            else:
                return Response("Pykka actor already exists.", status=status.HTTP_400_BAD_REQUEST)
        if request.GET.get('stop'):
            if game_instance.is_active():
                game_instance.stop()
                return Response("Pykaa actor stopped.")
            else:
                return Response("Pykaa actor does not exist.", status=status.HTTP_400_BAD_REQUEST)
        if request.GET.get('do_turn'):
            turn_num = request.GET.get('do_turn')
            actor_proxy = game_instance.get_pactor_proxy()
            future = actor_proxy.do_turn(int(turn_num))
            current_turn = future.get()
            return Response("Advanced to turn {}.".format(current_turn))

        return super().get(self, request, *args, **kwargs)
