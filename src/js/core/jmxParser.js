// JMX Parser - Extract data from JMX XML

export function parseJMX(xmlString) {
    const parser = new DOMParser();
    const jmxDocument = parser.parseFromString(xmlString, "text/xml");
    
    // Check for parse errors
    if (jmxDocument.querySelector('parsererror')) {
        return { error: 'Invalid XML format' };
    }
    
    // Extract all components
    const globalVariables = extractGlobalVariables(jmxDocument);
    const threadGroupData = extractThreadGroups(jmxDocument);
    const samplers = extractSamplers(jmxDocument);
    const csvConfigs = extractCSVConfigs(jmxDocument);
    const timers = extractTimers(jmxDocument);
    
    return {
        jmxDocument,
        globalVariables,
        threadGroupData,
        samplers,
        csvConfigs,
        timers,
        userDefinedVariables: extractUserDefinedVariables(jmxDocument).variables,
        userDefinedVariablesElement: extractUserDefinedVariables(jmxDocument).element
    };
}

export function extractGlobalVariables(jmxDocument) {
    const argumentsList = jmxDocument.getElementsByTagName("Arguments");
    const variables = { rampup: "N/A", steadyState: "N/A", custom: {} };
    
    for (let i = 0; i < argumentsList.length; i++) {
        const arg = argumentsList[i];
        const testname = arg.getAttribute("testname");
        
        if (testname === "rampupSteadyDuration") {
            const elements = arg.getElementsByTagName("elementProp");
            for (let j = 0; j < elements.length; j++) {
                const nameNode = elements[j].getElementsByTagName("stringProp")[0];
                const valueNode = elements[j].getElementsByTagName("stringProp")[1];
                if (nameNode && valueNode) {
                    if (nameNode.textContent === "rampup") {
                        variables.rampup = valueNode.textContent;
                    }
                    if (nameNode.textContent === "steadyState") {
                        variables.steadyState = valueNode.textContent;
                    }
                }
            }
        } else if (testname === "User Defined Variables" || arg.getAttribute("guiclass") === "ArgumentsPanel") {
            // Extract all user-defined variables
            const elements = arg.getElementsByTagName("elementProp");
            for (let j = 0; j < elements.length; j++) {
                const nameNode = elements[j].getElementsByTagName("stringProp")[0];
                const valueNode = elements[j].getElementsByTagName("stringProp")[1];
                if (nameNode && valueNode) {
                    const varName = nameNode.textContent;
                    const varValue = valueNode.textContent;
                    variables.custom[varName] = varValue;
                }
            }
        }
    }
    
    return variables;
}

export function extractThreadGroups(jmxDocument) {
    const threadGroups = jmxDocument.getElementsByTagName("ThreadGroup");
    const threadGroupData = [];
    
    for (let i = 0; i < threadGroups.length; i++) {
        const tg = threadGroups[i];
        const name = tg.getAttribute("testname");
        const enabled = tg.getAttribute("enabled") === "true" || tg.getAttribute("enabled") === null;
        
        // Extract user count
        let count = 1;
        const intProps = tg.getElementsByTagName("intProp");
        for (let j = 0; j < intProps.length; j++) {
            if (intProps[j].getAttribute("name") === "ThreadGroup.num_threads") {
                count = parseInt(intProps[j].textContent.trim(), 10);
                break;
            }
        }
        
        // Extract ramp-up time
        let rampTime = 1;
        const stringProps = tg.getElementsByTagName("stringProp");
        for (let j = 0; j < stringProps.length; j++) {
            if (stringProps[j].getAttribute("name") === "ThreadGroup.ramp_time") {
                rampTime = parseInt(stringProps[j].textContent.trim(), 10);
                break;
            }
        }
        
        // Extract duration
        let duration = 0;
        for (let j = 0; j < stringProps.length; j++) {
            if (stringProps[j].getAttribute("name") === "ThreadGroup.duration") {
                duration = parseInt(stringProps[j].textContent.trim(), 10);
                break;
            }
        }
        
        // Extract loops
        let loops = '1';
        const loopController = tg.querySelector('elementProp[name="ThreadGroup.main_controller"]');
        if (loopController) {
            const loopsProps = loopController.getElementsByTagName('stringProp');
            for (let j = 0; j < loopsProps.length; j++) {
                if (loopsProps[j].getAttribute('name') === 'LoopController.loops') {
                    loops = loopsProps[j].textContent.trim();
                    break;
                }
            }
        }
        
        // Extract throughput from PreciseThroughputTimer
        let throughput = 0;
        const tgHashTree = tg.nextElementSibling;
        if (tgHashTree && tgHashTree.tagName === "hashTree") {
            throughput = findThroughputInHashTree(tgHashTree);
        }
        
        threadGroupData.push({
            element: tg,
            name: name,
            count: count,
            originalCount: count,
            rampTime: rampTime,
            originalRampTime: rampTime,
            duration: duration,
            originalDuration: duration,
            loops: loops,
            status: enabled,
            throughput: throughput,
            originalThroughput: throughput
        });
    }
    
    return threadGroupData;
}

function findThroughputInHashTree(hashTree) {
    let throughput = 0;
    for (let child of hashTree.children) {
        if (child.tagName === "PreciseThroughputTimer") {
            const doubleProps = child.getElementsByTagName("doubleProp");
            for (let dp of doubleProps) {
                if (dp.getAttribute("name") === "throughput") {
                    const value = parseFloat(dp.textContent.trim());
                    if (!isNaN(value)) throughput += value;
                }
            }
        }
        if (child.tagName === "hashTree") {
            throughput += findThroughputInHashTree(child);
        }
    }
    return throughput;
}

export function extractSamplers(jmxDocument) {
    const samplers = [];
    const httpSamplers = jmxDocument.getElementsByTagName("HTTPSamplerProxy");
    
    for (let i = 0; i < httpSamplers.length; i++) {
        const sampler = httpSamplers[i];
        const domain = getStringProp(sampler, "HTTPSampler.domain") || '';
        const path = getStringProp(sampler, "HTTPSampler.path") || '';
        const protocol = getStringProp(sampler, "HTTPSampler.protocol") || 'http';
        const method = getStringProp(sampler, "HTTPSampler.method") || 'GET';
        
        // Build full URL
        let url = path;
        if (domain) {
            url = `${protocol}://${domain}${path}`;
        }
        
        samplers.push({
            element: sampler,
            name: sampler.getAttribute("testname") || 'Unnamed Request',
            enabled: sampler.getAttribute("enabled") !== "false",
            domain: domain,
            path: path,
            method: method,
            protocol: protocol,
            url: url,
            originalIndex: i
        });
    }
    
    return samplers;
}

export function extractCSVConfigs(jmxDocument) {
    const csvConfigs = [];
    const csvElements = jmxDocument.getElementsByTagName("CSVDataSet");
    
    for (let i = 0; i < csvElements.length; i++) {
        const csv = csvElements[i];
        csvConfigs.push({
            element: csv,
            name: csv.getAttribute("testname"),
            filename: getStringProp(csv, "filename"),
            variableNames: getStringProp(csv, "variableNames"),
            shareMode: getStringProp(csv, "shareMode")
        });
    }
    
    return csvConfigs;
}

export function extractUserDefinedVariables(jmxDocument) {
    const argumentsList = jmxDocument.getElementsByTagName("Arguments");
    
    for (let i = 0; i < argumentsList.length; i++) {
        const arg = argumentsList[i];
        const testname = arg.getAttribute("testname");
        
        if (testname === "User Defined Variables" || arg.getAttribute("guiclass") === "ArgumentsPanel") {
            const variables = [];
            const collectionProp = arg.querySelector('collectionProp[name="Arguments.arguments"]');
            
            if (collectionProp) {
                const elements = collectionProp.getElementsByTagName("elementProp");
                for (let j = 0; j < elements.length; j++) {
                    const nameNode = elements[j].querySelector('stringProp[name="Argument.name"]');
                    const valueNode = elements[j].querySelector('stringProp[name="Argument.value"]');
                    
                    if (nameNode && valueNode) {
                        variables.push({
                            name: nameNode.textContent,
                            value: valueNode.textContent,
                            element: elements[j]
                        });
                    }
                }
            }
            
            return { variables, element: arg };
        }
    }
    
    return { variables: [], element: null };
}

export function extractTimers(jmxDocument) {
    const timers = [];
    const timerTypes = [
        "ConstantTimer",
        "UniformRandomTimer",
        "GaussianRandomTimer",
        "PreciseThroughputTimer"
    ];
    
    timerTypes.forEach(type => {
        const elements = jmxDocument.getElementsByTagName(type);
        for (let i = 0; i < elements.length; i++) {
            const timer = elements[i];
            timers.push({
                element: timer,
                type: type,
                name: timer.getAttribute("testname"),
                enabled: timer.getAttribute("enabled") !== "false"
            });
        }
    });
    
    return timers;
}

function getStringProp(element, propName) {
    const props = element.getElementsByTagName("stringProp");
    for (let i = 0; i < props.length; i++) {
        if (props[i].getAttribute("name") === propName) {
            return props[i].textContent;
        }
    }
    return "";
}
