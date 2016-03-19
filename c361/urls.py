"""c361 URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url


from django.contrib import admin
from c361.views.auth import UserLogin, UserRegister, user_logout
from c361.views.game_actor import ActorList, ActorDetail, MyActorList, ScriptSyntaxChecker
from c361.views.game_instance import GameList, GameDetail, MyGameList
from c361.views.turn import TurnList
from c361.views.user import UserDetail, UserList
from c361.views.views import simulation

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^$', simulation, name="simulation"),
    url(r'^login/', UserLogin.as_view(), name="login"),
    url(r'^logout/', user_logout, name="logout"),
    url(r'^register/', UserRegister.as_view(), name="register"),

    url(r'^actors/$', ActorList.as_view(),
        name="gameactormodel-list", kwargs={'model': "GameActorModel"}),
    url(r'^actors/mine/$', MyActorList.as_view(),
        name="my-gameactormodel-list"),
    url(r'^actor/(?P<pk>[0-9a-z-]+)', ActorDetail.as_view(),
        name='gameactormodel-detail', kwargs={'model': "GameActorModel"}),
    url(r'^syntax-checker/$', ScriptSyntaxChecker.as_view(),
        name="syntax-checker"),

    url(r'^games/$', GameList.as_view(),
        name="gameinstancemodel-list", kwargs={'model': "GameInstanceModel"}),
    url(r'^games/mine/$', MyGameList.as_view(),
        name="my-gameinstancemodel-list"),
    url(r'^game/(?P<pk>[0-9a-z-]+)/$', GameDetail.as_view(),
        name='gameinstancemodel-detail', kwargs={'model': "GameInstanceModel"}),

    url(r'^game/(?P<pk>[0-9a-z-]+)/turns/', TurnList.as_view(),
        name='turnmodel-list', kwargs={'model': "TurnModel"}),

    url(r'^users/$', UserList.as_view(), name='user-list'),
    url(r'^users/(?P<pk>[0-9]+)/$', UserDetail.as_view(), name='user-detail'),

]
