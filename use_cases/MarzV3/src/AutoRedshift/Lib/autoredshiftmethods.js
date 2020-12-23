/**
 * @description Auto Redshift algorithm
 * @module AutoRedshift
 */
import {globalConfig} from "../../Lib/config";
import FFT from "./dsp/FFT";
import {
    defaultFor,
    rollingPointMean,
    taperSpectra,
    medianAndBoxcarSmooth,
    addMinMultiple,
    divideByError,
    normalise,
    convertLambdaToLogLambda,
    smoothAndSubtract,
    adjustError,
    extractResults
} from "../../Utils/methods";
import {adjustRedshift} from "../../Utils/dsp";

export function getFit(template, xcor, val, helio, cmb) {
    const fitWindow = globalConfig.fitWindow;
    const startIndex = binarySearch(template.zs, val)[0] - Math.floor(fitWindow / 2);
    let bestPeak = -9e9;
    let bestIndex = -1;
    for (let i = 0; i < fitWindow; i++) {
        const index = startIndex + i;
        if (index >= 0 && index < xcor.length) {
            if (Math.abs(xcor[index]) > bestPeak) {
                bestPeak = Math.abs(xcor[index]);
                bestIndex = index;
            }
        }
    }
    return adjustRedshift(getRedshiftForNonIntegerIndex(template, fitAroundIndex(xcor, bestIndex)), helio, cmb);
}

/**
 * Determines the cross correlation (and peaks in it) between a spectra and a template
 *
 * @param templates An array of template data structures from the template manager. Will contain a pre-transformed
 * template spectrum (this is why initialising TemplateManager is so slow).
 * @param fft the Fourier transformed spectra
 * @returns {{id: String, zs: Array, xcor: Array, peaks: Array}} a data structure containing the id of the template, the redshifts of the template, the xcor
 * results of the template and a list of peaks in the xcor array.
 */
export function matchTemplate(templates, fft) {
    console.log("match template");
    const finals = templates.map(function (template) {
        const fftNew = fft.multiply(template.fft);
        const final = fftNew.inverse();
        return final
    });


    return extractResults(templates, finals)
}

export function getQuasarFFT(lambda, intensity, variance) {
    let quasarIntensity = intensity.slice();
    let quasarVariance = variance.slice();
    quasarIntensity = rollingPointMean(quasarIntensity, globalConfig.rollingPointWindow, globalConfig.rollingPointDecay);
    taperSpectra(quasarIntensity);
    quasarVariance = medianAndBoxcarSmooth(quasarVariance, globalConfig.quasarVarianceMedian, globalConfig.quasarVarianceBoxcar);
    addMinMultiple(quasarVariance, globalConfig.quasarMinMultiple);
    divideByError(quasarIntensity, quasarVariance);
    taperSpectra(quasarIntensity);
    normalise(quasarIntensity);
    const quasarResult = convertLambdaToLogLambda(lambda, quasarIntensity, globalConfig.arraySize, true);
    quasarIntensity = quasarResult.intensity;
    const quasarFFT = new FFT(quasarIntensity.length, quasarIntensity.length);
    quasarFFT.forward(quasarIntensity);
    return quasarFFT;
}

export function getStandardFFT(lambda, intensity, variance, needSubtracted) {
    needSubtracted = defaultFor(needSubtracted, false);
    intensity = intensity.slice();
    variance = variance.slice();
    taperSpectra(intensity);
    smoothAndSubtract(intensity);
    let subtracted;
    if (needSubtracted) {
        subtracted = intensity.slice();
    }
    adjustError(variance);
    divideByError(intensity, variance);
    taperSpectra(intensity);
    normalise(intensity);

    // This rebins (oversampling massively) into an equispaced log array. To change the size and range of
    // this array, have a look at the config.js file.
    const result = convertLambdaToLogLambda(lambda, intensity, globalConfig.arraySize, false);
    intensity = result.intensity;

    // Fourier transform both the intensity and quasarIntensity variables
    const fft = new FFT(intensity.length, intensity.length);
    fft.forward(intensity);

    if (needSubtracted) {
        return [fft, subtracted];
    } else {
        return fft;
    }
}