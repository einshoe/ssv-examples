import {
    convertVacuumFromAir,
    convertVacuumFromAirWithLogLambda,
    defaultFor,
    interpolate,
    linearScale, normalise, polyFitReject, smoothAndSubtract, subtractPolyFit, taperSpectra
} from "../../Utils/methods";
import CookieManager from "../../Lib/CookieManager";
import {globalConfig} from "../../Lib/config";
import FFT from "./dsp/FFT";
import { TemplateX } from "../../Lib/templateX";
//import { faWindowRestore } from "@fortawesome/free-solid-svg-icons";
/**
 * class TemplateManager
 */
class TemplateManager {
    /**
     * 
     * @param {Object} process 
     * @param {Boolean} shiftToMatch 
     */
    constructor(process, shiftToMatch) {
        if (typeof process == "undefined") {
            process = true;
        }
        if (typeof shiftToMatch == "undefined") {
            shiftToMatch = false;
        }
        this.shiftToMatch = shiftToMatch;

        this.process = process;
        this.initialised = false;
    }
    initialise() {
        if (!this.initialised) {
            if ("remote_templates" in window.marz_configuration) {
                this.originalTemplates = [];
                this.setOriginalTemplatesFromURL(window.marz_configuration.remote_templates, process, this);
            } else {
                let inbuilt = this.inbuiltTemplates();
                this.setOriginalTemplates(inbuilt);
            }
            this.initialised = true;
        }
    }

    setOriginalTemplates(originalTemplates, doProc) {
        doProc = defaultFor(doProc, true);
        this.originalTemplates = originalTemplates;
        this.processed = false;
        this.templatesHash = {};
        for (let i = 0; i < this.originalTemplates.length; i++) {
            this.templatesHash[this.originalTemplates[i].id] = this.originalTemplates[i];
        }
        this.templateEnabledCookieKey = 'tenabled';
        this.inactiveArray = this.getInactiveTemplatesCookie();
        if (doProc) {
            if (this.process) {
                this.processTemplates();
            }
            if (this.shiftToMatch) {
                this.shiftToMatchSpectra();
            }
        }
        console.log("USE INBUILT TEMPLATES=",this.originalTemplates.length);
    };

    fromJSON(dict, doProc) {
        try {
        this.originalTemplates.length = 0;
        this.processed = false
        this.templatesHash = {}
        if (Array.isArray(dict)) {
            for (let i=0; i < dict.length; i++) {
                const thisTemplate = new TemplateX(i.toString());
                thisTemplate.fromDictionary(dict[i]);
                this.originalTemplates.push(thisTemplate)
            }
        } else {
            const thisTemplate = new TemplateX("json");
            thisTemplate.fromDictionary(dict);
            this.originalTemplates.push(thisTemplate);

        }

        for (let i = 0; i < this.originalTemplates.length; i++) {
            this.templatesHash[this.originalTemplates[i].id] = this.originalTemplates[i];
        }
        this.templateEnabledCookieKey = 'tenabled';
        this.inactiveArray = this.getInactiveTemplatesCookie();
        if (doProc) {
            if (this.process) {
                this.processTemplates();
            }
            if (this.shiftToMatch) {
                this.shiftToMatchSpectra();
            }
        }
        } catch (err) {
            console.log("error "+err);
        }
    }

    setOriginalTemplatesFromURL(url, doProc, manager) {
        console.log("USE CUSTOM TEMPLATES",url);
        doProc = defaultFor(doProc, true);
        //-------------------
        let reader = new FileReader();
        fetch(url)
        .then(res => res.blob()) // Gets the response and returns it as a blob
        .then(blob => {
            reader.onload = (function (theFile) {
                return function (e) {
                    manager.fromJSON(JSON.parse(e.target.result), doProc);
                };
            })(url);
            reader.readAsText(blob);

        });
    }

    updateActiveTemplates() {
        this.templates = [];
        this.inactiveArray = [];
        for (let i = 0; i < this.originalTemplates.length; i++) {
            const t = this.originalTemplates[i];
            if (t.inactive === true) {
                this.inactiveArray.push(t.id);
            } else {
                this.templates.push(t);
            }
        }
        this.saveInactives();
    };

    getInactiveTemplates() {
        return this.inactiveArray;
    };

    getInactivesForSingleTemplateActive(id) {
        const inactiveList = [];
        for (let i = 0; i < this.originalTemplates.length; i++) {
            const t = this.originalTemplates[i];
            if (t.id !== id) {
                inactiveList.push(t.id);
            }
        }
        return inactiveList || [];
    };

    setInactiveTemplates(inactiveList) {
        inactiveList = inactiveList || [];
        for (let i = 0; i < inactiveList.length; i++) {
            if (typeof inactiveList[i] == "number") {
                inactiveList[i] = inactiveList[i].toFixed(0);
            }
        }
        this.inactiveArray = inactiveList;
        this.templates = [];
        for (let i = 0; i < this.originalTemplates.length; i++) {
            const t = this.originalTemplates[i];
            if (this.inactiveArray.indexOf(t.id) === -1) {
                this.templates.push(t);
                t.inactive = false;
            } else {
                t.inactive = true;
            }
        }
    };

    isQuasarActive() {
        for (let i = 0; i < this.templates.length; i++) {
            if (this.isQuasar(this.templates[i].id)) {
                return true;
            }
        }
        return false;
    };

    getInactiveTemplatesCookie() {
        let res = [];
        try {
            if (typeof document != "undefined" && document != null) {
                res = CookieManager.getCookie(this.templateEnabledCookieKey);
                if (res == null) {
                    res = []
                }
            }
        } catch (err) {
        }
        return res;

    };

    getTemplateManager() {
        return this;
    }

    /*
    * Used by workers for deferred initialisation
    */
    copyFrom(other) {
        this.inactiveArray = other.inactiveArray;
        this.initialised = other.initialised;
        this.logLambda = other.logLambda;
        this.logLambdaQ = other.logLambdaQ;
        this.originalTemplates = other.originalTemplates;
        this.templateEnabledCookieKey = other.templateEnabledCookieKey;
        
        this.templatesHash = {};
        for (let i = 0; i < this.originalTemplates.length; i++) {
            this.templatesHash[this.originalTemplates[i].id] = this.originalTemplates[i];
        }

        // Recreate this array to ensure the elements are references to this.originalTemplates elements
        // This is essential because workers are generally passed DEEP COPIES of objects rather than references
        this.templates = [];
        for (let i = 0; i < other.templates.length; i++) {
            this.templates.push(this.getTemplateFromId(other.templates[i].id));
        }

        if (this.process) {
            if (!other.process)
            {
                this.processTemplates();
            }
        }

        if (this.shiftToMatch) {
            if (!other.shiftToMatch)
            {
                this.shiftToMatchSpectra();
            }
        }
    }

    getOriginalTemplates() {
        return this.originalTemplates;
    };

    saveInactives() {
        if (typeof document != "undefined" && document != null) {
            CookieManager.setCookie(this.templateEnabledCookieKey, this.inactiveArray);
        }
    };

    getTemplateFromId(id) {
        return this.templatesHash[id];
    };

    isQuasar(id) {
        return id !== "0" && Boolean(this.getTemplateFromId(id).quasar);
    };

    getTemplate(id, z, withContinuum) {
        const t = this.templatesHash[id];
        const fact = (1 + z) / (1 + t.redshift);
        const lambda = t.lambda_linear.slice();
        for (let i = 0; i < lambda.length; i++) {
            lambda[i] *= fact;
        }
        if (withContinuum) {
            return [lambda, t.specWithContinuum_linear];
        } else {
            return [lambda, t.spec_linear];
        }
    };

    getNameForTemplate(templateId) {
        if (this.templatesHash[templateId]) {
            return this.templatesHash[templateId].name;
        } else {
            return "Unspecified";
        }
    };

    processTemplates() {
        for (let i = 0; i < this.originalTemplates.length; i++) {
            const t = this.originalTemplates[i];

            // Create the array of wavelengths
            t.lambda = linearScale(t.start_lambda, t.end_lambda, t.spec.length);

            // Ensure all wavelengths are in vacuum
            if (t.shift != null && t.shift === true) {
                if (t.log_linear) {
                    convertVacuumFromAirWithLogLambda(t.lambda);
                } else {
                    convertVacuumFromAir(t.lambda);
                }
            }

            // Create all the linear values to be used when plotting the templates
            if (!t.log_linear) {
                t.lambda_linear = t.lambda;
                t.lambda = t.lambda.map(function (x) {
                    return Math.log(x) / Math.LN10;
                });
                t.specWithContinuum_linear = t.spec.slice();
            } else {
                t.lambda_linear = linearScale(Math.pow(10, t.lambda[0]), Math.pow(10, t.lambda[t.lambda.length - 1]), t.lambda.length);
                const rescale = t.lambda.map(function (x) {
                    return Math.pow(10, x);
                });
                t.specWithContinuum_linear = interpolate(t.lambda_linear, rescale, t.spec);
            }
            t.spec_linear = t.specWithContinuum_linear.slice();
            t.start_lambda_linear = t.lambda_linear[0];
            t.end_lambda_linear = t.lambda_linear[t.lambda_linear.length - 1];

            subtractPolyFit(t.lambda_linear, t.spec_linear);
            if (!t.quasar) {
                smoothAndSubtract(t.spec_linear);
            }
            // We will create the data to be used for matching only when called for, so the UI does not waste time.
        }
        this.logLambda = linearScale(globalConfig.startPower, globalConfig.endPower, globalConfig.arraySize);
        this.logLambdaQ = linearScale(globalConfig.startPowerQ, globalConfig.endPowerQ, globalConfig.arraySize);
        this.processed = true;
        this.setInactiveTemplates(this.inactiveArray);
    };

    shiftToMatchSpectra() {
        for (let i = 0; i < this.templates.length; i++) {
            this.shiftTemplate(this.templates[i]);
        }
    };

    shiftTemplate(t) {
        const ll = t.quasar ? this.logLambdaQ : this.logLambda;
        polyFitReject(t.lambda, t.spec);
        if (!t.quasar) {
            smoothAndSubtract(t.spec);
        }

        taperSpectra(t.spec);
        normalise(t.spec);

        t.spec = interpolate(ll, t.lambda, t.spec);
        t.lambda = ll;
        t.fft = new FFT(t.spec.length, t.spec.length);
        t.fft.forward(t.spec);
        t.fft.conjugate();

        const gap = (t.lambda[t.lambda.length - 1] - t.lambda[0]) / (t.lambda.length - 1);
        const num = t.lambda.length / 2;
        //const l = t.lambda.length * 1.0;
        //const s = l / (l - 1);
        t.zs = t.lambda.map(function (x, i) {
            return (Math.pow(10, (i - num) * gap) * (1 + t.redshift)) - 1
        });

        t.startZIndex = null;
        t.endZIndex = null;
        t.endZIndex2 = null;

        // Linear search through an ordered array is horrible, I should improve this. (But atm its run once at the start, so low priority)
        for (let j = 0; j < t.zs.length; j++) {
            if (t.startZIndex == null && t.zs[j] > t.z_start) {
                t.startZIndex = j;
            }
            if (t.endZIndex == null && t.zs[j] > t.z_end) {
                t.endZIndex = j;
            }
            if (t.z_end2 != null && t.endZIndex2 == null && t.zs[j] > t.z_end2) {
                t.endZIndex2 = j;
            }
            if (t.endZIndex != null && t.startZIndex != null) {
                break;
            }
        }
        t.zs = t.zs.slice(t.startZIndex, t.endZIndex);
    }

    getTemplateAtRedshift(templateId, redshift, withContinuum) {
        return this.getTemplate(templateId, redshift, withContinuum);
    }

    getTemplates() {
        return this.templates;
    }

    getFFTReadyTemplate(templateId) {
        const t = this.templatesHash[templateId];
        if (t.fft == null) {
            this.shiftTemplate(t);
        }
        return t;
    }
}

const templateManager = new TemplateManager();

export {
    TemplateManager,
    templateManager
};
