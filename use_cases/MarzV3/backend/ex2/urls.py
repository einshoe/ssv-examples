"""ex2 URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# backend/urls.py

from django.contrib import admin
from django.urls import path, include                 # add this
from rest_framework import routers                    # add this
from todo import views as viewsTODO                           # add this
from marzv2 import views as viewsMARZV2                            # add this

router = routers.DefaultRouter()                      # add this
router.register(r'todos', viewsTODO.TodoView, 'todo')     # add this
router.register(r'marzfits', viewsMARZV2.FitsFilesView, 'marzfits')     # add this
router.register(r'marzjson', viewsMARZV2.JsonFilesView, 'marzjson')     # add this

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),                # add this
    path('fitslist/', viewsMARZV2.jsonFitsFileList, name='jsonFitsFileList'),
    path('vega/<int:fits_id>/', viewsMARZV2.vegaFitsFile, name='vegaFitsFile'),
    path('json/<int:fits_id>/', viewsMARZV2.jsonFitsFile, name='jsonFitsFile')
]