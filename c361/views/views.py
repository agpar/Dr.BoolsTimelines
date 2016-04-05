from rest_framework.decorators import api_view
from django.shortcuts import render
from django.http import HttpResponseRedirect

@api_view(('GET',))
def home(request):
    return render(request, 'base/home.html')

@api_view(('GET',))
def simulation(request):
    if not request.user.is_authenticated():
        return HttpResponseRedirect("/login")
    return render(request, 'simulation/simulation.html')

@api_view(('GET',))
def syntaxHelp(request):
	return render(request, 'simulation/syntaxHelp.html')
