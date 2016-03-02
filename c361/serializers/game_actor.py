from rest_framework import serializers
from c361.models import GameActor


class GameActorFullSerializer(serializers.HyperlinkedModelSerializer):

    class Meta:
        model = GameActor
