from rest_framework import serializers
from c361.models import GameInstanceModel
from c361.serializers.user import UserSerializer


class GameInstanceFullSerializer(serializers.ModelSerializer):
    creator = UserSerializer()

    class Meta:
        model = GameInstanceModel
        fields = ('id', 'title', 'uuid', 'current_turn', 'creator', 'actors')
