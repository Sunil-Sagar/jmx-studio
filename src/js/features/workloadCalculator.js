// Workload Calculator - TPS Scaling & Little's Law
// Feature 5: Per-Thread-Group Calculate VUs, TPS, or Pacing

import { calculateVirtualUsers, calculateTPS, calculatePacing } from '../utils/calculator.js';

export function initWorkloadCalculator() {
    console.log('Workload Calculator initialized');
}

// Get TPS from Performance Summary calculation (same logic)
function getPerformanceSummaryTPS() {
    const jmxDoc = window.appState.jmxDocument;
    if (!jmxDoc) return 0;

    // Look for timers
    const constTimers = jmxDoc.getElementsByTagName('ConstantThroughputTimer');
    const preciseTimers = jmxDoc.getElementsByTagName('PreciseThroughputTimer');
    
    let totalTPS = 0;

    // Check Constant Throughput Timers
    for (let i = 0; i < constTimers.length; i++) {
        const props = constTimers[i].getElementsByTagName('doubleProp');
        for (let j = 0; j < props.length; j++) {
            if (props[j].getAttribute('name') === 'throughput') {
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

    // If no timers found, return null to display N/A
    return totalTPS > 0 ? totalTPS : null;
}

export function renderScalingTable() {
    const threadGroups = window.appState.threadGroupData || [];
    const container = document.getElementById('scalingTableContainer');
    
    if (threadGroups.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <p class="mb-2">No thread groups found</p>
                <p class="text-sm">Load a JMX file to begin workload calculations</p>
            </div>
        `;
        return;
    }
    
    // Get total TPS from Performance Summary method
    const totalCurrentTPS = getPerformanceSummaryTPS();
    const hasTPS = totalCurrentTPS !== null && totalCurrentTPS > 0;
    
    // Calculate total users
    let totalCurrentUsers = 0;
    threadGroups.forEach(tg => {
        totalCurrentUsers += tg.count;
    });
    
    let html = `
        <!-- Global TPS Input -->
        <div class="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
            <div class="grid grid-cols-3 gap-4 items-center">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Current Total TPS</label>
                    <div class="text-2xl font-bold text-gray-900">${hasTPS ? totalCurrentTPS.toFixed(2) : 'N/A'}</div>
                    <div class="text-xs text-gray-500">${totalCurrentUsers} total users</div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Target Total TPS</label>
                    <input type="number" id="target-total-tps" value="${hasTPS ? totalCurrentTPS.toFixed(2) : ''}" min="0.1" step="0.1"
                        class="w-full px-3 py-2 border border-gray-300 rounded text-center text-lg focus:ring-2 focus:ring-green-500" ${!hasTPS ? 'placeholder="No timers found"' : ''}>
                </div>
                <div>
                    <button onclick="calculateScalingFactor()" 
                        class="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                        Calculate Scaling
                    </button>
                </div>
            </div>
            <div id="scaling-result" class="mt-4 text-center hidden">
                <div class="text-sm text-gray-600">Scaling Factor: <span id="scaling-factor" class="font-bold text-green-600 text-xl"></span></div>
            </div>
        </div>

        <!-- Per Thread Group Results -->
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Thread Group</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Current Users</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Current TPS</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Scaled Users</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Scaled TPS</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    threadGroups.forEach((tg, index) => {
        // Distribute total TPS proportionally based on user count
        const tgProportion = tg.count / totalCurrentUsers;
        const tgTPS = totalCurrentTPS * tgProportion;
        
        html += `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-3 py-3 text-sm font-medium text-gray-900">${tg.name}</td>
                <td class="px-3 py-3 text-sm text-center text-gray-700">${tg.count}</td>
                <td class="px-3 py-3 text-sm text-center text-gray-700">${tgTPS.toFixed(2)}</td>
                <td class="px-3 py-3 text-sm text-center">
                    <span id="scaled-users-${index}" class="font-semibold text-green-600">-</span>
                </td>
                <td class="px-3 py-3 text-sm text-center">
                    <span id="scaled-tps-${index}" class="font-semibold text-green-600">-</span>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        
        <div class="mt-4">
            <button onclick="applyScaledValues()" 
                class="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                Apply Scaled Values to All Thread Groups
            </button>
        </div>
        
        <!-- Individual TPS Adjustment Section -->
        <div class="mt-8 border-t border-gray-300 pt-6">
            <h4 class="text-md font-bold text-gray-900 mb-4">📝 Individual TPS Adjustment</h4>
            <p class="text-sm text-gray-600 mb-4">Adjust TPS for each thread group independently</p>
            <div id="individualTPSContainer"></div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Render individual TPS adjustment cards
    renderIndividualTPSCards();
}

function renderIndividualTPSCards() {
    const threadGroups = window.appState.threadGroupData || [];
    const container = document.getElementById('individualTPSContainer');
    
    if (!container) return;
    
    const totalTPS = getPerformanceSummaryTPS();
    const totalUsers = threadGroups.reduce((sum, tg) => sum + tg.count, 0);
    
    let html = '';
    threadGroups.forEach((tg, index) => {
        const tgProportion = tg.count / totalUsers;
        const currentTPS = totalTPS * tgProportion;
        
        html += `
            <div class="bg-white border border-gray-300 rounded-lg p-4 mb-3">
                <div class="flex items-center justify-between mb-3">
                    <h5 class="text-sm font-bold text-gray-900">${tg.name}</h5>
                    <span class="text-xs text-gray-500">TPS/User: ${(currentTPS / tg.count).toFixed(4)}</span>
                </div>
                <div class="grid grid-cols-4 gap-3 items-end">
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Current Users</label>
                        <div class="text-lg font-bold text-gray-900">${tg.count}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Current TPS</label>
                        <div class="text-lg font-bold text-gray-900">${currentTPS.toFixed(2)}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Target TPS</label>
                        <input type="number" id="individual-tps-${index}" value="${currentTPS.toFixed(2)}" min="0.1" step="0.1"
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <button onclick="calculateAndApplyIndividualTPS(${index})" 
                            class="w-full px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors font-medium">
                            Calculate & Apply
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

export function renderWorkloadTable() {
    console.log('renderWorkloadTable called');
    const threadGroups = window.appState.threadGroupData || [];
    const container = document.getElementById('workloadTableContainer');
    
    console.log('threadGroups:', threadGroups.length);
    console.log('container:', container);
    
    if (threadGroups.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <p class="mb-2">No thread groups found</p>
                <p class="text-sm">Load a JMX file to begin workload calculations</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Thread Group</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Current Users</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Calc Users</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Current TPS</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Target TPS</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Total RT<span class="normal-case">(s)</span></th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Total TT<span class="normal-case">(s)</span></th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Pacing<span class="normal-case">(s)</span></th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    threadGroups.forEach((tg, index) => {
        const currentTPS = getCurrentTPS(tg);
        
        html += `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-3 py-3 text-sm font-medium text-gray-900">${tg.name}</td>
                <td class="px-3 py-3 text-sm text-center text-gray-700">${tg.count}</td>
                <td class="px-3 py-3 text-sm text-center">
                    <span id="calc-users-${index}" class="font-semibold text-blue-600">-</span>
                </td>
                <td class="px-3 py-3 text-sm text-center text-gray-700">${currentTPS.toFixed(2)}</td>
                <td class="px-3 py-3 text-center">
                    <input type="number" id="tps-${index}" value="${currentTPS.toFixed(2)}" min="0.1" step="0.1"
                        class="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500">
                </td>
                <td class="px-3 py-3 text-center">
                    <input type="number" id="rt-${index}" value="10" min="0" step="0.1" 
                        class="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500">
                </td>
                <td class="px-3 py-3 text-center">
                    <input type="number" id="tt-${index}" value="12" min="0" step="0.1" 
                        class="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500">
                </td>
                <td class="px-3 py-3 text-center">
                    <input type="number" id="pacing-${index}" value="0" min="0" step="0.1" 
                        class="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500">
                </td>
                <td class="px-3 py-3 text-center">
                    <div class="flex flex-col gap-1">
                        <button onclick="calculateUsersOnly(${index})" 
                            class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium whitespace-nowrap">
                            Calc Users
                        </button>
                        <button onclick="calculateTPSForThreadGroup(${index})" 
                            class="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors font-medium whitespace-nowrap">
                            Calc TPS
                        </button>
                        <button onclick="calculatePacingForThreadGroup(${index})" 
                            class="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors font-medium whitespace-nowrap">
                            Calc Pacing
                        </button>
                        <button onclick="applyCalculatedValues(${index})" 
                            class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium whitespace-nowrap">
                            Apply All
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Get current TPS from throughput timers for a thread group
function getCurrentTPS(threadGroup) {
    const tgHashTree = threadGroup.element.parentElement;
    let totalTPS = 0;
    
    // Check for Precise Throughput Timers (search entire subtree)
    const preciseTimers = tgHashTree.getElementsByTagName('kg.apc.jmeter.timers.VariableThroughputTimer');
    for (let i = 0; i < preciseTimers.length; i++) {
        const timer = preciseTimers[i];
        const enabled = timer.getAttribute('enabled') !== 'false';
        
        if (enabled) {
            const doubleProps = timer.getElementsByTagName('doubleProp');
            for (let j = 0; j < doubleProps.length; j++) {
                const prop = doubleProps[j];
                // Check for simple format: <doubleProp name="throughput">value</doubleProp>
                if (prop.getAttribute('name') === 'throughput') {
                    const directValue = parseFloat(prop.textContent) || 0;
                    if (directValue > 0) {
                        totalTPS += directValue;
                        break;
                    }
                }
                
                // Check for nested format: <doubleProp><name>throughput</name><value>X</value></doubleProp>
                const nameElement = prop.getElementsByTagName('name')[0];
                if (nameElement && nameElement.textContent === 'throughput') {
                    const valueElement = prop.getElementsByTagName('value')[0];
                    if (valueElement) {
                        totalTPS += parseFloat(valueElement.textContent) || 0;
                        break;
                    }
                }
            }
        }
    }
    
    // Check for Constant Throughput Timers (search entire subtree)
    const constTimers = tgHashTree.getElementsByTagName('ConstantThroughputTimer');
    for (let i = 0; i < constTimers.length; i++) {
        const timer = constTimers[i];
        const enabled = timer.getAttribute('enabled') !== 'false';
        
        if (enabled) {
            const doubleProps = timer.getElementsByTagName('doubleProp');
            for (let j = 0; j < doubleProps.length; j++) {
                if (doubleProps[j].getAttribute('name') === 'throughput') {
                    const samplesPerMinute = parseFloat(doubleProps[j].textContent) || 0;
                    totalTPS += samplesPerMinute / 60; // Convert to TPS
                    break;
                }
            }
        }
    }
    
    return totalTPS;
}

export function calculateUsersOnly(threadGroupIndex) {
    const threadGroups = window.appState.threadGroupData || [];
    if (threadGroupIndex < 0 || threadGroupIndex >= threadGroups.length) {
        return { success: false, error: 'Invalid thread group index' };
    }
    
    // Get input values
    const targetTPS = parseFloat(document.getElementById(`tps-${threadGroupIndex}`).value);
    const totalRT = parseFloat(document.getElementById(`rt-${threadGroupIndex}`).value);
    const totalTT = parseFloat(document.getElementById(`tt-${threadGroupIndex}`).value);
    const pacing = parseFloat(document.getElementById(`pacing-${threadGroupIndex}`).value);
    
    // Validate inputs
    if (isNaN(targetTPS) || targetTPS <= 0) {
        return { success: false, error: 'Target TPS must be greater than 0' };
    }
    if (isNaN(totalRT) || totalRT < 0 || isNaN(totalTT) || totalTT < 0 || isNaN(pacing) || pacing < 0) {
        return { success: false, error: 'Response time, think time, and pacing cannot be negative' };
    }
    
    // Calculate virtual users
    const result = calculateVirtualUsers(targetTPS, totalRT, totalTT, pacing);
    const calculatedUsers = Math.ceil(result.vus);
    
    // Display in Calc Users column (don't apply yet)
    document.getElementById(`calc-users-${threadGroupIndex}`).textContent = calculatedUsers;
    document.getElementById(`calc-users-${threadGroupIndex}`).classList.add('text-green-600', 'font-bold');
    
    return { 
        success: true, 
        users: calculatedUsers,
        breakdown: result.breakdown,
        iterationTime: result.iterationTime
    };
}

export function applyCalculatedValues(threadGroupIndex) {
    const threadGroups = window.appState.threadGroupData || [];
    if (threadGroupIndex < 0 || threadGroupIndex >= threadGroups.length) {
        return { success: false, error: 'Invalid thread group index' };
    }
    
    // Get calculated users value
    const calcUsersText = document.getElementById(`calc-users-${threadGroupIndex}`).textContent;
    const calculatedUsers = parseInt(calcUsersText);
    
    if (isNaN(calculatedUsers) || calculatedUsers < 1 || calcUsersText === '-') {
        return { success: false, error: 'Calculate users first before applying' };
    }
    
    // Apply users to thread group
    const threadGroup = threadGroups[threadGroupIndex];
    threadGroup.count = calculatedUsers;
    
    const intProps = threadGroup.element.getElementsByTagName('intProp');
    for (let i = 0; i < intProps.length; i++) {
        if (intProps[i].getAttribute('name') === 'ThreadGroup.num_threads') {
            intProps[i].textContent = calculatedUsers.toString();
            break;
        }
    }
    
    // Apply TPS
    const targetTPS = parseFloat(document.getElementById(`tps-${threadGroupIndex}`).value);
    if (!isNaN(targetTPS) && targetTPS > 0) {
        const jmxDoc = window.appState.jmxDocument;
        addOrUpdateThroughputTimer(threadGroup, targetTPS, jmxDoc);
    }
    
    return { success: true, users: calculatedUsers, tps: targetTPS };
}

export function calculateAndApplyVirtualUsers(threadGroupIndex) {
    const threadGroups = window.appState.threadGroupData || [];
    if (threadGroupIndex < 0 || threadGroupIndex >= threadGroups.length) {
        return { success: false, error: 'Invalid thread group index' };
    }
    
    // Get input values
    const targetTPS = parseFloat(document.getElementById(`tps-${threadGroupIndex}`).value);
    const totalRT = parseFloat(document.getElementById(`rt-${threadGroupIndex}`).value);
    const totalTT = parseFloat(document.getElementById(`tt-${threadGroupIndex}`).value);
    const pacing = parseFloat(document.getElementById(`pacing-${threadGroupIndex}`).value);
    
    // Validate inputs
    if (isNaN(targetTPS) || targetTPS <= 0) {
        return { success: false, error: 'Target TPS must be greater than 0' };
    }
    if (isNaN(totalRT) || totalRT < 0 || isNaN(totalTT) || totalTT < 0 || isNaN(pacing) || pacing < 0) {
        return { success: false, error: 'Response time, think time, and pacing cannot be negative' };
    }
    
    // Calculate virtual users
    const result = calculateVirtualUsers(targetTPS, totalRT, totalTT, pacing);
    const calculatedUsers = Math.ceil(result.vus);
    
    // Apply to thread group
    const threadGroup = threadGroups[threadGroupIndex];
    threadGroup.count = calculatedUsers;
    
    const intProps = threadGroup.element.getElementsByTagName('intProp');
    for (let i = 0; i < intProps.length; i++) {
        if (intProps[i].getAttribute('name') === 'ThreadGroup.num_threads') {
            intProps[i].textContent = calculatedUsers.toString();
            break;
        }
    }
    
    return { 
        success: true, 
        users: calculatedUsers,
        breakdown: result.breakdown,
        iterationTime: result.iterationTime
    };
}

export function calculateTPSForThreadGroup(threadGroupIndex) {
    const threadGroups = window.appState.threadGroupData || [];
    if (threadGroupIndex < 0 || threadGroupIndex >= threadGroups.length) {
        return { success: false, error: 'Invalid thread group index' };
    }
    
    const threadGroup = threadGroups[threadGroupIndex];
    
    // Get input values - use calculated users if available, otherwise current users
    const calcUsersSpan = document.getElementById(`calc-users-${threadGroupIndex}`);
    const calcUsers = calcUsersSpan && calcUsersSpan.textContent !== '-' ? parseInt(calcUsersSpan.textContent) : null;
    const currentUsers = calcUsers || threadGroup.count;
    const totalRT = parseFloat(document.getElementById(`rt-${threadGroupIndex}`).value);
    const totalTT = parseFloat(document.getElementById(`tt-${threadGroupIndex}`).value);
    const pacing = parseFloat(document.getElementById(`pacing-${threadGroupIndex}`).value);
    
    // Validate inputs
    if (currentUsers < 1) {
        return { success: false, error: 'Current users must be at least 1' };
    }
    if (isNaN(totalRT) || totalRT < 0 || isNaN(totalTT) || totalTT < 0 || isNaN(pacing) || pacing < 0) {
        return { success: false, error: 'Response time, think time, and pacing cannot be negative' };
    }
    
    // Calculate TPS
    const result = calculateTPS(currentUsers, totalRT, totalTT, pacing);
    const calculatedTPS = result.tps;
    
    // Update Target TPS field
    document.getElementById(`tps-${threadGroupIndex}`).value = calculatedTPS.toFixed(2);
    
    return { 
        success: true, 
        tps: calculatedTPS,
        breakdown: result.breakdown,
        iterationTime: result.iterationTime
    };
}

export function calculatePacingForThreadGroup(threadGroupIndex) {
    const threadGroups = window.appState.threadGroupData || [];
    if (threadGroupIndex < 0 || threadGroupIndex >= threadGroups.length) {
        return { success: false, error: 'Invalid thread group index' };
    }
    
    const threadGroup = threadGroups[threadGroupIndex];
    
    // Get input values - use calculated users if available, otherwise current users
    const calcUsersSpan = document.getElementById(`calc-users-${threadGroupIndex}`);
    const calcUsers = calcUsersSpan && calcUsersSpan.textContent !== '-' ? parseInt(calcUsersSpan.textContent) : null;
    const currentUsers = calcUsers || threadGroup.count;
    const targetTPS = parseFloat(document.getElementById(`tps-${threadGroupIndex}`).value);
    const totalRT = parseFloat(document.getElementById(`rt-${threadGroupIndex}`).value);
    const totalTT = parseFloat(document.getElementById(`tt-${threadGroupIndex}`).value);
    
    // Validate inputs
    if (currentUsers < 1) {
        return { success: false, error: 'Current users must be at least 1' };
    }
    if (isNaN(targetTPS) || targetTPS <= 0) {
        return { success: false, error: 'Target TPS must be greater than 0' };
    }
    if (isNaN(totalRT) || totalRT < 0 || isNaN(totalTT) || totalTT < 0) {
        return { success: false, error: 'Response time and think time cannot be negative' };
    }
    
    // Calculate Pacing
    const result = calculatePacing(currentUsers, targetTPS, totalRT, totalTT);
    const calculatedPacing = result.pacing;
    
    // Update Pacing field
    document.getElementById(`pacing-${threadGroupIndex}`).value = calculatedPacing.toFixed(2);
    
    return { 
        success: true, 
        pacing: calculatedPacing,
        breakdown: result.breakdown,
        iterationTime: result.iterationTime
    };
}

export function applyTPSToThreadGroup(threadGroupIndex) {
    const threadGroups = window.appState.threadGroupData || [];
    if (threadGroupIndex < 0 || threadGroupIndex >= threadGroups.length) {
        return { success: false, error: 'Invalid thread group index' };
    }
    
    // Get input values
    const targetTPS = parseFloat(document.getElementById(`tps-${threadGroupIndex}`).value);
    
    // Validate inputs
    if (isNaN(targetTPS) || targetTPS <= 0) {
        return { success: false, error: 'Target TPS must be greater than 0' };
    }
    
    const threadGroup = threadGroups[threadGroupIndex];
    const jmxDoc = window.appState.jmxDocument;
    
    // Smart detection and update
    const result = addOrUpdateThroughputTimer(threadGroup, targetTPS, jmxDoc);
    
    return result;
}

export function calculateAndApplyTPS(threadGroupIndex) {
    const threadGroups = window.appState.threadGroupData || [];
    if (threadGroupIndex < 0 || threadGroupIndex >= threadGroups.length) {
        return { success: false, error: 'Invalid thread group index' };
    }
    
    // Get input values
    const targetTPS = parseFloat(document.getElementById(`tps-${threadGroupIndex}`).value);
    
    // Validate inputs
    if (isNaN(targetTPS) || targetTPS <= 0) {
        return { success: false, error: 'Target TPS must be greater than 0' };
    }
    
    const threadGroup = threadGroups[threadGroupIndex];
    const jmxDoc = window.appState.jmxDocument;
    
    // Smart detection and update
    const result = addOrUpdateThroughputTimer(threadGroup, targetTPS, jmxDoc);
    
    return result;
}

function addOrUpdateThroughputTimer(threadGroup, targetTPS, jmxDoc) {
    const tgElement = threadGroup.element;
    const tgHashTree = tgElement.nextElementSibling;
    
    if (!tgHashTree || tgHashTree.tagName !== 'hashTree') {
        return { success: false, error: 'Invalid thread group structure' };
    }
    
    // Check for existing throughput timers (ignore think time timers)
    let existingTimer = null;
    let timerType = null;
    
    // Check for Precise Throughput Timer
    const preciseTimers = tgHashTree.getElementsByTagName('PreciseThroughputTimer');
    if (preciseTimers.length > 0) {
        existingTimer = preciseTimers[0];
        timerType = 'PreciseThroughputTimer';
    }
    
    // Check for Constant Throughput Timer
    if (!existingTimer) {
        const constTimers = tgHashTree.getElementsByTagName('ConstantThroughputTimer');
        if (constTimers.length > 0) {
            existingTimer = constTimers[0];
            timerType = 'ConstantThroughputTimer';
        }
    }
    
    if (existingTimer) {
        // UPDATE existing timer
        if (timerType === 'PreciseThroughputTimer') {
            const doubleProps = existingTimer.getElementsByTagName('doubleProp');
            let updated = false;
            
            for (let i = 0; i < doubleProps.length; i++) {
                const prop = doubleProps[i];
                
                // Check for simple format: <doubleProp name="throughput">value</doubleProp>
                if (prop.getAttribute('name') === 'throughput') {
                    // Check if it has nested structure
                    const valueElement = prop.getElementsByTagName('value')[0];
                    if (valueElement) {
                        // Nested format: update <value> element
                        valueElement.textContent = targetTPS.toString();
                    } else {
                        // Simple format: update direct text content
                        prop.textContent = targetTPS.toString();
                    }
                    updated = true;
                    break;
                }
            }
            
            if (updated) {
                return { success: true, action: 'updated', tps: targetTPS };
            }
        } else if (timerType === 'ConstantThroughputTimer') {
            const doubleProps = existingTimer.getElementsByTagName('doubleProp');
            for (let i = 0; i < doubleProps.length; i++) {
                if (doubleProps[i].getAttribute('name') === 'throughput') {
                    const samplesPerMinute = targetTPS * 60;
                    doubleProps[i].textContent = samplesPerMinute.toString();
                    return { success: true, action: 'updated', tps: targetTPS };
                }
            }
        }
    }
    
    // ADD new Precise Throughput Timer
    const timer = jmxDoc.createElement('PreciseThroughputTimer');
    timer.setAttribute('guiclass', 'TestBeanGUI');
    timer.setAttribute('testclass', 'PreciseThroughputTimer');
    timer.setAttribute('testname', `TPS Controller - ${threadGroup.name}`);
    timer.setAttribute('enabled', 'true');
    
    // Throughput (TPS)
    const throughputProp = jmxDoc.createElement('doubleProp');
    throughputProp.setAttribute('name', 'throughput');
    throughputProp.textContent = targetTPS.toString();
    
    // Throughput period (seconds)
    const periodProp = jmxDoc.createElement('intProp');
    periodProp.setAttribute('name', 'throughputPeriod');
    periodProp.textContent = '3600';
    
    // Test duration (seconds)
    const durationProp = jmxDoc.createElement('longProp');
    durationProp.setAttribute('name', 'duration');
    durationProp.textContent = '3600';
    
    // Random seed
    const seedProp = jmxDoc.createElement('longProp');
    seedProp.setAttribute('name', 'randomSeed');
    seedProp.textContent = '0';
    
    // Exact limit
    const exactLimitProp = jmxDoc.createElement('intProp');
    exactLimitProp.setAttribute('name', 'exactLimit');
    exactLimitProp.textContent = '10000';
    
    timer.appendChild(throughputProp);
    timer.appendChild(periodProp);
    timer.appendChild(durationProp);
    timer.appendChild(seedProp);
    timer.appendChild(exactLimitProp);
    
    // Add timer to thread group hashTree
    tgHashTree.appendChild(timer);
    
    // Add empty hashTree after timer
    const emptyHashTree = jmxDoc.createElement('hashTree');
    tgHashTree.appendChild(emptyHashTree);
    
    return { success: true, action: 'added', tps: targetTPS };
}

// TPS Scaling Calculator Functions
export function calculateScalingFactor() {
    const threadGroups = window.appState.threadGroupData || [];
    const targetTotalTPS = parseFloat(document.getElementById('target-total-tps').value);
    
    if (isNaN(targetTotalTPS) || targetTotalTPS <= 0) {
        alert('Please enter a valid target TPS');
        return;
    }
    
    // Get total current TPS from Performance Summary method
    const totalCurrentTPS = getPerformanceSummaryTPS();
    
    if (totalCurrentTPS === 0) {
        alert('Current TPS is 0. Cannot calculate scaling factor.');
        return;
    }
    
    // Calculate total users
    let totalCurrentUsers = 0;
    threadGroups.forEach(tg => totalCurrentUsers += tg.count);
    
    // Calculate scaling factor
    const scalingFactor = targetTotalTPS / totalCurrentTPS;
    
    // Display scaling factor
    document.getElementById('scaling-factor').textContent = scalingFactor.toFixed(2) + 'x';
    document.getElementById('scaling-result').classList.remove('hidden');
    
    // Calculate and display scaled values for each thread group
    threadGroups.forEach((tg, index) => {
        // Current TPS distributed proportionally
        const tgProportion = tg.count / totalCurrentUsers;
        const currentTPS = totalCurrentTPS * tgProportion;
        
        const scaledUsers = Math.ceil(tg.count * scalingFactor);
        const scaledTPS = currentTPS * scalingFactor;
        
        document.getElementById(`scaled-users-${index}`).textContent = scaledUsers;
        document.getElementById(`scaled-tps-${index}`).textContent = scaledTPS.toFixed(2);
    });
}

export function applyScaledValues() {
    const threadGroups = window.appState.threadGroupData || [];
    const targetTotalTPS = parseFloat(document.getElementById('target-total-tps').value);
    
    if (isNaN(targetTotalTPS) || targetTotalTPS <= 0) {
        alert('Please calculate scaling first');
        return;
    }
    
    // Get total current TPS
    const totalCurrentTPS = getPerformanceSummaryTPS();
    const scalingFactor = targetTotalTPS / totalCurrentTPS;
    
    // Calculate total users
    let totalCurrentUsers = 0;
    threadGroups.forEach(tg => totalCurrentUsers += tg.count);
    
    // Apply scaled values to all thread groups
    let appliedCount = 0;
    threadGroups.forEach((tg, index) => {
        // Current TPS distributed proportionally
        const tgProportion = tg.count / totalCurrentUsers;
        const currentTPS = totalCurrentTPS * tgProportion;
        
        const scaledUsers = Math.ceil(tg.count * scalingFactor);
        const scaledTPS = currentTPS * scalingFactor;
        
        // Update users in thread group
        tg.count = scaledUsers;
        const intProps = tg.element.getElementsByTagName('intProp');
        for (let i = 0; i < intProps.length; i++) {
            if (intProps[i].getAttribute('name') === 'ThreadGroup.num_threads') {
                intProps[i].textContent = scaledUsers.toString();
                break;
            }
        }
        
        // Update TPS timer
        const jmxDoc = window.appState.jmxDocument;
        addOrUpdateThroughputTimer(tg, scaledTPS, jmxDoc);
        
        appliedCount++;
    });
    
    alert(`Applied scaling to ${appliedCount} thread groups!`);
    
    // Refresh tables - these are global window functions
    if (typeof window.renderThreadGroupsTable === 'function') {
        window.renderThreadGroupsTable();
    }
    renderScalingTable();
}

/**
 * Calculate and apply individual TPS adjustment for a specific thread group
 */
export function calculateAndApplyIndividualTPS(threadGroupIndex) {
    if (!window.appState?.jmxData) {
        alert('No JMX file loaded');
        return;
    }
    
    const threadGroups = window.appState.threadGroupData || [];
    if (threadGroupIndex < 0 || threadGroupIndex >= threadGroups.length) {
        alert('Invalid thread group index');
        return;
    }
    
    const targetTPS = parseFloat(document.getElementById(`individual-tps-${threadGroupIndex}`).value);
    if (!targetTPS || targetTPS <= 0) {
        alert('Please enter a valid target TPS');
        return;
    }
    
    const tg = threadGroups[threadGroupIndex];
    const totalTPS = getPerformanceSummaryTPS();
    const totalUsers = threadGroups.reduce((sum, tg) => sum + tg.count, 0);
    
    // Calculate current TPS for this thread group (proportional distribution)
    const tgProportion = tg.count / totalUsers;
    const currentTPS = totalTPS * tgProportion;
    
    // Calculate scaling factor for this thread group
    const scalingFactor = targetTPS / currentTPS;
    const newUsers = Math.ceil(tg.count * scalingFactor);
    
    if (!confirm(`Thread Group: ${tg.name}\nCurrent Users: ${tg.count}\nCurrent TPS: ${currentTPS.toFixed(2)}\nTarget TPS: ${targetTPS.toFixed(2)}\nScaling Factor: ${scalingFactor.toFixed(2)}x\nNew Users: ${newUsers}\n\nApply this change?`)) {
        return;
    }
    
    // Update the thread group count
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(window.appState.jmxData, 'text/xml');
    const allThreadGroups = xmlDoc.querySelectorAll('ThreadGroup, com.blazemeter.jmeter.threads.concurrency.ConcurrencyThreadGroup, com.octoperf.jmeter.OctoPerfThreadGroup');
    
    if (threadGroupIndex < allThreadGroups.length) {
        const tgElement = allThreadGroups[threadGroupIndex];
        
        // Update thread count
        const numThreadsElement = tgElement.querySelector('stringProp[name="ThreadGroup.num_threads"]');
        if (numThreadsElement) {
            numThreadsElement.textContent = newUsers.toString();
        }
        
        // Update concurrency thread group count
        const targetConcurrencyElement = tgElement.querySelector('stringProp[name="TargetLevel"]');
        if (targetConcurrencyElement) {
            targetConcurrencyElement.textContent = newUsers.toString();
        }
        
        // Serialize and update
        const serializer = new XMLSerializer();
        window.appState.jmxData = serializer.serializeToString(xmlDoc);
        
        // Update thread group data
        window.appState.threadGroupData[threadGroupIndex].count = newUsers;
        
        alert(`Successfully updated ${tg.name} to ${newUsers} users!`);
        
        // Refresh all displays
        if (typeof window.renderThreadGroupsTable === 'function') {
            window.renderThreadGroupsTable();
        }
        if (typeof window.updatePerformanceSummary === 'function') {
            window.updatePerformanceSummary();
        }
        renderScalingTable();
        renderIndividualTPSCards();
    }
}
