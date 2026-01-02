// JMX Modifier - Modify and download JMX

export function applyMasterScale(percent) {
    const factor = percent / 100;
    const state = window.appState;
    
    state.threadGroupData.forEach(tg => {
        const scaledThreads = Math.max(1, Math.ceil(tg.count * factor));
        tg.count = scaledThreads;
        updateThreadCountInXML(tg.element, scaledThreads);
        
        if (tg.throughput > 0) {
            tg.throughput = tg.originalThroughput * factor;
            const tgHashTree = tg.element.nextElementSibling;
            if (tgHashTree && tgHashTree.tagName === "hashTree") {
                updateThroughputInHashTree(tgHashTree, factor);
            }
        }
    });
}

function updateThreadCountInXML(tgElement, count) {
    let updated = false;
    const intProps = tgElement.getElementsByTagName("intProp");
    
    for (let i = 0; i < intProps.length; i++) {
        if (intProps[i].getAttribute("name") === "ThreadGroup.num_threads") {
            intProps[i].textContent = count.toString();
            updated = true;
            break;
        }
    }
    
    if (!updated) {
        const stringProps = tgElement.getElementsByTagName("stringProp");
        for (let i = 0; i < stringProps.length; i++) {
            if (stringProps[i].getAttribute("name") === "ThreadGroup.num_threads") {
                stringProps[i].textContent = count.toString();
                updated = true;
                break;
            }
        }
    }
    
    if (!updated) {
        const jmxDocument = window.appState.jmxDocument;
        const sp = jmxDocument.createElement("stringProp");
        sp.setAttribute("name", "ThreadGroup.num_threads");
        sp.textContent = count.toString();
        tgElement.appendChild(sp);
    }
}

export function updateRampTimeInXML(tgElement, rampTime) {
    let updated = false;
    const stringProps = tgElement.getElementsByTagName("stringProp");
    
    for (let i = 0; i < stringProps.length; i++) {
        if (stringProps[i].getAttribute("name") === "ThreadGroup.ramp_time") {
            stringProps[i].textContent = rampTime.toString();
            updated = true;
            break;
        }
    }
    
    if (!updated) {
        const jmxDocument = window.appState.jmxDocument;
        const sp = jmxDocument.createElement("stringProp");
        sp.setAttribute("name", "ThreadGroup.ramp_time");
        sp.textContent = rampTime.toString();
        tgElement.appendChild(sp);
    }
}

export function updateLoopCountInXML(tgElement, loopCount) {
    const loopController = tgElement.querySelector('elementProp[name="ThreadGroup.main_controller"]');
    if (loopController) {
        let updated = false;
        const intProps = loopController.getElementsByTagName('intProp');
        for (let i = 0; i < intProps.length; i++) {
            if (intProps[i].getAttribute('name') === 'LoopController.loops') {
                intProps[i].textContent = loopCount.toString();
                updated = true;
                break;
            }
        }
        
        if (!updated) {
            const jmxDocument = window.appState.jmxDocument;
            const ip = jmxDocument.createElement("intProp");
            ip.setAttribute("name", "LoopController.loops");
            ip.textContent = loopCount.toString();
            loopController.appendChild(ip);
        }
    }
}

export function updateDurationInXML(tgElement, duration) {
    let updated = false;
    const stringProps = tgElement.getElementsByTagName("stringProp");
    
    for (let i = 0; i < stringProps.length; i++) {
        if (stringProps[i].getAttribute("name") === "ThreadGroup.duration") {
            stringProps[i].textContent = duration.toString();
            updated = true;
            break;
        }
    }
    
    if (!updated) {
        const jmxDocument = window.appState.jmxDocument;
        const sp = jmxDocument.createElement("stringProp");
        sp.setAttribute("name", "ThreadGroup.duration");
        sp.textContent = duration.toString();
        tgElement.appendChild(sp);
    }
}

function updateThroughputInHashTree(hashTree, multiplier) {
    for (let child of hashTree.children) {
        if (child.tagName === "PreciseThroughputTimer") {
            const doubleProps = child.getElementsByTagName("doubleProp");
            for (let dp of doubleProps) {
                if (dp.getAttribute("name") === "throughput") {
                    const current = parseFloat(dp.textContent.trim());
                    if (!isNaN(current)) {
                        dp.textContent = (current * multiplier).toString();
                    }
                }
            }
        }
        if (child.tagName === "hashTree") {
            updateThroughputInHashTree(child, multiplier);
        }
    }
}

export function downloadJMX() {
    // Use jmxData if available (contains latest changes from master scaling)
    // Otherwise fall back to jmxDocument
    const jmxData = window.appState.jmxData;
    const jmxDocument = window.appState.jmxDocument;
    
    if (!jmxData && !jmxDocument) {
        return { success: false, error: 'No JMX loaded' };
    }
    
    try {
        let xmlString;
        
        if (jmxData) {
            // Use jmxData directly (already contains all updates from master scaling)
            xmlString = jmxData;
        } else {
            // Fallback: Update thread group configurations and serialize
            window.appState.threadGroupData.forEach(tg => {
                tg.element.setAttribute("enabled", tg.status.toString());
                updateThreadCountInXML(tg.element, tg.count);
            });
            
            // Serialize to XML
            const serializer = new XMLSerializer();
            xmlString = serializer.serializeToString(jmxDocument);
        }
        
        // Ensure XML declaration
        if (!xmlString.startsWith('<?xml')) {
            xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlString;
        }
        
        // Create download
        const blob = new Blob([xmlString], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'modified_test_plan.jmx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return { success: true };
    } catch (error) {
        console.error('Download error:', error);
        return { success: false, error: error.message };
    }
}
