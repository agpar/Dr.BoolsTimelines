from rest_framework.response import Response
from c361.models import TurnModel, GameInstanceModel
from c361.serializers.turn import TurnFullSerializer
from c361.views.main import BaseListCreateView, BaseDetailView
from rest_framework import status
from rest_framework.exceptions import NotAcceptable


class TurnList(BaseListCreateView):
    """View for list of Turns"""
    model = TurnModel
    serializer_class = TurnFullSerializer

    def get_queryset(self):
        game_pk = self.kwargs.get('pk')

        if not game_pk:
            return Response("Game not found.", status=status.HTTP_400_BAD_REQUEST)

        game_instance = GameInstanceModel.objects.get(pk=game_pk)
        first = int(self.request.GET.get('first'))
        last = int(self.request.GET.get('last'))

        # Raise error if requesting new turns but game not running.
        if last > game_instance.current_turn_number and not game_instance.is_active():
            raise NotAcceptable("Requested new turns from non-running GameInstance.")
        # Calculate new turns if necessary.
        elif last > game_instance.current_turn_number:
            actor_proxy = game_instance.get_pactor_proxy()
            future = actor_proxy.do_turn(last)
            result = future.get()

        # Return queryset of the requested turns.
        qs = game_instance.turns.filter(number__gte=first)
        qs = game_instance.turns.filter(number__lte=last)
        return qs

