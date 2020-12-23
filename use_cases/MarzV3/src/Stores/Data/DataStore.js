import {DataActionTypes, setFitsFilename} from "./Actions";
import {setMerge} from "../UI/Actions";
import FitsFileLoader from "../../Lib/FitsFileLoaderV2";
import SpectrumConsumer from '../../Lib/SpectrumConsumer';
import SpectrumJSONProvider from '../../Lib/SpectrumJSONProvider';
import ResultsManager from "../../Lib/ResultsManager";
import Processor from "../../Lib/Processor";
import axios from "axios";

import { globalConfig } from '../../Lib/config';

//import { Stats } from "fs";

class DataStore {
    constructor(store) {
        this.store = store;
    }

    key() {
        return 'data';
    }

    getInitialState() {
        const state = {
            fits: [],
            json: [],
            types: [],
            fitsFileName: null,
            spectra: [],
            spectraHash: {},
            history: [],

            numDrag: 0,
            loaded: false
        };

        // todo: Refactor to top level store
        state.resultsManager = new ResultsManager(this.store);
        state.processorService = new Processor(this.store, state.resultsManager);
        state.fitsFileLoader = new FitsFileLoader(state.processorService, state.resultsManager);

        //state.fitsFileLoader.subscribeToInput(s => state.processorService.spectraManager.setSpectra(s));
        //state.fitsFileLoader.subscribeToInput(spectraList => state.processorService.addSpectraListToQueue(spectraList));

        state.consumer = new SpectrumConsumer(state.processorService, state.resultsManager);
        state.consumer.subscribeToInput(s => state.processorService.spectraManager.setSpectra(s));
        state.consumer.subscribeToInput(spectraList => state.processorService.addSpectraListToQueue(spectraList));

        return state;
    }
    addURLs(oldState, urls) {
        // Copy the state
        const state = {
            ...oldState
        };
        files = []
        files.push({name: urls})

        if (files.length === 3) {
            console.log("SPECIAL CASE FILES.LENGTH===3");
            let numRes = 0;
            const res = [];
            let numFits = 0;
            let fits = null;
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                if (f.name.endsWith('.mz')) {
                    numRes++;
                    res.push(f);
                } else if (f.name.endsWith('.fits')) {
                    numFits++;
                    fits = f;
                }
            }
            if (numRes === 2 && numFits === 1) {
                mergeService.loadMerge(fits, res);
                return;
            }
        }

        setTimeout(() => setMerge(false), 0);

        const lastNumDrag = state.numDrag;
        const lastFitsLength = state.fits.length;
        const lastJSONLength = state.json.length;

        for (let i = 0; i < files.length; i++) {
            if (!files[i].name.endsWith('fits') && !files[i].name.endsWith('fit') && !files[i].name.endsWith('json')) {
                resultsLoaderService.loadResults(files[i]);
            }
        }
        let firstfits = true;
        let firstjson = true;
        for (let i = 0; i < files.length; i++) {
            if (files[i].name.endsWith('fits') || files[i].name.endsWith('fit')) {
                state.numDrag++;
                if (firstfits) {
                    firstfits = false;
                    state.fits.length = 0;
                }
                state.fits.push(files[i]);
            } else if (files[i].name.endsWith('json')) {
                state.numDrag++;
                if (firstjson) {
                    firstjson = false;
                    state.json.length = 0;
                }
                state.json.push(files[i]);
            }
        }

        if (lastNumDrag !== state.numDrag || lastFitsLength !== state.fits.length) {
            if (state.fits.length > 0) {
                console.log("RS: DataStore drop FITS");

                // Get the fits file to load (We don't handle multiple files)
                const fitsFile = state.fits[0];

                // Handle setting the filename correctly
                let originalFilename = null;
                if (fitsFile.actualName != null) {
                    originalFilename = fitsFile.actualName.replace(/\.[^/.]+$/, "");
                } else {
                    originalFilename = fitsFile.name.replace(/\.[^/.]+$/, "");
                }
                setTimeout(() => setFitsFilename(originalFilename.replace(/_/g, " ")), 0);

                state.fitsFileLoader.setFiledata(fitsFile.name, fitsFile);
                //state.fitsFileLoader.loadInFitsFile(state.fits[0]).then(function() { console.log('Fits file loaded');});
                state.consumer.consume(state.fitsFileLoader, state.processorService.spectraManager).then(function (spectraList) {
                    console.log("ok...FITS");
                });
            }
        }
        if (lastNumDrag !== state.numDrag || lastJSONLength !== state.json.length) {
            if (state.json.length > 0) {
                console.log("RS: DataStore drop JSON " + state.json[0]);

                // FIXME: Filename for json files. Should this come from the real file name, or should it be an attribute
                // FIXME: of the json object?

                let reader = new FileReader();

                // Closure to capture the file information.
                reader.onload = (function (theFile) {
                    return function (e) {
                        const spectrumprovider = new SpectrumJSONProvider();
                        spectrumprovider.fromJSON(JSON.parse(e.target.result));
                        state.resultsManager.setHelio(spectrumprovider.getDoHelio());
                        state.resultsManager.setCMB(spectrumprovider.getDoCMB());
                        state.consumer.consume(spectrumprovider, state.processorService.spectraManager).then(function (spectraList) {
                            console.log("ok...JSON");
                        });
                    };
                })(state.json[0]);

                reader.readAsText(state.json[0]);

            }
        }


        return state;
    }

    addFiles(oldState, files) {
        // Copy the state
        const state = {
            ...oldState
        };
        if (files.length === 3) {
            console.log("SPECIAL CASE FILES.LENGTH===3");
            let numRes = 0;
            const res = [];
            let numFits = 0;
            let fits = null;
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                if (f.name.endsWith('.mz')) {
                    numRes++;
                    res.push(f);
                } else if (f.name.endsWith('.fits')) {
                    numFits++;
                    fits = f;
                }
            }
            if (numRes === 2 && numFits === 1) {
                mergeService.loadMerge(fits, res);
                return;
            }
        }

        setTimeout(() => setMerge(false), 0);

        const lastNumDrag = state.numDrag;
        const lastFitsLength = state.fits.length;
        const lastJSONLength = state.json.length;

        for (let i = 0; i < files.length; i++) {
            if (!files[i].name.endsWith('fits') && !files[i].name.endsWith('fit') && !files[i].name.endsWith('json')) {
                resultsLoaderService.loadResults(files[i]);
            }
        }
        let firstfits = true;
        let firstjson = true;
        for (let i = 0; i < files.length; i++) {
            if (files[i].name.endsWith('fits') || files[i].name.endsWith('fit')) {
                state.numDrag++;
                if (firstfits) {
                    firstfits = false;
                    state.fits.length = 0;
                }
                state.fits.push(files[i]);
            } else if (files[i].name.endsWith('json')) {
                state.numDrag++;
                if (firstjson) {
                    firstjson = false;
                    state.json.length = 0;
                }
                state.json.push(files[i]);
            }
        }

        if (lastNumDrag !== state.numDrag || lastFitsLength !== state.fits.length) {
            if (state.fits.length > 0) {
                if ("isurl" in state.fits[0]) {
                    console.log("RS: DataStore drop FITS URL" + state.fits[0].name);

                    // Get the fits file to load (We don't handle multiple files)
                    const fitsFile = state.fits[0];

                    // Handle setting the filename correctly
                    let originalFilename = fitsFile.name;
                    //if (fitsFile.actualName != null) {
                    //    originalFilename = fitsFile.actualName.replace(/\.[^/.]+$/, "");
                    //} else {
                    //    originalFilename = fitsFile.name.replace(/\.[^/.]+$/, "");
                    //}
                    setTimeout(() => setFitsFilename(originalFilename.replace(/_/g, " ")), 0);

                    state.fitsFileLoader.setFiledata(fitsFile.name, state.fits[0].name);
                    //state.fitsFileLoader.loadInFitsFile(state.fits[0]).then(function() { console.log('Fits file loaded');});
                    state.consumer.consume(state.fitsFileLoader, state.processorService.spectraManager).then(function (spectraList) {
                        console.log("ok...FITS");
                    });
                }
                else {
                    console.log("RS: DataStore drop FITS");

                    // Get the fits file to load (We don't handle multiple files)
                    const fitsFile = state.fits[0];

                    // Handle setting the filename correctly
                    let originalFilename = null;
                    if (fitsFile.actualName != null) {
                        originalFilename = fitsFile.actualName.replace(/\.[^/.]+$/, "");
                    } else {
                        originalFilename = fitsFile.name.replace(/\.[^/.]+$/, "");
                    }
                    setTimeout(() => setFitsFilename(originalFilename.replace(/_/g, " ")), 0);

                    state.fitsFileLoader.setFiledata(fitsFile.name, fitsFile);
                    //state.fitsFileLoader.loadInFitsFile(state.fits[0]).then(function() { console.log('Fits file loaded');});
                    state.consumer.consume(state.fitsFileLoader, state.processorService.spectraManager).then(function (spectraList) {
                        console.log("ok...FITS");
                    });
                }
            }
        }
        if (lastNumDrag !== state.numDrag || lastJSONLength !== state.json.length) {
            if (state.json.length > 0) {
                if ("isurl" in state.json[0]) {
                    console.log("RS: DataStore drop JSON URL" + state.json[0].name);

                    //-------------------
                    let reader = new FileReader();
                    fetch(state.json[0].name)
                    .then(res => res.blob()) // Gets the response and returns it as a blob
                    .then(blob => {
                        // Closure to capture the file information.
                        reader.onload = (function (theFile) {
                            return function (e) {
                                const spectrumprovider = new SpectrumJSONProvider();
                                spectrumprovider.fromJSON(JSON.parse(e.target.result));
                                state.resultsManager.setHelio(spectrumprovider.getDoHelio());
                                state.resultsManager.setCMB(spectrumprovider.getDoCMB());
                                state.consumer.consume(spectrumprovider, state.processorService.spectraManager).then(function (spectraList) {
                                    console.log("ok...JSON1");
                                });
                            };
                        })(state.json[0]);

                        reader.readAsText(blob);

                    });
                    //-------------------
                }
                else {
                    console.log("RS: DataStore drop JSON FILE",state.json[0]['path'],state);
                    const ssv = globalConfig.ssv;

                    // FIXME: Filename for json files. Should this come from the real file name, or should it be an attribute
                    // FIXME: of the json object?

                    let reader = new FileReader();

                // Closure to capture the file information.
                console.log("this",this);
                reader.onload = (function (theFile) {
                    return function (e) {
                        const spectrumprovider = new SpectrumJSONProvider();
                        let dict=JSON.parse(e.target.result);
                        console.log("dict",dict);
                        ssv.readJSON(dict,ssv);

                        spectrumprovider.fromJSON(dict);
                        state.resultsManager.setHelio(spectrumprovider.getDoHelio());
                        state.resultsManager.setCMB(spectrumprovider.getDoCMB());
                        state.consumer.consume(spectrumprovider, state.processorService.spectraManager).then(function (spectraList) {
                            console.log("ok...JSON");
                        });

                        
                    };
                })(state.json[0]);

                reader.readAsText(state.json[0]);
                }

            }
        }


        return state;
    }
    addJson(state, id) {
        console.log("Adding json now");
        axios
        .get(`http://localhost:8000/json/`+id+`/`)
        .then(res => {
            console.log("data",res.data);
            const ssv = globalConfig.ssv;
            ssv.readJSON(res.data,ssv);

            const spectrumprovider = new SpectrumJSONProvider();
            spectrumprovider.fromJSON(res.data);
            console.log("spectrum provider",spectrumprovider);
            state.resultsManager.setHelio(spectrumprovider.getDoHelio());
            state.resultsManager.setCMB(spectrumprovider.getDoCMB());
            state.consumer.consume(spectrumprovider, state.processorService.spectraManager).then(function (spectraList) {
                console.log("ok...JSON");
            });
            state.loaded = true;
        });
        return state;
    }

    jsonFitsFileList(state) {
        console.log("JSON FITS FILE")
        axios
        .get(`http://localhost:8000/fitslist/`)
        .then(res => {
            console.log("data",res.data);
            globalConfig.available = res.data;
        });
        return state;
    }

    reduce(state, action) {
        switch (action.type) {
            case DataActionTypes.ADD_FILES:
                return this.addFiles(state, action.files);

            case DataActionTypes.SET_FITS_FILENAME:
                state.fitsFileName = action.filename;
                return {
                    ...state
                };

            case DataActionTypes.SET_TYPES:
                state.types = action.types;
                return {
                    ...state
                };

            case DataActionTypes.ADD_JSON:
                return this.addJson(state, action.id);

            case DataActionTypes.GET_FITSFILELIST:
                return this.jsonFitsFileList(state);
    

            default:
                return state;
        }
    }
}

export default DataStore;