from rest_framework import serializers
from c361.models import GameActorModel


class GameActorFullSerializer(serializers.ModelSerializer):

    class Meta:
        model = GameActorModel
