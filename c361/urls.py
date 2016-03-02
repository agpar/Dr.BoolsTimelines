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
from c361.views.views import home
from c361.views.game_actor import ActorList, ActorDetail, MyActorList
from c361.views.user import UserDetail, UserList

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^$', home, name="home"),
    url(r'^login/', UserLogin.as_view(), name="login"),
    url(r'^logout/', user_logout, name="logout"),
    url(r'^register/', UserRegister.as_view(), name="register"),

    url(r'^actors/$', ActorList.as_view(),
        name="gameactor-list", kwargs={'model': "GameActor"}),
    url(r'^actors/mine/$', MyActorList.as_view(),
        name="my-actor-list"),
    url(r'^actor/(?P<pk>[0-9a-z-]+)', ActorDetail.as_view(),
        name='gameactor-detail', kwargs={'model': "GameActor"}),

    url(r'^users/$', UserList.as_view(), name='user-list'),
    url(r'^users/(?P<pk>[0-9]+)/$', UserDetail.as_view(), name='user-detail')
]

