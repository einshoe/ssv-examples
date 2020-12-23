import sys
import argparse
import json

from json import loads

import ssv.loaders as loaders
from specutils import Spectrum1D, SpectrumList
from ssv.viewer.SimpleSpectrum import read_spectra_file, read_spectra_file_simple, SimpleSpectrum
from ssv import utils

def str2bool(v):
    if isinstance(v, bool):
       return v
    if v.lower() in ('yes', 'true', 't', 'y', '1'):
        return True
    elif v.lower() in ('no', 'false', 'f', 'n', '0'):
        return False
    else:
        raise argparse.ArgumentTypeError('Boolean value expected.')
  
def parse_args():
    parser = argparse.ArgumentParser()
    #
    # ... configure command line arguments ...
    #
    parser.add_argument('--input', required=True, dest='input',
                    help='input fits file')
    parser.add_argument("-v", type=str2bool, nargs='?',
                        const=True, default=False, dest='verbose',
                        help="verbose")
    return parser.parse_args()

def main():
    args = parse_args()
    toJSON(args)

def toJSON(args):

    spectrum_file = args.input
    try:
        formatguess = loaders.whatformat(spectrum_file)
        spectrum_data = read_spectra_file_simple(spectrum_file)
        print("good {} {}".format(spectrum_file, formatguess))
    except Exception as x:
        print("bad {}".format(spectrum_file))
        if args.verbose:
            print("{} guess={}".format(x, formatguess))
    #spectrum = SimpleSpectrum('fits2JSON', spectrum_data)
    #asjson = utils.toMarzJSON(spectrum)
    #print(json.dumps(asjson, indent=2), flush=True)
    #json.dump(asjson, sys.stdout)
    #time.sleep(10)

if __name__ == "__main__":
    main()
