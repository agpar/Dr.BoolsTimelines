from django.http import HttpResponseRedirect, HttpResponse
from rest_framework.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_202_ACCEPTED
from rest_framework.response import Response
from c361.models import GameInstanceModel, GameActorModel
from c361.serializers.game_instance import GameInstanceFullSerializer
from c361.views.main import BaseListCreateView, BaseDetailView
from rest_framework import status
from django.http import JsonResponse
import ujson as json


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

    def post(self, request, *args, **kwargs):
        inpt = request.POST
        d = {
            'title': inpt['title'],
            'creator': request.user
        }
        g = GameInstanceModel(**d)
        g.save()
        return Response(status=HTTP_201_CREATED)


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
                return JsonResponse({"result": "Pykka actor created."})
            else:
                return JsonResponse({"result": "Pykka actor already exists."}, status=status.HTTP_400_BAD_REQUEST)
        if request.GET.get('stop'):
            if game_instance.is_active():
                game_instance.stop()
                return JsonResponse({"result": "Pykaa actor stopped."})
            else:
                return JsonResponse({"result":"Pykaa actor does not exist."}, status=status.HTTP_400_BAD_REQUEST)
        if request.GET.get('do_turn'):
            turn_num = request.GET.get('do_turn')
            actor_proxy = game_instance.get_pactor_proxy()
            future = actor_proxy.do_turn(int(turn_num))
            current_turn = future.get()
            return JsonResponse({"result": "Advanced to turn {}.".format(current_turn)})
        if request.GET.get('full_dump'):
            actor_proxy = game_instance.get_pactor_proxy()
            future = actor_proxy.full_dump()
            full_dump = future.get()
            return HttpResponse(json.dumps(full_dump), content_type='application/json')

        if request.GET.get('light_dump'):
            actor_proxy = game_instance.get_pactor_proxy()
            future = actor_proxy.light_dump()
            full_dump = future.get()
            return HttpResponse(json.dumps(full_dump), content_type='application/json')
        return super().get(self, request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        changes = request.POST
        new_actor_id = changes.get('add-actor')
        if not new_actor_id:
            return Response(data={'error': "Actor does not exist."}, status=HTTP_400_BAD_REQUEST)
        game = self.get_object()
        act = GameActorModel.objects.get(id=int(new_actor_id))
        copy_act = act.deep_copy()
        game.actors.add(copy_act)
        game.save()
        return Response(status=HTTP_202_ACCEPTED)