from django.http import HttpResponseRedirect

from c361.models import GameActorModel
from c361.serializers.game_actor import GameActorFullSerializer
from c361.views.main import BaseListCreateView, BaseDetailView


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
