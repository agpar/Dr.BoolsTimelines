from rest_framework.response import Response
from c361.models import TurnModel, GameInstanceModel
from c361.serializers.turn import TurnFullSerializer
from c361.views.main import BaseListCreateView, BaseDetailView
from rest_framework import status


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

        if last > game_instance.current_turn_number and not game_instance.is_active():
            return Response("Requested new turns from non-running GameInstance.", status=status.HTTP_400_BAD_REQUEST)
        else:
            game_proxy = game_instance.get_pactor_proxy()
            num_to_do = last - game_instance.current_turn_number
            game_proxy.do_turn(num_to_do)

        qs = game_instance.turns.filter(number__gte=first)
        qs = game_instance.turns.filter(number__lte=last)
        return qs
