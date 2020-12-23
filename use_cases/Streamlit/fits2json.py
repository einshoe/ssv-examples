import sys
import argparse
import json

from json import loads

from ssv import read_spectra_file, read_spectra_file_simple, SimpleSpectrum
from ssv import utils
  
def parse_args():
    parser = argparse.ArgumentParser()
    #
    # ... configure command line arguments ...
    #
    parser.add_argument('--input', dest='input',
                    help='input fits file')
    return parser.parse_args()

def main():
    args = parse_args()
    toJSON(args)

def toJSON(args):

    spectrum_file = args.input
    spectrum_data = read_spectra_file_simple(spectrum_file)
    spectrum = SimpleSpectrum('fits2JSON', spectrum_data)
    asjson = utils.toMarzJSON(spectrum)
    #print(json.dumps(asjson, indent=2), flush=True)
    #json.dump(asjson, sys.stdout)
    #time.sleep(10)

if __name__ == "__main__":
    main()
