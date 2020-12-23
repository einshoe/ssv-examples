import os
import argparse
import streamlit as st
import time
import numpy as np

from astropy.table import QTable
import astropy.units as u
import numpy as np
import pandas as pd
import altair as alt
# for rendering plots
from vega import VegaLite
from json import loads

from pathlib import Path
from specutils import SpectrumList
from specutils.manipulation import box_smooth, gaussian_smooth, trapezoid_smooth, median_smooth

import sys
from ssv.plugin_collection import PluginCollection
from ssv.viewer import read_spectra_file_simple, read_template_file, \
                            SimpleSpectrum, SimpleSpectralLines, SimpleSpectrumViewer
from ssv import utils
import ssv

st.beta_set_page_config(layout='wide')

templatedir = Path('../MarzV2/examples/')
TEMPLATE_FILENAME = 'MarzTemplates.json'

@st.cache
def fit_template_and_redshift(spectrum_file):
    my_plugins = PluginCollection('plugins')
    return my_plugins.apply_reduce_on_plugin("MarzCLI", spectrum_file)

def transform_function_array(scaled=False, scaling_max=1, processed=False, subtract_continuum=False, smoothing_function=None, smoothing_width=5):
    array = []
    if scaled:
        array.append(utils.apply_scaling(scaling_max))
    if processed:
        array.append(utils.remove_spurious_points)
    if subtract_continuum:
        array.append(utils.subtract_continuum)
    if smoothing_function:
        array.append(utils.apply_smoothing(smoothing_function, smoothing_width))
    return array

def main():
    args = parse_args(sys.argv[1:])
    print("fits file to use {}".format(args.input))
    spectrum_filename = os.path.basename(args.input)
    spectrum_file = args.input
    formats = ssv.loaders.whatformat(spectrum_file)
    if len(formats) > 1:
        ssv.loaders.unregister(formats[0])
    spectrum_data = read_spectra_file_simple(spectrum_file)
    ssv.loaders.restore_registered_loaders()
    template_data = read_template_file(templatedir / TEMPLATE_FILENAME)

    # best_fit_redshift, best_fit_template = fit_template_and_redshift(str(spectrum_file))

    template_list = [template.meta['purpose'] for template in template_data]
    best_fit_redshift = 0
    best_fit_template = template_list[0]
    best_fit_template_index = template_list.index(best_fit_template)

    smoothing_function_list = [box_smooth, gaussian_smooth, trapezoid_smooth, median_smooth]

    ##### Streamlit Layout #####

    st.sidebar.write(spectrum_filename)
    show_sky = st.sidebar.checkbox("Show Sky", True, key=1)
    show_templates = st.sidebar.checkbox("Show Templates", True, key=2)
    show_variance = st.sidebar.checkbox("Show Variance", False, key=3)
    show_processed_data = st.sidebar.checkbox("Process Data", True, key=5)
    show_continuum_subtracted = st.sidebar.checkbox("Subtract Continuum", False, key=6)

    top_controls = st.beta_container()

    chart_container = st.beta_container()

    # lower_controls = st.beta_container()
    lower_controls = st.beta_columns(2)
    template_choice = lower_controls[0].selectbox("Template", template_list, index=best_fit_template_index)
    smoothing_choice = lower_controls[0].selectbox("Smoothing Function", smoothing_function_list, format_func=lambda x: x.__name__, index=0)
    smoothing_width = lower_controls[0].slider("Smoothing Width", min_value=1, max_value=51, step=2, value=7)
    show_scaled_spectra = lower_controls[1].checkbox("Scale Spectra", True, key=4)
    scaling_maximum = lower_controls[1].text_input("Scaling Maximum Value", value=1.0) # This should be replaced with a number_input
    scaling_max = float(scaling_maximum)                                               # but currently it doesn't seem to save value between runs

    # Streamlit widgets automatically run the script from top to bottom. Since
    # this button is not connected to any other logic, it just causes a plain
    # rerun.
    st.button("Re-run")


    ##### Main Code #####


    spectrum = SimpleSpectrum('Test SSV', spectrum_data)
    spectrum.set_visible_traces('reduced')
    flux_range = spectrum.flux_range('reduced')
    spectrum.set_variance_visible('reduced', show_variance)
    spectrum.set_trace_visible('sky', show_sky)
    spectrum.set_transform_functions('reduced', transform_function_array(scaled=show_scaled_spectra, scaling_max=scaling_max, processed=show_processed_data, subtract_continuum=show_continuum_subtracted, smoothing_function=smoothing_choice, smoothing_width=smoothing_width))
    spectrum.set_transform_functions('sky', transform_function_array(scaled=show_scaled_spectra, scaling_max=scaling_max, smoothing_function=smoothing_choice, smoothing_width=smoothing_width))

    # spectrum2 = SimpleSpectrum('Test SSV 2', spectrum_data)
    # spectrum2.set_visible_traces('sky')
    # spectrum2.offset_flux(-100, 'sky')

    lines = SimpleSpectralLines()
    lines.redshift_wavelength(best_fit_redshift)

    templates = SimpleSpectrum('Templates', template_data)
    templates.set_visible_traces(template_choice)
    templates.set_trace_visible(template_choice, show_templates)
    templates.redshift_wavelength(best_fit_redshift, best_fit_template)
    templates.set_transform_functions(template_choice, transform_function_array(scaled=show_scaled_spectra, scaling_max=scaling_max, processed=show_processed_data, subtract_continuum=show_continuum_subtracted, smoothing_function=smoothing_choice, smoothing_width=smoothing_width))

    viewer = SimpleSpectrumViewer('Simple')
    viewer.add_spectrum(spectrum)
    viewer.add_spectrum(templates)
    viewer.add_lines(lines)
    viewer.show_grid(True)
    viewer.show_legend(True)
    viewer.set_chart_width_height(height=500)

    chart_container.altair_chart(viewer.build_chart(), use_container_width=True)

def parse_args(args):
    parser = argparse.ArgumentParser()
    #
    # ... configure command line arguments ...
    #
    parser.add_argument('--input', default=Path('../../tests/data/quasarLinearSkyAirNoHelio.fits'), dest='input',
                    help='input fits file')
    return parser.parse_args(args)

if __name__ == "__main__":
    main()