from rest_framework import serializers
from c361.models import GameInstance


class GameInstanceFullSerializer(serializers.HyperlinkedModelSerializer):

    class Meta:
        model = GameInstance
