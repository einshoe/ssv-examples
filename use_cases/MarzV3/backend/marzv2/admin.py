from django.contrib import admin

# Register your models here.
# Register your models here.

from .models import FitsFiles
from .models import JsonFiles
from .models import TemplateSpectra
from .models import EmissionSpectra

admin.site.register(FitsFiles)
admin.site.register(JsonFiles)
admin.site.register(TemplateSpectra)
admin.site.register(EmissionSpectra)