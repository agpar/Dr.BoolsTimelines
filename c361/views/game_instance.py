from django.http import HttpResponseRedirect

from c361.models import GameInstance
from c361.serializers.game_instance import GameInstanceFullSerializer
from c361.views.main import BaseListCreateView, BaseDetailView


class MyGameList(BaseDetailView):
    """Redirect to the GameList with appropriate query parameter."""
    model = GameInstance
    serializer_class = GameInstanceFullSerializer

    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            username = request.user.username
            return HttpResponseRedirect("/games/?creator={0}".format(username))
        return HttpResponseRedirect("/login")


class GameList(BaseListCreateView):
    """View for list of Games"""
    model = GameInstance
    serializer_class = GameInstanceFullSerializer


class GameDetail(BaseDetailView):
    """View for detail of specific Game."""
    model = GameInstance
    serializer_class = GameInstanceFullSerializer
