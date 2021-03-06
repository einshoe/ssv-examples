import * as React from "react";
import Header from "./Header";
import Overview from "./Pages/Overview";
import Sidebar from "./Sidebar";
import {MemoryRouter, BrowserRouter, Route} from "react-router-dom";
import Usage from "./Pages/Usage";
import Footer from "./Footer";
import Detailed from "./Pages/Detailed";
import {storeReady} from "../Stores/StoreUtils";
import Settings from "./Pages/Settings";
import Templates from "./Pages/Templates";
import {isSmall} from "../Utils/dry_helpers";
import {templateManager} from "../AutoRedshift/Lib/TemplateManager";
import {KeyBindings} from "./KeyBindings";
import {globalConfig} from "../Lib/config";
import {MarzInbuildTemplates} from "../plugins/MarzInbuiltTemplates";
import {MarzSpectrumLines} from "../plugins/MarzSpectrumLines";
import {HelloWorldDropPin} from "../plugins/HelloWorldDropPin";

import axios from "axios";

const Router = process.env.NODE_ENV === 'development' ? BrowserRouter : MemoryRouter;

// Enable the one shot store ready event trigger
let loaded = false;

function MarzApp(props) {
    // If this is the first time that the main application is rendered, also trigger a store ready event
    if (!loaded) {
        // Make sure this is a one shot event
        loaded = true;
        
        // Wait for the render to complete then call the store ready event
        setTimeout(() => {
            //templateManager.initialise();   // This is a good place since we will have "window" and no workers will have started yet
            //globalConfig.ssv.setTemplates(templateManager.getTemplates());
            globalConfig.ssv.plugin_register({"name":"dropPin","exec":HelloWorldDropPin});
            globalConfig.ssv.plugin_register({"name":"loadSpectraLines","exec":MarzSpectrumLines});
            globalConfig.ssv.plugin_register({"name":"loadTemplates","exec":MarzInbuildTemplates});

            globalConfig.ssv.initialise();
            templateManager.setOriginalTemplates(globalConfig.ssv.plugin_getValue("loadTemplates"));
            console.log("START A");
            axios
        .get(`http://localhost:8000/fitslist/`)
        .then(res => {
            console.log("RENDER INIT",res.data);
            globalConfig.available = res.data;
        });
            console.log("START B");
            storeReady();
        }, 0)
    }

    return (
        <Router>
            <Route render={(routeProps) => (
                <div>
                    {
                        window.marz_configuration.layout == 'MarzSpectrumView' ?
                        (
                            <div>
                                <KeyBindings {...props} {...routeProps}/>
                                <Header {...props}/>
                            </div>
                        ) : null
                    }
                    <div id="underNavContainer">
                        {
                            (window.marz_configuration.layout == 'MarzSpectrumView') ?
                            (
                                <div className={"sidebar" + (isSmall({...props, ...routeProps}) ? " sidebarSmall" : "")}>
                                    <Sidebar {...props} {...routeProps}/>
                                </div>
                            ) : null
                        }
                        {
                        window.marz_configuration.layout == 'MarzSpectrumView' ?
                        (
                            <div className={"afterSideBarContainer" + (isSmall({...props, ...routeProps}) ? " sidebarSmall" : "")}>
                                <div className="spacing relative">
                                    <Route path="/detailed/"
                                        render={(routeProps) => <Detailed {...props} {...routeProps}/>}/>
                                    <Route exact path="/" render={(routeProps) => <Overview {...props} {...routeProps}/>}/>
                                    <Route path="/usage/" render={(routeProps) => <Usage {...props} {...routeProps}/>}/>
                                    <Route path="/settings/"
                                        render={(routeProps) => <Settings {...props} {...routeProps}/>}/>
                                    <Route path="/templates/"
                                        render={(routeProps) => <Templates {...props} {...routeProps}/>}/>
                                </div>
                            </div>
                        ) : 
                        (
                            <div className="afterSideBarContainer readOnlySpectraContainer">
                                <div className="spacing relative">
                                    <Route path="/"
                                        render={(routeProps) => <Detailed {...props} {...routeProps}/>}/>
                                </div>
                            </div>
                        ) 
                    }
                    </div>
                    {
                        window.marz_configuration.layout == 'MarzSpectrumView' ?
                        (
                            <Footer {...props}/>
                        ) : null
                    }
                    
                </div>
            )}/>
        </Router>
    )
}

export default MarzApp;