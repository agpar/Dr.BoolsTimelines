import pykka
from c361.models.game_instance import GameInstanceModel
from c361.gamelogic.game_instance import GameInstance
from c361.gamelogic.actor import Actor
from django.core.cache import cache


class GameRunner(pykka.ThreadingActor):
    def __init__(self, game_uuid):
        super(GameRunner, self).__init__()
        self.game_uuid = game_uuid
        self.game_model = GameInstanceModel.objects.get(uuid=game_uuid)
        self.game_object = GameInstance()

    def do_turn(self, n=1):
        # Temporary testing code here.
        self.game_model.current_turn_number += n
        self.game_model.save()
        return self.game_model.current_turn_number

    def stop(self):
        cache.delete(str(self.game_uuid))
        super().stop()
