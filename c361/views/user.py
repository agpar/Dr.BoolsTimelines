from django.contrib.auth.models import User
from rest_framework import generics
from c361.serializers.user import UserSerializer


class UserList(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_queryset(self):
        user = None if self.request.user.is_anonymous() else self.request.user
        notme = self.request.GET.get('notme')
        if notme:
            return User.objects.exclude(username=user.username)
        return User.objects.all()


class UserDetail(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

