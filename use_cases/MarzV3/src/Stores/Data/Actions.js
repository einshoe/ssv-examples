// For actions related to ingesting data
import AppDispatcher from "../AppDispatcher";

const DataActionTypes = {
    ADD_FILES: 'DataActionTypes.ADD_FILES',
    SET_FITS_FILENAME: 'DataActionTypes.SET_FITS_FILENAME',
    SET_TYPES: 'DataActionTypes.SET_TYPES',
    ADD_JSON: 'DataActionTypes.ADD_JSON',
    GET_FITSFILELIST: 'DataActionTypes.GET_FITSFILELIST',
};

function addFiles(files) {
    AppDispatcher.dispatch({
        type: DataActionTypes.ADD_FILES,
        files: files
    })
}

function setFitsFilename(filename) {
    console.log("Setting fits file name", filename)
    AppDispatcher.dispatch({
        type: DataActionTypes.SET_FITS_FILENAME,
        filename: filename
    })
}

function setTypes(types) {
    AppDispatcher.dispatch({
        type: DataActionTypes.SET_TYPES,
        types: types
    })
}

function addJson(id) {
    AppDispatcher.dispatch({
        type: DataActionTypes.ADD_JSON,
        id: id
    })
}

function getjsonFitsFileList() {
    console.log("getjsonFitsFileList");
    AppDispatcher.dispatch({
        type: DataActionTypes.GET_FITSFILELIST
    })
}

export {
    addFiles,
    setFitsFilename,
    setTypes,
    addJson,
    getjsonFitsFileList,
    DataActionTypes
};