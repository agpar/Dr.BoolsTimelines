from rest_framework import serializers
from c361.models import GameActorModel


class GameActorFullSerializer(serializers.HyperlinkedModelSerializer):

    class Meta:
        model = GameActorModel
