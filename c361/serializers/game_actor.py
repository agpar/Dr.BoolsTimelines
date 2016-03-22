from rest_framework import serializers
from c361.models import GameActorModel


class GameActorFullSerializer(serializers.ModelSerializer):
    in_game = serializers.BooleanField()

    class Meta:
        model = GameActorModel
