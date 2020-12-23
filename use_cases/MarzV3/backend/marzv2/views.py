import json
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework import viewsets          # add this
from .serializers import FitsFilesSerializer      # add this
from .models import FitsFiles                     # add this
from .serializers import JsonFilesSerializer      # add this
from .models import JsonFiles                     # add this


import ssv

from pathlib import Path
from specutils import SpectrumList
from ssv.viewer import read_spectra_file, read_spectra_file_simple, read_template_file, \
                            SimpleSpectrum, SimpleSpectralLines, SimpleSpectrumViewer
from ssv import utils

class FitsFilesView(viewsets.ModelViewSet):       # add this
    serializer_class = FitsFilesSerializer          # add this
    queryset = FitsFiles.objects.all()              # add this

class JsonFilesView(viewsets.ModelViewSet):       # add this
    serializer_class = JsonFilesSerializer          # add this
    queryset = JsonFiles.objects.all()              # add this

def vegaFitsFile(request, fits_id):
    fitsfile = FitsFiles.objects.get(pk=fits_id)
    #
    datadir = Path('../../../')

    templatedir = Path('../../../tests/data/marz/')
    TEMPLATE_FILENAME = 'MarzTemplates.json'

   
    anyFILE = datadir / fitsfile.filepath

    formats = ssv.loaders.whatformat(anyFILE)
    if len(formats) > 1:
        ssv.loaders.unregister(formats[0])

    spectrum_data = read_spectra_file_simple(anyFILE)
    ssv.loaders.restore_registered_loaders()

    template_data = read_template_file(templatedir / TEMPLATE_FILENAME)
    spectrum = SimpleSpectrum('Test SSV', spectrum_data)
    spectrum.set_visible_traces('reduced')

    spectrum2 = SimpleSpectrum('Test SSV 2', spectrum_data)
    spectrum2.set_visible_traces('sky')
    spectrum2.set_transform_functions('sky', [utils.remove_spurious_points])
    spectrum2.offset_flux(-100, 'sky')

    lines = SimpleSpectralLines()

    templates = SimpleSpectrum('Templates', template_data)
    templates.set_visible_traces('Quasar')
    #templates.subtract_continuum()

    viewer = SimpleSpectrumViewer('Simple')
    viewer.add_spectrum(spectrum)
    viewer.add_spectrum(spectrum2)
    #if showTemplates:
    #    viewer.add_spectrum(templates)
    viewer.add_lines(lines)
    viewer.show_grid(True)
    viewer.show_legend(True)
    
    js_data = viewer.build_chart().to_json()
    return JsonResponse(json.loads(js_data), safe=False)

def jsonFitsFile(request, fits_id):
    fitsfile = FitsFiles.objects.get(pk=fits_id)
    #
    datadir = Path('../../../')

    anyFILE = datadir / fitsfile.filepath
    
    formats = ssv.loaders.whatformat(anyFILE)
    if len(formats) > 1:
        ssv.loaders.unregister(formats[0])
    spectrum_data = read_spectra_file_simple(anyFILE)
    ssv.loaders.restore_registered_loaders()
    spectrum = SimpleSpectrum('Test SSV', spectrum_data)
    js_data = utils.toMarzJSON(spectrum)
    return JsonResponse(js_data, safe=False)

def jsonFitsFileList(request):
    allfiles = FitsFiles.objects.all()
    result = {}
    i = 0
    for file in allfiles:
        result[str(i)] = file.filepath
        i += 1
    return JsonResponse(result, safe=False)

