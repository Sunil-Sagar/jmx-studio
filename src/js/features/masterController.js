// Master Controller - Scenario & Slave Scaling
// Controls global scaling of thread groups and TPS

export function initMasterController() {
    console.log('Master Controller initialized');
}

export function calculatePerformanceSummary() {
    const jmxDoc = window.appState.jmxDocument;
    if (!jmxDoc) {
        return {
            activeGroups: 0,
            totalGroups: 0,
            originalUsers: 0,
            scaledUsers: 0,
            originalTPS: 0,
            scaledTPS: 0
        };
    }

    const masterScale = parseFloat(document.getElementById('masterScale').value) || 100;
    const slaveCount = parseInt(document.getElementById('slaveCount').value) || 1;
    const scaleMultiplier = masterScale / 100;

    // Get all thread groups
    const threadGroups = jmxDoc.getElementsByTagName('ThreadGroup');
    let totalGroups = threadGroups.length;
    let activeGroups = 0;
    let originalUsers = 0;
    let scaledUsers = 0;

    // Count active groups and users
    for (let i = 0; i < threadGroups.length; i++) {
        const tg = threadGroups[i];
        const enabled = tg.getAttribute('enabled') !== 'false';
        
        if (enabled) {
            activeGroups++;
            
            // Get num_threads (user count) - check both intProp and stringProp
            let users = 0;
            const intProps = tg.getElementsByTagName('intProp');
            for (let j = 0; j < intProps.length; j++) {
                if (intProps[j].getAttribute('name') === 'ThreadGroup.num_threads') {
                    users = parseInt(intProps[j].textContent) || 0;
                    break;
                }
            }
            if (users === 0) {
                const stringProps = tg.getElementsByTagName('stringProp');
                for (let j = 0; j < stringProps.length; j++) {
                    if (stringProps[j].getAttribute('name') === 'ThreadGroup.num_threads') {
                        users = parseInt(stringProps[j].textContent) || 0;
                        break;
                    }
                }
            }
            originalUsers += users;
            scaledUsers += Math.round(users * scaleMultiplier);
        }
    }

    // Apply slave multiplier
    scaledUsers *= slaveCount;

    // Calculate TPS (0 if no timers found)
    const originalTPS = calculateTPS();
    const scaledTPS = originalTPS > 0 ? (originalTPS * scaleMultiplier * slaveCount) : 0;

    return {
        activeGroups,
        totalGroups,
        originalUsers,
        scaledUsers,
        originalTPS: originalTPS > 0 ? originalTPS.toFixed(2) : 'N/A',
        scaledTPS: scaledTPS > 0 ? scaledTPS.toFixed(2) : 'N/A'
    };
}

function calculateTPS() {
    const jmxDoc = window.appState.jmxDocument;
    if (!jmxDoc) return 0;

    // Look for Constant Throughput Timer or Precise Throughput Timer
    const constTimers = jmxDoc.getElementsByTagName('ConstantThroughputTimer');
    const preciseTimers = jmxDoc.getElementsByTagName('PreciseThroughputTimer');
    
    let totalTPS = 0;

    // Check Constant Throughput Timers
    for (let i = 0; i < constTimers.length; i++) {
        const props = constTimers[i].getElementsByTagName('doubleProp');
        for (let j = 0; j < props.length; j++) {
            if (props[j].getAttribute('name') === 'throughput') {
                // Throughput is in samples per minute, convert to TPS
                const samplesPerMinute = parseFloat(props[j].textContent) || 0;
                totalTPS += samplesPerMinute / 60;
                break;
            }
        }
    }

    // Check Precise Throughput Timers
    for (let i = 0; i < preciseTimers.length; i++) {
        const timer = preciseTimers[i];
        const enabled = timer.getAttribute('enabled') !== 'false';
        
        if (enabled) {
            const doubleProps = timer.getElementsByTagName('doubleProp');
            for (let j = 0; j < doubleProps.length; j++) {
                const nameElement = doubleProps[j].getElementsByTagName('name')[0];
                if (nameElement && nameElement.textContent === 'throughput') {
                    const valueElement = doubleProps[j].getElementsByTagName('value')[0];
                    if (valueElement) {
                        const tps = parseFloat(valueElement.textContent) || 0;
                        totalTPS += tps;
                        break;
                    }
                }
            }
        }
    }

    // If no timers found, return 0 to display N/A
    return totalTPS;
}

function calculateBasicMetrics() {
    const jmxDoc = window.appState.jmxDocument;
    if (!jmxDoc) return { originalUsers: 0 };

    const threadGroups = jmxDoc.getElementsByTagName('ThreadGroup');
    let originalUsers = 0;

    for (let i = 0; i < threadGroups.length; i++) {
        const tg = threadGroups[i];
        const enabled = tg.getAttribute('enabled') !== 'false';
        
        if (enabled) {
            // Check both intProp and stringProp
            let users = 0;
            const intProps = tg.getElementsByTagName('intProp');
            for (let j = 0; j < intProps.length; j++) {
                if (intProps[j].getAttribute('name') === 'ThreadGroup.num_threads') {
                    users = parseInt(intProps[j].textContent) || 0;
                    break;
                }
            }
            if (users === 0) {
                const stringProps = tg.getElementsByTagName('stringProp');
                for (let j = 0; j < stringProps.length; j++) {
                    if (stringProps[j].getAttribute('name') === 'ThreadGroup.num_threads') {
                        users = parseInt(stringProps[j].textContent) || 0;
                        break;
                    }
                }
            }
            originalUsers += users;
        }
    }

    return { originalUsers };
}

export function updatePerformanceSummary() {
    const summary = calculatePerformanceSummary();
    
    document.getElementById('activeGroups').textContent = `${summary.activeGroups} / ${summary.totalGroups}`;
    document.getElementById('originalUsers').textContent = summary.originalUsers;
    document.getElementById('scaledUsers').textContent = summary.scaledUsers;
    document.getElementById('originalTPS').textContent = summary.originalTPS;
    document.getElementById('scaledTPS').textContent = summary.scaledTPS;
}

export function applyMasterScale() {
    const jmxDoc = window.appState.jmxDocument;
    if (!jmxDoc) {
        showToast('No JMX file loaded', 'error');
        return { success: false, error: 'No JMX file loaded' };
    }

    const masterScale = parseFloat(document.getElementById('masterScale').value) || 100;
    const scaleMultiplier = masterScale / 100;

    if (scaleMultiplier <= 0) {
        showToast('Scale percentage must be greater than 0', 'error');
        return { success: false, error: 'Invalid scale percentage' };
    }

    const threadGroups = window.appState.threadGroupData || [];
    const originalCounts = window.appState.originalThreadGroupCounts || [];
    let scaledCount = 0;

    try {
        // Parse XML once (Edge-safe)
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(window.appState.jmxData, 'text/xml');
        
        // Check for parse errors (Edge compatibility)
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('XML parsing failed');
        }
        
        const allThreadGroups = xmlDoc.querySelectorAll('ThreadGroup, com.blazemeter.jmeter.threads.concurrency.ConcurrencyThreadGroup, com.octoperf.jmeter.OctoPerfThreadGroup');

    // Update both XML document and threadGroupData
    threadGroups.forEach((tg, index) => {
        if (tg.status) { // Only scale enabled thread groups
            // Use original count as baseline
            const originalUsers = originalCounts[index];
            const scaledUsers = Math.max(1, Math.round(originalUsers * scaleMultiplier));
            
            // Update threadGroupData in appState directly
            tg.count = scaledUsers;
            window.appState.threadGroupData[index].count = scaledUsers;
            
            // Update XML element
            if (index < allThreadGroups.length) {
                const tgElement = allThreadGroups[index];
                
                // Update standard ThreadGroup
                const numThreadsElement = tgElement.querySelector('stringProp[name="ThreadGroup.num_threads"], intProp[name="ThreadGroup.num_threads"]');
                if (numThreadsElement) {
                    numThreadsElement.textContent = scaledUsers.toString();
                }
                
                // Update ConcurrencyThreadGroup
                const targetLevelElement = tgElement.querySelector('stringProp[name="TargetLevel"]');
                if (targetLevelElement) {
                    targetLevelElement.textContent = scaledUsers.toString();
                }
                
                scaledCount++;
            }
        }
    });
    
    // Serialize once after all updates (Edge-safe)
    const serializer = new XMLSerializer();
    window.appState.jmxData = serializer.serializeToString(xmlDoc);
    window.appState.jmxDocument = xmlDoc;

    // Update performance summary
    updatePerformanceSummary();

    return { success: true, scaledCount };
    
    } catch (error) {
        console.error('Error in applyMasterScale:', error);
        showToast('Error applying scaling: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

export function setMasterScale(percentage) {
    document.getElementById('masterScale').value = percentage;
    updatePerformanceSummary();
}
