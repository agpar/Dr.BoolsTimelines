from rest_framework import serializers
from c361.models import TurnModel
import ujson as json


class JSONField(serializers.Field):
    def to_internal_value(self, obj):
        return json.loads(obj)

    def to_representation(self, value):
        return value

class TurnFullSerializer(serializers.ModelSerializer):

    delta_dump = JSONField()
    diff = JSONField()
    
    class Meta:
        model = TurnModel
        fields = ("number", "delta_dump", "diff")

