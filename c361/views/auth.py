from rest_framework.views import APIView
from django.contrib.auth.views import logout
from django.contrib.auth import authenticate, login
from django.shortcuts import redirect, render
from django.views.generic.base import View
from django.contrib.auth.forms import AuthenticationForm
from c361.forms.user import UserForm
from django.http import HttpResponseRedirect


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


def UserLogout(request):
    """
    Logs out the current user.
    """
    logout(request)
    next = request.GET.get('next', None)
    if next:
        return redirect(next)
    else:
        return redirect('/')


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
                return HttpResponseRedirect("/")
            else:
                return render(request, "auth/register.html", {'form': form})