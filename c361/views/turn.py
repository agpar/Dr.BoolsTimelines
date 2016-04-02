from rest_framework.response import Response
from c361.models import TurnModel, GameInstanceModel
from c361.serializers.turn import TurnFullSerializer
from c361.views.main import BaseListCreateView, BaseDetailView
from rest_framework import status
from rest_framework.exceptions import ValidationError


class TurnList(BaseListCreateView):
    """View for list of Turns"""
    model = TurnModel
    serializer_class = TurnFullSerializer

    def get_queryset(self):
        game_pk = self.kwargs.get('pk')

        if not game_pk:
            raise ValidationError({"error": "GAME NOT FOUND", "message": "No game with that pk exists."})

        game_instance = GameInstanceModel.objects.get(pk=game_pk)
        first = int(self.request.GET.get('first'))
        last = int(self.request.GET.get('last'))
        is_host = True if self.request.user == game_instance.creator else False

        # Raise error if requesting new turns but game not running.
        if last > game_instance.current_turn and not game_instance.is_active():
            raise ValidationError({"error": "GAME NOT RUNNING",
                                   "message": "You can not request new turns from a game that is not running"})

        # Raise error if requesting new turns but not host.
        elif last > game_instance.current_turn and not is_host:
            raise ValidationError({"error": "SPECTATOR TURN REQUEST",
                                   "message": "Spectators may not request new turns from a game instance",
                                   "latest_turn": game_instance.current_turn})

        # Calculate new turns if necessary.
        elif last > game_instance.current_turn:
            actor_proxy = game_instance.get_pactor_proxy()
            future = actor_proxy.do_turn(last)
            result = future.get()
            if isinstance(result, dict) and result.get("error"):
                raise ValidationError(result)

        # Return queryset of the requested turns.
        if first > last:
            qs = game_instance.turns.filter(number__gte=last, number__lte=first)
            qs = qs.extra(order_by=['-number'])
        else:
            qs = game_instance.turns.filter(number__gte=first, number__lte=last)

        return qs

