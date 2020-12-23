import os
from django.db import models

# Create your models here.
class FitsFiles(models.Model):
    filepath = models.CharField(max_length=256)
    published_date = models.DateTimeField('date published')
    config = models.TextField(null=True)
    survey = models.CharField(max_length=200)
    redshift = models.FloatField()

    def __str__(self):
        return os.path.basename(self.filepath)

class JsonFiles(models.Model):
    filepath = models.CharField(max_length=256)
    published_date = models.DateTimeField('date published')
    survey = models.CharField(max_length=200)
    redshift = models.FloatField()

    def __str__(self):
        return os.path.basename(self.filepath)


class TemplateSpectra(models.Model):
    name = models.CharField(max_length=200)
    redshift = models.FloatField()

    def __str__(self):
        return self.name


class EmissionSpectra(models.Model):
    name = models.CharField(max_length=200)
    wavelength = models.FloatField()
    redshift = models.FloatField()

    def __str__(self):
        return self.name

