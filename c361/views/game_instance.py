from django.http import HttpResponseRedirect, HttpResponse
from rest_framework.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_202_ACCEPTED
from rest_framework.response import Response
from rest_framework import generics
from c361.models import GameInstanceModel, GameActorModel
from c361.serializers.game_instance import GameInstanceFullSerializer
from c361.views.main import BaseListCreateView, BaseDetailView
from rest_framework import status
from django.http import JsonResponse
from django.core.cache import cache
import ujson as json

HOST_ONLY_ACTIONS = {'reset', 'pause', 'resume', 'start', 'stop'}

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


class RunningGameList(generics.ListAPIView):
    model = GameInstanceModel
    serializer_class = GameInstanceFullSerializer

    def get_queryset(self):
        active_games = [game.pk for game in GameInstanceModel.objects.all() if game.is_active()]
        return GameInstanceModel.objects.filter(id__in=active_games)


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
        if (HOST_ONLY_ACTIONS.intersection(set(request.GET.keys())) and
                request.user.pk != game_instance.creator.pk):
            return JsonResponse({"error": "SPECTATOR ACTION NOT ALLOWED",
                                 "message": "Only host may perform this action."})

        if request.GET.get('start'):
            if not game_instance.is_active():
                game_instance.start()
                return JsonResponse({"result": "Pykka actor created."})
            else:
                return JsonResponse({"result": "Pykka actor already exists."}, status=status.HTTP_400_BAD_REQUEST)
        if request.GET.get('stop'):
            if game_instance.is_active():
                on_turn = request.GET.get('on_turn')
                game_proxy = game_instance.get_pactor_proxy()
                game_proxy.rewind_to(int(on_turn)).get()
                game_instance.stop()
                return JsonResponse({"result": "Pykaa actor stopped."})
            else:
                return JsonResponse({"result": "Pykaa actor does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        if game_instance.is_active and request.GET:
            future = None
            game_proxy = game_instance.get_pactor_proxy()

            if request.GET.get('full_dump'):
                future = game_proxy.full_dump()
            if request.GET.get('light_dump'):
                future = game_proxy.light_dump()
            if request.GET.get('reset'):
                future = game_proxy.reset_game()
            if request.GET.get('pause'):
                on_turn = request.GET.get('on_turn')
                future = game_proxy.pause(int(on_turn))
            if request.GET.get('resume'):
                future = game_proxy.resume()

            if not future:
                return JsonResponse({"error": "Unknown/missing query paraemters."}, content_type='application/json')

            res = future.get()
            return JsonResponse(res, content_type='application/json')

        return super().get(self, request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        changes = request.POST
        game = self.get_object()
        game_proxy = game.get_pactor_proxy() if game.is_active() else None

        if changes['type'] == 'actor':
            if changes['action'] == 'add':
                copy_act = GameActorModel.objects.get(id=int(changes['id'])).deep_copy()
                coords = changes.get('coords')
                if coords:
                    coords = coords['x'], coords['y']
                    copy_act.x_coord, copy_act.y_coord = coords
                copy_act.save()

                if game_proxy:
                    future = game_proxy.add_actor(copy_act)
                    future.get()

                game.actors.add(copy_act)
                game.save()
            if changes['action'] == 'remove':
                act = GameActorModel.objects.get(id=int(changes['id']))

                if game_proxy():
                    future = game_proxy.remove_actor(act)
                    future.get()

                act.delete()

        return Response(status=HTTP_202_ACCEPTED)
