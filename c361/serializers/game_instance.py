from rest_framework import serializers
from c361.models import GameInstanceModel


class GameInstanceFullSerializer(serializers.HyperlinkedModelSerializer):

    class Meta:
        model = GameInstanceModel
