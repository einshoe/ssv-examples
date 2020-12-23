import React from "react";
import { Vega } from 'react-vega';

import {
    binarySearch,
    defaultFor,
    distance, fastSmooth,
    findCorrespondingFloatIndex,
    getMax,
    getMin,
    shiftWavelength
} from '../../../Utils/methods';
import Enumerable from "linq";
import {adjustRedshift} from "../../../Utils/dsp";
import {getStrengthOfLine} from "./spectralAnalysis";

import download_image from '../../../Assets/images/download.png';
import lens_image from '../../../Assets/images/lens.png';
import {spectraLineService} from "./spectralLines";
import {templateManager} from "../../../AutoRedshift/Lib/TemplateManager";
import {setSpectraFocus, setWaitingForSpectra} from "../../../Stores/UI/Actions";
import {addFiles} from "../../../Stores/Data/Actions";
import {isDetailed} from "../../../Utils/dry_helpers";

import {globalConfig} from "../../../Lib/config"
import { faTableTennis } from "@fortawesome/free-solid-svg-icons";
import { SSV } from '@rseikel/ssv2/src/js/SSV'

let updateBaseData = () => {};
let updateSkyData = () => {};
let updateTemplateData = () => {};
let updateXcorData = () => {};
let updateSmoothData = () => {};
let updateCanvas = () => {};

class DetailedCanvas extends React.Component {
    // Life cycle - Mount
    constructor(props) {
        super(props);
        this.state = {"continuum": true, "matched": true, "processed": true, "smooth": "3", "rangeIndex": 0, "spectraFocus": 0.0, "xcor": new SSV("xcor")};

        // Need this early to organise the callout layout
        this.callout_redshift = 0;
        this.callout = true;
        this.maxCallouts = 8;
        this.minCalloutWidth = 350;
        this.callouts = [];
        this.calloutspecs = [];
        this.possiblecallouts = Enumerable.from([[1000, 1100, 5], [1200, 1260, 10], [1500, 1600, 2], [1850, 2000, 3],
            [2700, 2900, 4], [3700, 3780, 10], [3800, 4100, 7], [4250, 4400, 5], [4800, 5100, 8], [6500, 6800, 9], [6700, 6750, 6]]);

        this.vegaview = null;
        this.calloutviews = [];

        updateBaseData = () => {
            // Add the base data
            if (this.showMultipleSpectra()) {
                this.addBaseDataAll();
            } else {
                this.addBaseData();
            }

            if (!isDetailed(this.props))
                return;

            this.update();
        };

        updateSkyData = () => {
            // Add the base data
            this.addSkyData();

            if (!isDetailed(this.props))
                return;

            this.update();
        };

        updateTemplateData = () => {
            // Add the base data
            this.addTemplateData();

            if (!isDetailed(this.props))
                return;

            this.update();
        };

        updateXcorData = () => {
            // Add the base data
            console.log("ADD XCOR DATA");
            this.addxcorData();

            if (!isDetailed(this.props))
                return;

            console.log("ADD XCOR DATA UPDATE");
            this.update();
        };

        updateSmoothData = () => {
            // Smooth the data and redraw
            this.smoothData('data');

            if (!isDetailed(this.props))
                return;

            this.update();
        };

        updateCanvas = () => {
            this.update();
        }
    }

    // Life cycle - Mount
    componentDidMount() {
        console.log("\t->DetailedCanvas.componentDidMount");
        // Save the canvas element and get it's 2d rendering context for use later
        this.c = this.canvasvega;

        // Set the images
        this.zoomOutImg = new Image();
        this.zoomOutImg.src = lens_image;
        this.downloadImg = new Image();
        this.downloadImg.src = download_image;
        this.templateManager = templateManager;

        this.update();

        // Force a complete update
        updateBaseData();
        updateTemplateData();
        updateXcorData();
        updateSkyData();
        updateSmoothData();

        // Update the scale
        this.setScale();

        // TODO: RS - Is this the best place for this?
        if ("remote_file" in window.marz_configuration) {
            if (window.marz_configuration.remote_file !== null) {
                console.log("ADD REMOTE FILE ",window.marz_configuration.remote_file);
                let files=[];
                files.push({name:window.marz_configuration.remote_file, isurl: true});
                addFiles(files);
            }
        }

        this.update();
    }

    // Life cycle - Mount and Update
    static getDerivedStateFromProps(props, state) {
        console.log("LIFECYCLE: getDerivedStateFromProps props=", props);
        console.log("LIFECYCLE: getDerivedStateFromProps state=", state);
        return state;
    }

    // Life cycle - Update
    shouldComponentUpdate(nextProps, nextState) {
        // todo: Need to add checks here if the canvas should be rerendered during a react update
        console.log("SHOULD I UPDATE nextProps=?", nextProps.ui);
        console.log("SHOULD I UPDATE nextState=?", nextState);
        console.log("SHOULD I UPDATE ssv pinx=?", globalConfig.ssv.getPinX("."));
        console.log("SHOULD I UPDATE state.spectraFocus=?", this.state.spectraFocus);
        let needsredraw = globalConfig.ssv.getTraceVisibility("sky")!=nextProps.ui.dataSelection.sky ||
            globalConfig.ssv.getTraceVisibility("variance")!=nextProps.ui.dataSelection.variance;
        if (nextProps.ui.dataSelection.processed != this.state.processed) {
            needsredraw = true;
            nextState.processed = nextProps.ui.dataSelection.processed;
        }
        if (nextProps.ui.dataSelection.matched != this.state.matched) {
            needsredraw = true;
            nextState.matched = nextProps.ui.dataSelection.matched;
        }
        if (nextProps.ui.detailed.continuum != this.state.continuum) {
            needsredraw = true;
            nextState.continuum = nextProps.ui.detailed.continuum;
        }
        if (nextProps.ui.detailed.smooth != this.state.smooth) {
            needsredraw = true;
            nextState.smooth = nextProps.ui.detailed.smooth;
        }
        if (nextProps.ui.detailed.rangeIndex != this.state.rangeIndex) {
            needsredraw = true;
            nextState.rangeIndex = nextProps.ui.detailed.rangeIndex;
        }
        if (globalConfig.ssv.getPinX(".") != this.state.spectraFocus) {
            needsredraw = true;
            nextState.spectraFocus = globalConfig.ssv.getPinX(".");
        }
        globalConfig.ssv.setRedshift(parseFloat(this.detailed.redshift));
        const me=this;
        this.vegaview.signal("templateOffset",parseInt(nextProps.ui.detailed.templateOffset));
        let z_fact = (1.0 + parseFloat(this.detailed.redshift)) / (1.0 + globalConfig.ssv.activeTemplateRedshift);
        this.vegaview.signal("redshift",z_fact);
        this.vegaviewxcor.signal("redshift", parseFloat(this.detailed.redshift));
        this.vegaviewxcor.signal("xcorlabel", this.detailed.redshift);
        for (let i=0;i<this.calloutviews.length;i++) {
            this.calloutviews[i].signal("redshift", parseFloat(this.detailed.redshift));
        }

        this.vegaview.runAsync().then(function (data) {
            // Do any required stuff after reading all in
            console.log("thenA",me.vegaview);

        });
        this.vegaviewxcor.runAsync().then(function (data) {
            // Do any required stuff after reading all in
            console.log("thenB",me.vegaviewxcor);

        });
        if (needsredraw) {
            console.log("YES REDRAW IT!")
        }
        return needsredraw;
    }

    // Life cycle - Update
    getSnapshotBeforeUpdate(prevProps, prevState) {
        console.log("LIFECYCLE: getSnapshotBeforeUpdate");
        return null;
    }

    // Life cycle - Update
    componentDidUpdate() {
        console.log("LIFECYCLE: componentDidUpdate");
    }

    // Life cycle - Unmounting
    componentWillUnmount() {
        console.log("LIFECYCLE: componentWillUnmount");
    }

    //  Conditional content
    showData() {
        return true;
    }
    showTemplate() {
        const dataonly = (window.marz_configuration.layout == 'ReadOnlySpectrumView' || window.marz_configuration.layout == 'SimpleSpectrumView');
        return !dataonly;
    }
    showXcor() {
        const dataonly = (window.marz_configuration.layout == 'ReadOnlySpectrumView' || window.marz_configuration.layout == 'SimpleSpectrumView');
        return !dataonly;
    }
    showCallout() {
        return (window.marz_configuration.layout == 'MarzSpectrumView');
    }
    showSpectraLines() {
        return (window.marz_configuration.layout == 'MarzSpectrumView' || window.marz_configuration.layout == 'TemplateOverlaySpectrumView');
    }
    showZoomControl() {
        return window.marz_configuration.layout != 'ReadOnlySpectrumView';
    }
    showDownloadControl() {
        return (window.marz_configuration.layout == 'MarzSpectrumView');
    }
    showMultipleSpectra() {
        if (this.props.data.spectra.length<=1) return false;
        if (this.props.data.spectra.length>5) return false; // for safety do not display as multispectra if too many
        return (window.marz_configuration.layout == 'ReadOnlySpectrumView' || window.marz_configuration.layout == 'SimpleSpectrumView');
    }
    checkArray(message, data) {
        for (let i=0;i<data.length;i++) {
            if (data[i]>20000) {
                console.log("FOUND OUTLIER at ",i,data[i], message);
            }
        }
    }

    handleNewView = view => {
        // Do something with the view, such as updating the value of a signal.
        //view.signal('xDomain', [props.xMin, props.xMax]).run();
        console.log("\t->Detailed.handleNewView");
        let me=this;
        this.vegaview = view;
        console.log("----SIGNALS----",view.getState());
        this.vegaview.addSignalListener('width', function (name, alue) {
            console.log("WIDTH: "+value);
        })
        this.vegaview.addEventListener('click', function(event, item) {
            let rect = me.refs.canvasvega.getBoundingClientRect();
            //console.log("RECT",rect);
            let x = event.clientX - rect.left - this.origin()[0];
            let y = event.clientY - rect.top;
            let xscale = this.scale("x");
            let yscale = this.scale("y");
            setSpectraFocus(xscale.invert(x));
            setWaitingForSpectra(true)
            console.log("CLICK",xscale.invert(x), yscale.invert(y));
          });
        this.update();
    };
    handleNewViewXcor = view => {
        // Do something with the view, such as updating the value of a signal.
        //view.signal('xDomain', [props.xMin, props.xMax]).run();
        console.log("\t->Detailed.handleNewViewXcor this",this);
        console.log("\t->Detailed.handleNewViewXcor view",view);
        let me=this;
        this.vegaviewxcor = view;
    };
    handleNewViewCallout = view => {
        // Do something with the view, such as updating the value of a signal.
        //view.signal('xDomain', [props.xMin, props.xMax]).run();
        console.log("\t->Detailed.handleNewViewCallout");
        let me = this;
        this.calloutviews.push(view);
    };

    // Life cycle - Mount and Update
    render() {
        // Check if the 2d context has been initialised yet
        console.log("\t->DetailedCanvas.render",this.props.ui, this.canvasvega);
        // seems to be better to always do this
        this.update();
        this.addxcorData();
        
        const ssv=globalConfig.ssv;

        let mybestTemplateId=this.props.ui.active.automaticBestResults[0].templateId;
        let mybestRedshift=this.props.ui.active.automaticBestResults[0].z;
        let mycontinuum=this.props.ui.detailed.continuum;
        let mytemplate = templateManager.getTemplate(mybestTemplateId, 0.0, mycontinuum);
        console.log("\t\t->THIS DATA",this);
        console.log("\t\t->EARLY CALLOUTS",this.possiblecallouts.toArray().length);

        let ydata=null;
        if (mycontinuum) {
            if (this.props.ui.dataSelection.processed) {
                console.log("WITH PROCESSED CONTINUUM");
                ydata = this.props.ui.active.processedContinuum;
                ssv.setTrace("intensity",this.props.ui.active.processedContinuum);
            } else {
                console.log("WITH RAW CONTINUUM");
                ydata = this.props.ui.active.intensityPlot;
                ssv.setTrace("intensity",this.props.ui.active.intensityPlot);
            }
        } else {
            if (this.props.ui.dataSelection.processed) {
                console.log("WITH PROCESSED");
                ydata = this.props.ui.active.processedIntensity2;
                ssv.setTrace("intensity",this.props.ui.active.processedIntensity2);
            } else {

                console.log("WITH RAW");
                ydata = this.ui.active.getIntensitySubtracted();
                ssv.setTrace("intensity",this.ui.active.getIntensitySubtracted());
            }
        }
        ssv.setTrace("wavelength",this.props.ui.active.processedLambdaPlot);
        ssv.setTraceVisibility("sky", this.props.ui.dataSelection.sky);
        ssv.setTraceVisibility("variance", this.props.ui.dataSelection.variance);

        if (this.props.ui.dataSelection.matched)
            ssv.setActiveTemplate(mybestTemplateId, mytemplate, 0,0);
        else
            ssv.setActiveTemplate("", mytemplate, 0,0);
        this.callout_redshift = 0;
        this.callouts = [];
        this.calloutspecs = [];
        let myxcorspec={};
        if(this.detailed) {
            console.log("YOffset=",this.detailed.templateOffset);
            console.log("REDSHIFT=",this.detailed.redshift);
            console.log("SMOOTH=",this.detailed.smooth);
            ssv.setActiveTemplateYOffset(parseFloat(this.detailed.templateOffset)*10);
            ssv.setRedshift(parseFloat(this.detailed.redshift));
            ssv.setSmoothHalfWidth(this.detailed.smooth);
            this.callout_redshift = parseFloat(this.detailed.redshift);

            console.log("\t\t->EARLY ENOUGH PARAMS DATA",this.params.data.toArray().length);
            let data = this.params.data.toArray();
            // TODO: Really bad!
            if (data.length>0 && data[0].yMins) {
                for (let i=0; i<data.length; i++) {
                    console.log("Ymin",data[i].id, data[i].yMins);
                    console.log("Ymax",data[i].id, data[i].yMaxs);
                }
                console.log("the rest",this.props);
                if (this.props.ui && this.props.ui.detailed) {
                    ssv.setTraceMinClip("intensity",data[0].yMins[this.props.ui.detailed.rangeIndex]);
                    ssv.setTraceMaxClip("intensity",data[0].yMaxs[this.props.ui.detailed.rangeIndex]);
                }
            }
            this.state.xcor.setTrace("zs",this.params.xcorData.zs);
            this.state.xcor.setTrace("xcor",this.params.xcorData.xcor);
            this.state.xcor.setXAxisTitle("zs","zs");
            this.state.xcor.setYAxisTitle("xcor","xcor");
            this.state.xcor.setVRule("a", parseFloat(this.detailed.redshift));
            this.state.xcor.setRedshift(parseFloat(this.detailed.redshift));
            myxcorspec = this.state.xcor.getVegaSpecForCrossCorrelation(1500,100);
            console.log("XCOR SPEC A",myxcorspec);
        } else {
            ssv.setRedshift(parseFloat(mybestRedshift));
            ssv.setSmoothHalfWidth(3);
            this.callout_redshift = mybestRedshift;
            
            this.state.xcor.setTrace("zs",[0.0]);
            this.state.xcor.setTrace("xcor",[0.0]);
            this.state.xcor.setXAxisTitle("zs","zs");
            this.state.xcor.setYAxisTitle("xcor","xcor");
            myxcorspec = this.state.xcor.getVegaSpecForCrossCorrelation(1500,100);
            //console.log("XCOR SPEC B",myxcorspec);
        }
        ssv.prepareDataForVegaSpec();
        let myspec = ssv.getVegaSpec(1500, 400, ssv.getTraceMin(ssv.xaxisTraceName),ssv.getTraceMax(ssv.xaxisTraceName), ssv.getTraceMinClip(ssv.yaxisTraceName), ssv.getTraceMaxClip(ssv.yaxisTraceName), true, true);
        //if (this.detailed) {
            this.calloutviews.length = 0;
            this.calloutspecs.length = 0;
            this.callouts = this.selectCalloutWindowsVega(this.props.ui.active.processedLambdaPlot,ydata,this.callout_redshift,1500,400);
            for (let i=1;i<this.callouts.length;i++) {
                console.log("with ",myspec);
                const calloutspec = ssv.getVegaSpec(this.callouts[i].width, this.callouts[i].height, this.callouts[i].xMin, this.callouts[i].xMax, this.callouts[i].yMin, this.callouts[i].yMax, false, false);
                console.log("LOOK FOR CALLOUTS",i,calloutspec);
                this.calloutspecs.push(calloutspec);
            }
        //}
        console.log("vega spec",myspec);
        /*
        <canvas
                    ref='canvas'
                    id="detailedCanvas"
                />
        */
        return (window.marz_configuration.layout == 'MarzSpectrumView') ?
        (
            <div ref='parent' id="detailedCanvasParent" className="canvas-container canvas-container-4line-margin">
                <Vega spec={myxcorspec}
                onNewView={this.handleNewViewXcor}
                />
                <div ref='canvasvega'
                onMouseUp={e => this.handleEventVega(e, this.callouts)}
                onMouseMove={e => this.handleEventVega(e, this.callouts)}
                >
                <Vega name="myvega"
                    ref="canvasvega"
                    spec={myspec}
                    onNewView={this.handleNewView}
                    />
                    </div>
                    <div>
                {this.callouts.map((callout, index) => (index==0)?null:<Vega key={index} spec={this.calloutspecs[index-1]} onNewView={this.handleNewViewCallout}/>)}
                </div>
                
            </div>
        ) : (
            window.marz_configuration.layout == 'ReadOnlySpectrumView' ?
            (
                <div ref='parent' id="detailedCanvasParent" className="canvas-container canvas-container-no-margin">
                    <canvas
                        ref='canvas'
                        id="detailedCanvas"
                    />
                </div>
            ) :
            (window.marz_configuration.layout == 'TemplateOverlaySpectrumView') ?
            (
                <div ref='parent' id="detailedCanvasParent" className="canvas-container canvas-container-3line-margin">
                    <canvas
                        ref='canvas'
                        id="detailedCanvas"
                    />
                </div>
            ) :
            (
                <div ref='parent' id="detailedCanvasParent" className="canvas-container canvas-container-1line-margin">
                    <canvas
                        ref='canvas'
                        id="detailedCanvas"
                    />
                </div>
            )
        )
    }

    setScale(extra) {
        extra = defaultFor(extra, 1.0);
        this.params.scale = this.params.ratio * extra;
    };

    update() {
        // Get the general parameter information
        this.params = this.props.detailed;

        // Get the ui info for this spectra
        this.ui = this.props.ui;

        // Get the detailed ui info for this spectra
        this.detailed = this.ui.detailed;

        // Get the view information for this spectra
        this.view = this.params.view;

        if (this.detailed.lockedBounds === false)
            this.view.bounds[0].lockedBounds = false;

        this.handleRedrawRequest();
    }

    static convertCanvasXCoordinateToDataPoint(bound, x) {
        return bound.xMin + ((x - bound.left) / (bound.width)) * (bound.xMax - bound.xMin);
    };

    static convertCanvasYCoordinateToDataPoint(bound, y) {
        return bound.yMin + (1 - ((y - bound.top) / (bound.height))) * (bound.yMax - bound.yMin);
    };

    static convertDataXToCanvasCoordinate(bound, x) {
        return bound.left + ((x - bound.xMin) / (bound.xMax - bound.xMin)) * bound.width;
    };

    static convertDataYToCanvasCoordinate(bound, y) {
        return bound.top + (1 - ((y - bound.yMin) / (bound.yMax - bound.yMin))) * bound.height;
    };

    static checkDataXInRange(bound, x) {
        return x >= bound.xMin && x <= bound.xMax;
    };

    static checkDataYInRange(bound, y) {
        return y >= bound.yMin && y <= bound.yMax;
    };

    static checkDataXYInRange(bound, x, y) {
        return DetailedCanvas.checkDataXInRange(bound, x) && DetailedCanvas.checkDataYInRange(bound, y);
    };

    static checkCanvasYInRange(bound, y) {
        return y >= bound.top && y <= (bound.top + bound.height);
    };

    static checkCanvasXInRange(bound, x) {
        return x >= bound.left && x <= (bound.left + bound.width)
    };

    static checkCanvasInRange(bound, x, y) {
        if (bound == null) {
            return false;
        }
        return DetailedCanvas.checkCanvasXInRange(bound, x) && DetailedCanvas.checkCanvasYInRange(bound, y);
    };

    windowToCanvas(e) {
        
    };

    canvasMouseDown(loc) {
        
    };

    canvasMouseUp(loc) {
        
    };

    xcorEvent(z) {
    };

    canvasMouseMove(loc) {
        
    };

    mouseOut() {
        
    };

    isScrollingUp(e) {
        
    };

    zoomIn(res) {
        
    };

    zoomOut(res) {
        
    };

    handleEvent(e) {
        
    };

    // Start Vega events

    handleEventVega(e, callouts) {
        const res = this.windowToCanvasVega(e, callouts);
        //e.preventDefault();
        //e.stopPropagation();
        if (e.type === 'mousedown' || e.type === "touchstart") {
            this.canvasMouseDownVega(res);
        } else if (e.type === 'mouseup' || e.type === 'touchend') {
            this.canvasMouseUpVega(res, callouts);
        } else if (e.type === 'mousemove' || e.type === 'touchmove') {
            this.canvasMouseMoveVega(res, callouts);
        } else if (e.type === 'mouseout') {
            this.mouseOutVega(res);
        }
    };

    windowToCanvasVega(e, callouts) {
        let result = {};
        let rect = this.refs.canvasvega.getBoundingClientRect();
        result.x = e.clientX - rect.left - this.vegaview.origin()[0];
        result.y = e.clientY - rect.top;
        let xscale = this.vegaview.scale("x");
        let yscale = this.vegaview.scale("y");
        result.dataX = null;
        result.dataY = null;
        result.bound = null;
        if (this.params.xcor) {
            if (result.x > this.params.xcorBound.left && result.x < this.params.xcorBound.left + this.params.xcorBound.width
                && result.y > this.params.xcorBound.top - 15 && result.y < this.params.xcorBound.top + this.params.xcorBound.height) {
                result.dataX = DetailedCanvas.convertCanvasXCoordinateToDataPoint(this.params.xcorBound, result.x);
                result.dataY = DetailedCanvas.convertCanvasYCoordinateToDataPoint(this.params.xcorBound, result.y);
                result.bound = this.params.xcorBound;
            }
        }
        if (result.bound == null) {
            for (let i = 0; i < callouts.length; i++) {
                if (DetailedCanvas.checkCanvasInRange(callouts[i], result.x, result.y)) {
                    let bound = callouts[i];
                    let x = result.x;
                    result.dataX = xscale.invert(result.x);
                    result.dataY = DetailedCanvas.convertCanvasYCoordinateToDataPoint(callouts[i], result.y);
                    result.bound = callouts[i];
                    break;
                }
            }
        }
        result.inside = (result.dataX != null && result.dataY != null);
        return result;
    };
    canvasMouseDownVega(loc) {
        if (loc.inside) {
            this.params.lastXDown = loc.x;
            this.params.lastYDown = loc.y;
        }
        if (loc.bound && loc.bound.xcorCallout) {
            this.xcorEvent(loc.dataX);
        }
    };

    canvasMouseUpVega(loc, callouts) {
        this.params.currentMouseX = loc.x;
        this.params.currentMouseY = loc.y;
        if (this.params.lastXDown != null && this.params.lastYDown != null && this.params.currentMouseX != null && this.params.currentMouseY != null &&
            distance(this.params.lastXDown, this.params.lastYDown, this.params.currentMouseX, this.params.currentMouseY) > this.params.minDragForZoom && loc.bound != null && loc.bound.callout === false) {
            this.x1 = DetailedCanvas.convertCanvasXCoordinateToDataPoint(loc.bound, this.params.lastXDown);
            this.x2 = DetailedCanvas.convertCanvasXCoordinateToDataPoint(loc.bound, this.params.currentMouseX);
            this.y1 = DetailedCanvas.convertCanvasYCoordinateToDataPoint(loc.bound, this.params.lastYDown);
            this.y2 = DetailedCanvas.convertCanvasYCoordinateToDataPoint(loc.bound, this.params.currentMouseY);
            loc.bound.xMin = Math.min(this.x1, this.x2);
            loc.bound.xMax = Math.max(this.x1, this.x2);
            loc.bound.yMin = Math.min(this.y1, this.y2);
            loc.bound.yMax = Math.max(this.y1, this.y2);
            loc.bound.lockedBounds = true;
        } else {
            if (loc.bound && loc.bound.callout === false &&
                loc.x > (loc.bound.left + loc.bound.width + this.params.zoomOutXOffset - this.params.zoomOutWidth) &&
                loc.x < (loc.bound.left + loc.bound.width + this.params.zoomOutXOffset) &&
                loc.y < (loc.bound.top + this.params.zoomOutHeight + this.params.zoomOutYOffset) &&
                loc.y > loc.bound.top + this.params.zoomOutYOffset) {
                loc.bound.lockedBounds = false;
                this.redraw();
            } else if (loc.bound && loc.bound.callout === false &&
                loc.x > (loc.bound.left + loc.bound.width + this.params.zoomOutXOffset - this.params.zoomOutWidth) &&
                loc.x < (loc.bound.left + loc.bound.width + this.params.zoomOutXOffset) &&
                loc.y < (loc.bound.top + this.params.zoomOutHeight + this.params.downloadYOffset) &&
                loc.y > loc.bound.top + this.params.downloadYOffset) {
                this.downloadImage();
            } else if (DetailedCanvas.checkCanvasInRange(loc.bound, loc.x, loc.y)) {
                console.log("canvasMouseUpVega in",loc.x,loc.y,loc.bound);
                let x = loc.x;
                let y = loc.y;
                let xscale = this.vegaview.scale("x");
                let yscale = this.vegaview.scale("y");
                console.log("DROPPING PIN AT WAVE",xscale.invert(x), yscale.invert(y),x,y);
                globalConfig.ssv.setPin(".", xscale.invert(x), yscale.invert(y));
                setSpectraFocus(xscale.invert(x));
                globalConfig.ssv.plugin_apply("dropPin",{"message":"dropping pin at "+xscale.invert(x)});
                setWaitingForSpectra(true);
            }
        }
        this.params.lastXDown = null;
        this.params.lastYDown = null;
        this.redraw()
    };

    canvasMouseMoveVega(loc, callouts) {
        if (!loc.inside) return;
        this.params.currentMouseX = loc.x;
        this.params.currentMouseY = loc.y;
        if (loc.bound != null && loc.bound.xcorCallout !== true) {
            this.handleRedrawRequest();
            if (this.params.lastXDown != null && this.params.lastYDown != null) {
                if (distance(loc.x, loc.y, this.params.lastXDown, this.params.lastYDown) < this.params.minDragForZoom || loc.bound == null || loc.bound.callout) {
                    return;
                }
                this.c.strokeStyle = this.params.dragOutlineColour;
                this.c.fillStyle = this.params.dragInteriorColour;
                this.w = loc.x - this.params.lastXDown;
                this.h = loc.y - this.params.lastYDown;
                this.c.fillRect(this.params.lastXDown + 0.5, this.params.lastYDown, this.w, this.h);
                this.c.strokeRect(this.params.lastXDown + 0.5, this.params.lastYDown, this.w, this.h);
            }
        } else if (loc.bound != null && loc.bound.xcorCallout === true) {
            if (this.params.lastXDown != null && this.params.lastYDown != null) {
                this.xcorEvent(loc.dataX);
            } else {
                this.plotZLine2(loc.bound, loc.x);
            }

            this.handleRedrawRequest();
        }
    };

    mouseOutVega() {
        this.params.currentMouseX = null;
        this.params.currentMouseY = null;
        this.redraw();
    };

    // End Vega events

    refreshSettings() {
        /*
        this.params.canvasHeight = this.refs.parent.clientHeight;
        this.params.canvasWidth = this.refs.parent.clientWidth;
        this.refs.canvas.width = this.params.canvasWidth * this.params.scale;
        this.refs.canvas.height = this.params.canvasHeight * this.params.scale;
        this.refs.canvas.style.width = this.params.canvasWidth + "px";
        this.refs.canvas.style.height = this.params.canvasHeight + "px";
        this.c.scale(this.params.scale, this.params.scale);
        this.params.callout = this.showCallout() ? this.params.canvasHeight > 450 : false;
        this.params.xcor = this.params.xcorData && this.showXcor() && (this.params.canvasHeight > 300);
        this.params.xcorBound.width = this.params.canvasWidth - this.params.xcorBound.left - this.params.xcorBound.right;
        this.params.xcorBound.height = this.params.xcorHeight - this.params.xcorBound.top - this.params.xcorBound.bottom;
        this.view.bounds[0].top = this.params.xcor ? this.params.baseTop + this.params.xcorHeight : this.params.baseTop;
        this.view.bounds[0].bottom = this.params.callout ? Math.floor(this.params.canvasHeight * 0.3) + this.params.baseBottom : this.params.baseBottom;
        this.view.bounds[0].width = this.params.canvasWidth - this.view.bounds[0].left - this.view.bounds[0].right;
        this.view.bounds[0].height = this.params.canvasHeight - this.view.bounds[0].top - this.view.bounds[0].bottom;
        */
    };

    getBounds(bound) {
        if (bound.lockedBounds) return;
        let c = 0;
        if (!bound.callout) {
            bound.xMin = 9e9;
            bound.xMax = -9e9;
        }
        bound.yMin = 9e9;
        bound.yMax = -9e9;

        const data = this.params.data.toArray();
        const count = data.length;

        for (let i = 0; i < count; i++) {
            if (data[i].bound) {
                c++;
            }
            if (!bound.callout) {
                if (data[i].bound && data[i].xMin != null && data[i].xMax != null) {
                    bound.xMin = data[i].xMin;
                    bound.xMax = data[i].xMax;
                }
            }
        }
        let currentRangeIndex = this.detailed.rangeIndex;

        for (let i = 0; i < count; i++) {
            if (data[i].bound) {
                bound.yMin = Math.min(bound.yMin,data[i].yMins[currentRangeIndex]);
                bound.yMax = Math.max(bound.yMax,data[i].yMaxs[currentRangeIndex]);
            }
        }

        let hasYrange = false
        if ("ymin" in window.marz_configuration) {
            bound.yMin = parseFloat(window.marz_configuration.ymin, bound.yMin)
            hasYrange = true
        }
        if ("ymax" in window.marz_configuration) {
            bound.yMax = parseFloat(window.marz_configuration.ymax, bound.yMax)
            hasYrange = true
        }

        if (c === 0) {
            if (!bound.callout) {
                bound.xMin = 3300;
                bound.xMax = 7200;
            }
            if (!hasYrange) {
                bound.yMin = -500;
                bound.yMax = 1000;
            }
        } else {
            if (!hasYrange) {
                bound.yMin = bound.yMax - (bound.callout ? this.params.calloutSpacingFactor : this.params.spacingFactor) * (bound.yMax - bound.yMin);
            }
        }
    };

    clearPlot(download) {
       
    };

    plotZeroLine(bound) {
        
    };

    plotAxes(bound, colour) {
        
    };

    plotAxesLabels(onlyLabels, bound) {
        
    };

    plotAxesFormalLabels(yfactor,bound) {
        
    };

    annotatePlot(name, bound) {
        
    };

    plotText(text, x, y, colour) {
        
    };

    plotZLine2(bound, x) {
        
    };

    plotZLine(bound) {


    };

    plotxcorData() {
        
    };

    renderLinearPlot(bound, xs, ys, colour) {
        
    };

    renderPlots(bound) {
        
    };

    drawZoomOut(bound) {
        
    };

    drawDownload(bound) {
        
    };

    plotSpectralLines(bound) {
    
    };

    drawFocus(bound) {
        /*
        if (this.params.focusDataX == null || this.params.focusDataX == null) return;
        if (DetailedCanvas.checkDataXYInRange(bound, this.params.focusDataX, this.params.focusDataY)) {
            const x = DetailedCanvas.convertDataXToCanvasCoordinate(bound, this.params.focusDataX);
            const y = DetailedCanvas.convertDataYToCanvasCoordinate(bound, this.params.focusDataY);
            this.c.strokeStyle = this.params.focusCosmeticColour;
            this.c.lineWidth = 2;
            this.c.beginPath();
            this.c.arc(x, y, 2, 0, 2 * Math.PI, false);
            this.c.stroke();
            this.c.beginPath();
            this.c.arc(x, y, this.params.focusCosmeticMaxRadius, 0, 2 * Math.PI, false);
            this.c.stroke();
            this.c.lineWidth = 1;
        }
        */
    };

    drawCursor(bound) {
        if (this.params.currentMouseX == null || this.params.currentMouseY == null) return;
        if (!DetailedCanvas.checkCanvasInRange(bound, this.params.currentMouseX, this.params.currentMouseY)) return;
        const w = bound.callout ? 60 : 70;
        const h = 16;
        this.c.strokeStyle = this.params.cursorColour;
        this.c.beginPath();
        this.c.moveTo(bound.left, this.params.currentMouseY + 0.5);
        this.c.lineTo(this.params.currentMouseX - this.params.cursorXGap, this.params.currentMouseY + 0.5);
        this.c.moveTo(this.params.currentMouseX + this.params.cursorXGap, this.params.currentMouseY + 0.5);
        this.c.lineTo(bound.left + bound.width, this.params.currentMouseY + 0.5);
        this.c.moveTo(this.params.currentMouseX + 0.5, bound.top);
        this.c.lineTo(this.params.currentMouseX + 0.5, this.params.currentMouseY - this.params.cursorYGap);
        this.c.moveTo(this.params.currentMouseX + 0.5, this.params.currentMouseY + this.params.cursorYGap);
        this.c.lineTo(this.params.currentMouseX + 0.5, bound.top + bound.height);
        this.c.stroke();
        this.c.beginPath();
        this.c.moveTo(bound.left, this.params.currentMouseY + 0.5);
        this.c.lineTo(bound.left - 5, this.params.currentMouseY + h / 2);
        this.c.lineTo(bound.left - w, this.params.currentMouseY + h / 2);
        this.c.lineTo(bound.left - w, this.params.currentMouseY - h / 2);
        this.c.lineTo(bound.left - 5, this.params.currentMouseY - h / 2);
        this.c.closePath();
        this.c.fillStyle = this.params.cursorColour;
        this.c.fill();
        this.c.fillStyle = this.params.cursorTextColour;
        this.c.textAlign = 'right';
        this.c.textBaseline = 'middle';
        this.c.fillText(DetailedCanvas.convertCanvasYCoordinateToDataPoint(bound, this.params.currentMouseY + 0.5).toFixed(1), bound.left - 10, this.params.currentMouseY);
        this.c.beginPath();
        const y = bound.top + bound.height;
        this.c.moveTo(this.params.currentMouseX, y);
        this.c.lineTo(this.params.currentMouseX + w / 2, y + 5);
        this.c.lineTo(this.params.currentMouseX + w / 2, y + 5 + h);
        this.c.lineTo(this.params.currentMouseX - w / 2, y + 5 + h);
        this.c.lineTo(this.params.currentMouseX - w / 2, y + 5);
        this.c.closePath();
        this.c.fillStyle = this.params.cursorColour;
        this.c.fill();
        this.c.fillStyle = this.params.cursorTextColour;
        this.c.textAlign = 'center';
        this.c.textBaseline = 'top';
        this.c.fillText(DetailedCanvas.convertCanvasXCoordinateToDataPoint(bound, this.params.currentMouseX + 0.5).toFixed(1), this.params.currentMouseX + 0.5, y + 5)

    };

    selectCalloutWindowsVega(wavelength, intensity, callout_redshift,totalwidth,totalheight) {
        /*
        this.params.baseData = this.params.data.where(x => {
            return x.id === 'data';
        }).toArray();

        if (!this.params.baseData.length)
            this.params.baseData = null;
        else
            this.params.baseData = this.params.baseData[0];
            */

        let ymin = 99999999;
        let ymax = -999999999;
        for (let i=0;i<intensity.length;i++) {
            if (intensity[i]<ymin) {
                ymin = intensity[i];
            }
            if (intensity[i]>ymax) {
                ymax = intensity[i];
            }
        }

        const redshift = parseFloat(callout_redshift);
        let start = wavelength[0];
        let end = wavelength[wavelength.length - 1];

        const desiredNumberOfCallouts = Math.min(Math.floor(totalwidth / this.minCalloutWidth), this.maxCallouts);

        if (wavelength.length > 0 && !isNaN(redshift)) {
            start = wavelength[0];
            end = wavelength[wavelength.length - 1];
        }

        const availableCallouts = this.possiblecallouts.where(c => {
            const zmean = ((1 + redshift) * c[0] + (1 + redshift) * c[1]) / 2.;
            return zmean >= start && zmean <= end;
        }).toArray();

        const numCallouts = Math.min(desiredNumberOfCallouts, availableCallouts.length);
        let result = [];
        result.push({
            xMin: start,
            xMax: end,
            yMin: ymin,
            yMax: ymax,
            callout: false,
            lockedBounds: false
        });
        result[0].callout = false;
        result[0].left = 0;
        result[0].top = 0;
        result[0].bottom = totalheight;
        result[0].right = totalwidth;
        result[0].height = totalheight;
        result[0].width = totalwidth;

        while (availableCallouts.length > numCallouts) {
            let min = 100;
            let index = -1;
            for (let i = 0; i < availableCallouts.length; i++) {
                if (availableCallouts[i][2] < min) {
                    min = availableCallouts[i][2];
                    index = i;
                }
            }
            availableCallouts.splice(index, 1);
        }

        for (let i = 0; i < numCallouts; i++) {
            result.push({
                xMin: availableCallouts[i][0] * (1 + redshift),
                xMax: availableCallouts[i][1] * (1 + redshift),
                yMin: 0,
                yMax: 0,
                callout: true,
                lockedBounds: false
            });
        }

        if (this.callout) {
            const w = (totalwidth / numCallouts);
            const h = Math.floor(totalheight * 0.3);
            let numCallout = 0;
            for (let i = 1; i < result.length; i++) {
                if (result[i].callout) {
                    result[i].left = 60 + w * numCallout;
                    result[i].top = 20 + totalheight - h;
                    result[i].bottom = 20;
                    result[i].right = 10 + (w * (numCallout + 1));
                    result[i].height = h - 40;
                    result[i].width = w - 60;
                    numCallout++;
                }
            }
        }
        return result;
    };

    handleRedrawRequest() {
        /*
        this.refreshSettings();
        this.clearPlot();
        if (this.showXcor())
            this.plotxcorData();
        
        this.params.requested = false;
        */
    };

    downloadImage() {
        /*
        this.setScale(2.0);
        this.refreshSettings();
        this.clearPlot(true);
        if (this.showXcor())
            this.plotxcorData();
        const d = this.refs.canvas.toDataURL("image/png");
        const w = window.open('about:blank', 'image from canvas');
        w.document.write("<img src='" + d + "' alt='from canvas'/>");
        this.setScale();
        this.handleRedrawRequest();
        */
    };

    redraw() {
        console.log("REQUEST REDRAW");
        if (!this.params.requested) {
            this.params.requested = true;
            window.setTimeout(() => this.handleRedrawRequest(), 1000 / 60);
        }

    };

    smoothData(id) {
        const smooth = parseInt(this.detailed.smooth);
        const data = this.params.data.toArray();
        for (let i = 0; i < this.params.data.count(); i++) {
            if (data[i].id === id) {
                data[i].y2 = fastSmooth(data[i].y, smooth);
                let ys2 = data[i].y2.slice(this.params.startRawTruncate);
                ys2 = ys2.sort(function (a, b) {
                    if (!isFinite(a - b)) {
                        return !isFinite(a) ? -1 : 1;
                    } else {
                        return a - b;
                    }
                });
                const numPoints = ys2.length;
                let k;
                for (k = 0; k < numPoints; k++) {
                    if (isFinite(ys2[k])) {
                        break;
                    }
                }
                const yMins = [], yMaxs = [];
                for (let j = 0; j < this.detailed.ranges.length; j++) {
                    let range = this.detailed.ranges[j];
                    yMins.push(ys2[Math.floor(0.01 * (100 - range) * (numPoints - k)) + k]);
                    yMaxs.push(ys2[Math.ceil(0.01 * (range) * (numPoints - 1 - k)) + k]);
                }
                data[i].yMins = yMins;
                data[i].yMaxs = yMaxs;
            }
        }
    };

    // getActiveHash() {
    //     if (this.ui.active == null) return "";
    //     return this.ui.active.getHash();
    // };
    //
    addxcorData() {
        // cheap operation
        if (this.ui.active == null || this.ui.active.templateResults == null) {
            this.params.xcorData = null;
        } else {
            this.params.xcorData = this.ui.active.templateResults[this.detailed.templateId];
        }
    };

    addBaseData() {
        // Remove any existing data or variance from the data array
        this.params.data = this.params.data.where(x => x.id !== 'data' && x.id !== 'variance');

        if (this.ui.active != null) {
            let ys = null;
            let xs = null;
            let colour = "#000";
            if (this.ui.dataSelection.processed && this.ui.active.processedLambdaPlot != null) {
                xs = this.ui.active.processedLambdaPlot;
                ys = this.detailed.continuum ? this.ui.active.processedContinuum : this.ui.active.processedIntensity2;
                colour = this.ui.colours.processed;
            } else {
                ys = this.detailed.continuum ? this.ui.active.intensityPlot : this.ui.active.getIntensitySubtracted();
                xs = this.ui.active.lambda;
                colour = this.ui.colours.raw;
            }
            const xs2 = xs.slice();
            xs2.sort(function (a, b) {
                return a - b;
            });
            const xMin = xs2[this.params.startRawTruncate];
            const xMax = xs2[xs2.length - 1];

            this.params.baseData = {
                id: 'data', bound: true, colour: colour, x: xs, y: ys, xMin: xMin,
                xMax: xMax
            };
            this.params.data = this.params.data.concat([this.params.baseData]);
            if (this.ui.dataSelection.variance) {
                if (this.ui.dataSelection.processed && this.ui.active.processedVariancePlot != null) {
                    ys = this.ui.active.processedVariancePlot;
                } else {
                    ys = this.ui.active.variancePlot;
                }
                this.params.data = this.params.data.concat(
                    [
                        {id: 'variance', bound: false, colour: this.ui.colours.variance, x: xs, y: ys}
                    ]
                );
            }
            this.smoothData('data');
        }
        this.params.data.orderBy(a => a.id);
    };
    addBaseDataAll() {
        // Remove any existing data or variance from the data array
        this.params.data = this.params.data.where(x => x.id !== 'data' && x.id !== 'variance');

        let colors = [];
        colors.push("#a6cee3");
        colors.push("#1f78b4");
        colors.push("#b2df8a");
        colors.push("#33a02c");
        colors.push("#fb9a99");
        colors.push("#e31a1c");
        colors.push("#fdbf6f");
        colors.push("#ff7f00");
        colors.push("#cab2d6");
        colors.push("#6a3d9a");
        colors.push("#ffff99");
        colors.push("#b15928");
        let count=0;
        for (let index in this.props.data.spectra)
        {
            count++;
            let spectra = this.props.data.spectra[index];
            let ys = null;
            let xs = null;
            let colour = "#000";
            if (this.ui.dataSelection.processed && spectra.processedLambdaPlot != null) {
                xs = spectra.processedLambdaPlot;
                ys = this.detailed.continuum ? spectra.processedContinuum : spectra.processedIntensity2;
                colour = this.ui.colours.processed;
            } else {
                ys = this.detailed.continuum ? spectra.intensityPlot : spectra.getIntensitySubtracted();
                xs = spectra.lambda;
                colour = this.ui.colours.raw;
            }
            colour = colors[count%colors.length];
            const xs2 = xs.slice();
            xs2.sort(function (a, b) {
                return a - b;
            });
            const xMin = xs2[this.params.startRawTruncate];
            const xMax = xs2[xs2.length - 1];

            this.params.baseData = {
                id: 'data', bound: true, colour: colour, x: xs, y: ys, xMin: xMin,
                xMax: xMax
            };
            this.params.data = this.params.data.concat([this.params.baseData]);
            // show only if user wants to
            if (this.ui.dataSelection.variance) {
                if (this.ui.dataSelection.processed && spectra.processedVariancePlot != null) {
                    ys = spectra.processedVariancePlot;
                } else {
                    ys = spectra.variancePlot;
                }
                this.params.data = this.params.data.concat(
                    [
                        {id: 'variance', bound: false, colour: this.ui.colours.variance, x: xs, y: ys}
                    ]
                );
            }
        }
        this.smoothData('data');
        this.params.setup = true;
        this.params.data.orderBy(a => a.id);
    };

    addSkyData() {
        this.params.data = this.params.data.where(x => x.id !== 'sky');

        if (this.ui.active != null && this.ui.active.sky != null) {
            // show only if user wants to
            if (this.ui.dataSelection.sky) {
                this.params.data = this.params.data.concat(
                    [
                        {
                            id: 'sky',
                            colour: this.ui.colours.sky,
                            bound: false,
                            x: this.ui.active.lambda,
                            y: this.ui.active.sky
                        }
                    ]
                );
            }
        }
    };

    addTemplateData() {
        this.params.data = this.params.data.where(x => x.id !== 'template');

        if (this.detailed.templateId !== "0" && this.ui.dataSelection.matched) {
            let h = null;
            let c = null;
            if (this.ui.active != null) {
                h = this.ui.active.helio;
                c = this.ui.active.cmb;
            }
            let r = this.templateManager.getTemplateAtRedshift(this.detailed.templateId,
                adjustRedshift(parseFloat(this.detailed.redshift), -h, -c), this.detailed.continuum);
            this.params.data = this.params.data.concat(
                [
                    {id: "template", colour: this.ui.colours.matched, x: r[0], y: r[1]}
                ]
            );
        }

        this.params.data.orderBy(a => a.id);
    };
}

export {
    DetailedCanvas,
    updateBaseData,
    updateSkyData,
    updateSmoothData,
    updateTemplateData,
    updateXcorData,
    updateCanvas
};