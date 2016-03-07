from rest_framework import serializers
from c361.models import TurnModel


class TurnFullSerializer(serializers.HyperlinkedModelSerializer):

    class Meta:
        model = TurnModel
