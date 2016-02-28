from django.http import Http404

from rest_framework.response import Response
from rest_framework import generics
from c361.models import GameActor
from c361.serializers.game_actor import GameActorFullSerializer


class ActorList(generics.ListCreateAPIView):
    model = GameActor
    serializer_class = GameActorFullSerializer
    queryset = GameActor.objects.all()


class ActorDetail(generics.RetrieveDestroyAPIView):
    model = GameActor
    serializer_class = GameActorFullSerializer
    queryset = GameActor.objects.all()

    def get_object(self, pk=None):
        try:
            return GameActor.objects.get(pk=pk)
        except GameActor.DoesNotExist:
            raise Http404

    def get(self, request, *args, **kwargs):
        actor = self.get_object(kwargs.get('pk'))
        serializer = GameActorFullSerializer(actor)
        return Response(serializer.data)