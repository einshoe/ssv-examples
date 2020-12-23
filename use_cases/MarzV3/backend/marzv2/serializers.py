# todo/serializers.py

from rest_framework import serializers
from .models import FitsFiles
from .models import JsonFiles

class FitsFilesSerializer(serializers.ModelSerializer):
  class Meta:
    model = FitsFiles
    fields = ('id', 'filepath', 'published_date', 'config', 'survey', 'redshift')

class JsonFilesSerializer(serializers.ModelSerializer):
  class Meta:
    model = JsonFiles
    fields = ('id', 'filepath', 'published_date', 'survey', 'redshift')

    