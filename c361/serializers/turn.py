from rest_framework import serializers
from c361.models import TurnModel


class TurnFullSerializer(serializers.ModelSerializer):

    class Meta:
        model = TurnModel
        fields = ("number", "delta_dump")