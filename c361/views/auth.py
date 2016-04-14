from rest_framework.views import APIView
from django.contrib.auth.views import logout
from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import redirect, render
from django.views.generic.base import View
from django.http import HttpResponseRedirect
from c361.forms.user import UserForm
from c361.models import GameActorModel


"""Basic auth views that I grabbed from another project."""

class UserLogin(View):
    form_class = AuthenticationForm
    template_name = 'auth/login.html'

    def get(self, request):
        form = self.form_class()
        return render(request, self.template_name, {'form': form})

    def post(self, request):
        form = self.form_class(data=request.POST)
        if form.is_valid():
            login(request, form.get_user())
            return redirect("/")
        else:
            return render(request, self.template_name, {'form': form})


class UserRegister(APIView):

    def get(self, request, *args, **kwargs):
        if request.user.is_anonymous():
            return render(request, "auth/register.html")

    def post(self, request, *args, **kwargs):
        user = request.user
        if user.is_anonymous():
            form = UserForm(data=request.POST)
            if form.is_valid():
                user = form.save()
                user = authenticate(username=request.POST['username'],
                                    password=request.POST['password1'])
                login(request, user)

                create_example_actor(user)
                return HttpResponseRedirect("/")
            else:
                return render(request, "auth/register.html", {'form': form})

def user_logout(request):
    """
    Logs out the current user.
    """
    logout(request)
    next = request.GET.get('next', None)
    if next:
        return redirect(next)
    else:
        return redirect('/')

def create_example_actor(user):
    """Create some example actors tied to the user's account."""
    suicide_script = """if nearest(WATER) == MY_LOCATION then
do
    walk(NORTH);
done
else
do
    walk(direction(nearest(WATER)));
done
endif"""
    north_sleeper = """if MY_ENERGY < 80 then
do
    sleep();
done
else
do
    walk(NORTH);
done
endif"""
    a1 = GameActorModel(title="Suicide Guy", creator=user, behaviour_script=suicide_script)
    a2 = GameActorModel(title="Sleep Walker", creator=user, behaviour_script=north_sleeper)
    a1.save()
    a2.save()