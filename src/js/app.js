// Main Application Controller
import { parseJMX, extractThreadGroups, extractGlobalVariables } from './core/jmxParser.js';
import { applyMasterScale as applyScaling, downloadJMX as downloadModifiedJMX, updateRampTimeInXML, updateLoopCountInXML, updateDurationInXML } from './core/jmxModifier.js';
import { renderVariablesTable, addVariable as addVar, updateVariable as updateVar, deleteVariable as deleteVar, findAndReplace as findReplace, previewFindReplace, updateUDVGroupName } from './features/variablesManager.js';
import { renderSamplersTable, deleteSampler as delSampler, renameSampler as renameSamp, renameAllSamplers, bulkDeleteSamplers as bulkDelSamplers, filterSamplers } from './features/samplerManager.js';
import { renderWorkloadTable, renderScalingTable, calculateUsersOnly, calculateTPSForThreadGroup as calcTPSForTG, calculatePacingForThreadGroup as calcPacingForTG, applyCalculatedValues, calculateScalingFactor, applyScaledValues, calculateAndApplyIndividualTPS } from './features/workloadCalculator.js';
import { renderTimersTable, addTimer as addTmr, deleteTimer as delTimer, toggleTimer as togTimer, bulkAddThinkTime as bulkAddTT, populateTimerDropdowns, updateTimerSamplerList } from './features/timerManager.js';
import { renderCSVTable, addCSVConfig as addCSV, editCSVConfig as editCSV, deleteCSVConfig as delCSV } from './features/csvManager.js';
import { updatePerformanceSummary, applyMasterScale as applyMasterScaling, setMasterScale } from './features/masterController.js';

// Global state
window.appState = {
    jmxDocument: null,
    threadGroupData: [],
    originalThreadGroupCounts: [],
    globalVariables: { rampup: "N/A", steadyState: "N/A" },
    samplers: [],
    csvConfigs: [],
    timers: [],
    userDefinedVariables: [],
    userDefinedVariablesElement: null,
    calculatedWorkload: null,
    isOnline: navigator.onLine
};

// Network Status Monitoring
function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    window.appState.isOnline = isOnline;
    
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (!statusDot || !statusText) return;
    
    if (isOnline) {
        statusDot.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
        statusDot.title = 'Online - Application Ready';
        statusText.textContent = 'Ready';
        statusText.className = 'text-xs font-medium text-green-600';
    } else {
        statusDot.className = 'w-2 h-2 bg-red-500 rounded-full';
        statusDot.title = 'Offline - No Internet Connection';
        statusText.textContent = 'Offline';
        statusText.className = 'text-xs font-medium text-red-600';
    }
}

// Listen for network status changes
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// Initialize network status on load
document.addEventListener('DOMContentLoaded', updateNetworkStatus);

// File upload handler
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (Edge has lower memory limits)
    const maxSize = 10 * 1024 * 1024; // 10MB limit for safety
    if (file.size > maxSize) {
        showToast('File too large. Maximum size: 10MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    // Add error handler for Edge compatibility
    reader.onerror = function(error) {
        console.error('FileReader error:', error);
        showToast('Error reading file: ' + error.message, 'error');
    };
    reader.onload = function(event) {
        try {
            // Store raw XML data FIRST
            window.appState.jmxData = event.target.result;
            
            const result = parseJMX(event.target.result);
            
            if (result.error) {
                showToast(result.error, 'error');
                return;
            }
            
            // Update global state
            window.appState = { ...window.appState, ...result };
            
            // Re-store jmxData (important!)
            window.appState.jmxData = event.target.result;
            
            // Store original thread group counts for master scaling
            window.appState.originalThreadGroupCounts = result.threadGroupData.map(tg => tg.count);
            
            // Show main content
            document.getElementById('uploadPrompt').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            document.getElementById('downloadBtn').disabled = false;
            
            // Render all tables
            renderThreadGroupsTable();
            renderVariablesTable();
            renderSamplersTable();
            renderTimersTable();
            populateTimerDropdowns();
            renderCSVTable();
            renderScalingTable();
            renderWorkloadTable();
            updatePerformanceSummary();
            
            showToast('JMX loaded successfully!', 'success');
        } catch (error) {
            console.error('Parse error:', error);
            showToast('Failed to parse JMX file', 'error');
        }
    };
    reader.readAsText(file);
});

// Tab switching
window.switchTab = function(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    // Remove active class from all tabs
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.remove('tab-active'));
    // Show selected tab
    document.getElementById(`content-${tabName}`).style.display = 'block';
    document.getElementById(`tab-${tabName}`).classList.add('tab-active');
};

// Download JMX
window.downloadJMX = function() {
    const result = downloadModifiedJMX();
    if (result.success) {
        showToast('JMX downloaded!', 'success');
    } else {
        showToast('Download failed: ' + result.error, 'error');
    }
};

// Render thread groups table
function renderThreadGroupsTable() {
    const tbody = document.getElementById('threadGroupsTableBody');
    tbody.innerHTML = '';
    
    window.appState.threadGroupData.forEach((tg, index) => {
        const row = document.createElement('tr');
        row.className = tg.status ? '' : 'bg-gray-50';
        
        const statusClass = tg.status ? 'status-enabled' : 'status-disabled';
        const statusText = tg.status ? 'Enabled' : 'Disabled';
        
        row.innerHTML = `
            <td class="px-4 py-3">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(tg.name)}</td>
            <td class="px-4 py-3 text-center">
                <input type="number" 
                    id="users-${index}" 
                    value="${tg.count}" 
                    min="1" 
                    class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center">
            </td>
            <td class="px-4 py-3 text-center">
                <input type="number" 
                    id="rampup-${index}" 
                    value="${tg.rampTime}" 
                    min="0" 
                    class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center">
            </td>
            <td class="px-4 py-3 text-center">
                <input type="number" 
                    id="loop-${index}" 
                    value="${tg.loops}" 
                    min="-1" 
                    title="-1 for infinite loops"
                    class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center">
            </td>
            <td class="px-4 py-3 text-center">
                <input type="number" 
                    id="duration-${index}" 
                    value="${tg.duration}" 
                    min="0" 
                    title="0 for infinite duration"
                    class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center">
            </td>
            <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="applyThreadGroupChanges(${index})" 
                        class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                        title="Apply changes">
                        Apply
                    </button>
                    <button onclick="toggleThreadGroupStatus(${index})" 
                        class="px-3 py-1 ${tg.status ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white text-xs rounded transition-colors"
                        title="${tg.status ? 'Disable' : 'Enable'} thread group">
                        ${tg.status ? '🚫 Disable' : '✅ Enable'}
                    </button>
                    <button onclick="deleteThreadGroup(${index})" 
                        class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        title="Delete thread group">
                        🗑️ Delete
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Expose renderThreadGroupsTable as window function for external calls
window.renderThreadGroupsTable = renderThreadGroupsTable;

// Toggle thread group status (enable/disable)
function toggleThreadGroupStatus(index) {
    const tg = window.appState.threadGroupData[index];
    if (!tg) return;
    
    const newStatus = !tg.status;
    const action = newStatus ? 'enable' : 'disable';
    
    if (!confirm(`Are you sure you want to ${action} "${tg.name}"?`)) {
        return;
    }
    
    // Update XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(window.appState.jmxData, 'text/xml');
    const allThreadGroups = xmlDoc.querySelectorAll('ThreadGroup, com.blazemeter.jmeter.threads.concurrency.ConcurrencyThreadGroup, com.octoperf.jmeter.OctoPerfThreadGroup');
    
    if (index < allThreadGroups.length) {
        const tgElement = allThreadGroups[index];
        tgElement.setAttribute('enabled', newStatus.toString());
        
        // Serialize and update
        const serializer = new XMLSerializer();
        window.appState.jmxData = serializer.serializeToString(xmlDoc);
        
        // Update state
        window.appState.threadGroupData[index].status = newStatus;
        
        // Refresh displays
        renderThreadGroupsTable();
        updatePerformanceSummary();
        renderScalingTable();
        renderWorkloadTable();
        
        showToast(`Thread group "${tg.name}" ${action}d successfully`, 'success');
    }
}

// Delete thread group
function deleteThreadGroup(index) {
    const tg = window.appState.threadGroupData[index];
    if (!tg) return;
    
    if (!confirm(`⚠️ WARNING: This will permanently delete the thread group "${tg.name}" and all its samplers, timers, and configurations.\n\nThis action cannot be undone. Continue?`)) {
        return;
    }
    
    // Update XML - remove the thread group element
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(window.appState.jmxData, 'text/xml');
    const allThreadGroups = xmlDoc.querySelectorAll('ThreadGroup, com.blazemeter.jmeter.threads.concurrency.ConcurrencyThreadGroup, com.octoperf.jmeter.OctoPerfThreadGroup');
    
    if (index < allThreadGroups.length) {
        const tgElement = allThreadGroups[index];
        tgElement.parentNode.removeChild(tgElement);
        
        // Serialize and update
        const serializer = new XMLSerializer();
        window.appState.jmxData = serializer.serializeToString(xmlDoc);
        
        // Update state - remove from array
        window.appState.threadGroupData.splice(index, 1);
        window.appState.originalThreadGroupCounts.splice(index, 1);
        
        // Re-parse to update all related data
        const updatedDoc = parser.parseFromString(window.appState.jmxData, 'text/xml');
        window.appState.jmxDocument = updatedDoc;
        
        // Refresh all displays
        renderThreadGroupsTable();
        updatePerformanceSummary();
        renderSamplersTable();
        renderTimersTable();
        renderScalingTable();
        renderWorkloadTable();
        renderVariablesTable();
        renderCSVTable();
        
        showToast(`Thread group "${tg.name}" deleted successfully`, 'success');
    }
}

// Expose toggle and delete functions
window.toggleThreadGroupStatus = toggleThreadGroupStatus;
window.deleteThreadGroup = deleteThreadGroup;

// Apply thread group changes
window.applyThreadGroupChanges = function(index) {
    const tg = window.appState.threadGroupData[index];
    const newUsers = parseInt(document.getElementById(`users-${index}`).value);
    const newRampUp = parseInt(document.getElementById(`rampup-${index}`).value);
    const newLoop = parseInt(document.getElementById(`loop-${index}`).value);
    const newDuration = parseInt(document.getElementById(`duration-${index}`).value);
    
    if (isNaN(newUsers) || newUsers < 1) {
        showToast('Users must be at least 1', 'error');
        return;
    }
    
    if (isNaN(newRampUp) || newRampUp < 0) {
        showToast('Ramp-Up cannot be negative', 'error');
        return;
    }
    
    if (isNaN(newLoop) || newLoop < -1) {
        showToast('Loop Count must be -1 (infinite) or greater', 'error');
        return;
    }
    
    if (isNaN(newDuration) || newDuration < 0) {
        showToast('Duration cannot be negative', 'error');
        return;
    }
    
    // Update in memory
    tg.count = newUsers;
    tg.rampTime = newRampUp;
    tg.loops = newLoop.toString();
    tg.duration = newDuration;
    
    // Update in XML using the modifier functions
    const intProps = tg.element.getElementsByTagName("intProp");
    for (let i = 0; i < intProps.length; i++) {
        if (intProps[i].getAttribute("name") === "ThreadGroup.num_threads") {
            intProps[i].textContent = newUsers.toString();
            break;
        }
    }
    
    updateRampTimeInXML(tg.element, newRampUp);
    updateLoopCountInXML(tg.element, newLoop);
    updateDurationInXML(tg.element, newDuration);
    
    showToast(`Updated ${tg.name} successfully`, 'success');
    updatePerformanceSummary();
};

// Toast notification
window.showToast = function(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = "fixed bottom-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300";
    
    if (type === 'success') toast.className += ' bg-green-600';
    else if (type === 'error') toast.className += ' bg-red-600';
    else if (type === 'warning') toast.className += ' bg-yellow-600';
    else toast.className += ' bg-black';
    
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.transform = 'translateY(5rem)';
        toast.style.opacity = '0';
    }, 3000);
};

// HTML escape utility
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Variables Manager Functions
window.showAddVariableModal = function() {
    document.getElementById('addVariableModal').classList.remove('hidden');
    document.getElementById('newVarName').value = '';
    document.getElementById('newVarValue').value = '';
    document.getElementById('newVarName').focus();
};

window.closeAddVariableModal = function() {
    document.getElementById('addVariableModal').classList.add('hidden');
};

window.confirmAddVariable = function() {
    const name = document.getElementById('newVarName').value.trim();
    const value = document.getElementById('newVarValue').value.trim();
    
    if (!name) {
        showToast('Variable name is required', 'error');
        return;
    }
    
    const result = addVar(name, value);
    if (result.success) {
        closeAddVariableModal();
        renderVariablesTable();
        showToast(`Added variable: ${name}`, 'success');
    } else {
        showToast(result.error, 'error');
    }
};

window.updateVariable = function(index) {
    const result = updateVar(index);
    if (result.success) {
        renderVariablesTable();
        showToast('Variable updated successfully', 'success');
    } else {
        showToast(result.error, 'error');
    }
};

window.deleteVariable = function(index) {
    if (!confirm('Are you sure you want to delete this variable?')) return;
    
    const result = deleteVar(index);
    if (result.success) {
        renderVariablesTable();
        showToast('Variable deleted successfully', 'success');
    } else {
        showToast(result.error, 'error');
    }
};

window.updateUDVGroupName = function() {
    const result = updateUDVGroupName();
    if (result.success) {
        showToast(result.message, 'success');
    } else {
        showToast(result.error, 'error');
    }
};

window.findAndReplaceVariables = function() {
    const findText = document.getElementById('findText').value;
    const replaceText = document.getElementById('replaceText').value;
    
    if (!findText) {
        showToast('Please enter text to find', 'error');
        return;
    }
    
    const result = findReplace(findText, replaceText);
    if (result.success) {
        renderVariablesTable();
        const resultDiv = document.getElementById('findReplaceResult');
        resultDiv.querySelector('p').textContent = `Replaced "${findText}" with "${replaceText}" in ${result.count} variable(s)`;
        resultDiv.classList.remove('hidden');
        showToast(`Updated ${result.count} variable(s)`, 'success');
        
        setTimeout(() => {
            resultDiv.classList.add('hidden');
        }, 5000);
    } else {
        showToast(result.error, 'error');
    }
};

window.previewFindReplace = function() {
    const findText = document.getElementById('findText').value;
    
    if (!findText) {
        showToast('Please enter text to find', 'error');
        return;
    }
    
    const result = previewFindReplace(findText);
    const resultDiv = document.getElementById('findReplaceResult');
    
    if (result.matches.length === 0) {
        resultDiv.querySelector('p').textContent = `No matches found for "${findText}"`;
        resultDiv.classList.remove('hidden');
    } else {
        const matchList = result.matches.map(m => `${m.name}: ${m.value}`).join(', ');
        resultDiv.querySelector('p').textContent = `Found ${result.matches.length} match(es): ${matchList}`;
        resultDiv.classList.remove('hidden');
    }
    
    setTimeout(() => {
        resultDiv.classList.add('hidden');
    }, 5000);
};

// Sampler Manager Functions
window.deleteSampler = function(index) {
    if (!confirm('Are you sure you want to delete this sampler?')) return;
    
    const result = delSampler(index);
    if (result.success) {
        renderSamplersTable();
        showToast('Sampler deleted successfully', 'success');
    } else {
        showToast(result.error, 'error');
    }
};

window.renameSampler = function(index) {
    const result = renameSamp(index);
    if (result.success) {
        showToast('Sampler renamed successfully', 'success');
    } else {
        showToast(result.error, 'error');
    }
};

window.renameAllSamplersAction = function() {
    const result = renameAllSamplers();
    if (result.success) {
        if (result.count === 0) {
            showToast('No changes to apply', 'info');
        } else {
            showToast(`${result.count} sampler(s) renamed successfully`, 'success');
        }
    } else {
        showToast(result.error, 'error');
    }
};
window.bulkDeleteSamplers = function() {
    const checkboxes = document.querySelectorAll('.sampler-checkbox:checked');
    if (checkboxes.length === 0) {
        showToast('Please select samplers to delete', 'error');
        return;
    }
    
    if (!confirm(`Delete ${checkboxes.length} selected sampler(s)?`)) return;
    
    const result = bulkDelSamplers();
    if (result.success) {
        document.getElementById('selectAllSamplers').checked = false;
        renderSamplersTable();
        showToast(`Deleted ${result.count} sampler(s)`, 'success');
    } else {
        showToast(result.error, 'error');
    }
};

window.filterSamplers = function() {
    const searchTerm = document.getElementById('samplerSearch').value;
    const filtered = filterSamplers(searchTerm);
    renderSamplersTable(filtered);
};

window.toggleAllSamplers = function() {
    const selectAll = document.getElementById('selectAllSamplers');
    const checkboxes = document.querySelectorAll('.sampler-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
};

// Workload Calculator Functions
window.calculateUsersOnly = function(threadGroupIndex) {
    const result = calculateUsersOnly(threadGroupIndex);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    showToast(`Calculated ${result.users} users needed. Click "Apply All" to save.`, 'success');
};

window.calculateAndApplyUsers = function(threadGroupIndex) {
    // For backward compatibility - just calculate, don't apply
    window.calculateUsersOnly(threadGroupIndex);
};

window.calculateTPSForThreadGroup = function(threadGroupIndex) {
    const result = calcTPSForTG(threadGroupIndex);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    showToast(`Calculated TPS: ${result.tps.toFixed(2)}`, 'success');
};

window.calculatePacingForThreadGroup = function(threadGroupIndex) {
    const result = calcPacingForTG(threadGroupIndex);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    showToast(`Calculated Pacing: ${result.pacing.toFixed(2)}s`, 'success');
};

window.applyCalculatedValues = function(threadGroupIndex) {
    const result = applyCalculatedValues(threadGroupIndex);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    renderThreadGroupsTable();
    renderWorkloadTable();
    updatePerformanceSummary();
    showToast(`Applied ${result.users} users and ${result.tps.toFixed(2)} TPS`, 'success');
};

window.applyTPSToThreadGroup = function(threadGroupIndex) {
    // For backward compatibility - redirect to applyCalculatedValues
    window.applyCalculatedValues(threadGroupIndex);
};

// Timer Manager Functions
window.addTimer = function() {
    const type = document.getElementById('timerType').value;
    const name = document.getElementById('timerName').value.trim();
    const delay = parseInt(document.getElementById('timerDelay').value);
    const randomDelay = parseInt(document.getElementById('timerRandomDelay').value) || 0;
    const deviation = parseInt(document.getElementById('timerDeviation').value) || 0;
    
    if (!name) {
        showToast('Please enter a timer name', 'error');
        return;
    }
    
    if (isNaN(delay) || delay < 0) {
        showToast('Please enter a valid delay', 'error');
        return;
    }
    
    const result = addTmr(type, name, delay, randomDelay, deviation);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    renderTimersTable();
    if (result.addedCount > 1) {
        showToast(`${result.addedCount} timers added successfully`, 'success');
    } else {
        showToast(`Timer "${name}" added successfully`, 'success');
    }
    
    // Reset form
    document.getElementById('timerName').value = '';
    document.getElementById('timerDelay').value = '3000';
};

window.updateTimerSamplerList = updateTimerSamplerList;

window.deleteTimer = function(index) {
    if (!confirm('Are you sure you want to delete this timer?')) {
        return;
    }
    
    const result = delTimer(index);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    renderTimersTable();
    showToast('Timer deleted successfully', 'success');
};

window.toggleTimer = function(index) {
    const result = togTimer(index);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    renderTimersTable();
    const timer = window.appState.timers[index];
    showToast(`Timer ${timer.enabled ? 'enabled' : 'disabled'}`, 'success');
};

window.showBulkAddModal = function() {
    const delay = prompt('Enter think time delay (milliseconds):', '3000');
    if (!delay) return;
    
    const randomDelay = prompt('Enter random delay maximum (milliseconds, 0 for constant):', '1000');
    if (randomDelay === null) return;
    
    const delayNum = parseInt(delay);
    const randomDelayNum = parseInt(randomDelay);
    
    if (isNaN(delayNum) || delayNum < 0) {
        showToast('Invalid delay value', 'error');
        return;
    }
    
    if (isNaN(randomDelayNum) || randomDelayNum < 0) {
        showToast('Invalid random delay value', 'error');
        return;
    }
    
    const timerType = randomDelayNum > 0 ? 'UniformRandomTimer' : 'ConstantTimer';
    const result = bulkAddTT(delayNum, randomDelayNum, timerType);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    renderTimersTable();
    showToast(`Added think time to ${result.addedCount} samplers`, 'success');
};

// CSV Manager Functions
window.addCSVConfig = function() {
    const type = document.getElementById('csvType').value;
    const name = document.getElementById('csvName').value.trim();
    const filename = document.getElementById('csvFilePath').value.trim();
    const fileEncoding = document.getElementById('csvFileEncoding').value.trim();
    const variableNames = document.getElementById('csvVariables').value.trim();
    const delimiter = document.getElementById('csvDelimiter').value;
    
    if (!name) {
        showToast('Please enter a config name', 'error');
        return;
    }
    
    if (!filename) {
        showToast('Please enter a file path', 'error');
        return;
    }
    
    if (!variableNames) {
        showToast('Please enter variable names', 'error');
        return;
    }
    
    // Build config object based on type
    const config = {
        name,
        filename,
        fileEncoding,
        variableNames,
        delimiter
    };
    
    // Add type-specific fields
    if (type === 'CSVDataSet') {
        config.shareMode = document.getElementById('csvShareMode').value;
        config.recycle = document.getElementById('csvRecycle').checked;
        config.stopThread = document.getElementById('csvStopThread').checked;
        config.ignoreFirstLine = document.getElementById('csvIgnoreFirstLine').checked;
        config.allowQuoted = document.getElementById('csvAllowQuoted').checked;
    } else if (type === 'RandomCSVDataSet') {
        config.randomOrder = document.getElementById('csvRandomOrder').checked;
        config.rewind = document.getElementById('csvRewind').checked;
        config.firstLineHeader = document.getElementById('csvFirstLineHeader').checked;
        config.independentList = document.getElementById('csvIndependentList').checked;
    } else if (type === 'ExtendedCSVDataSet') {
        config.shareMode = document.getElementById('csvShareMode').value;
        config.ignoreFirstLine = document.getElementById('csvIgnoreFirstLine').checked;
        config.allowQuoted = document.getElementById('csvAllowQuoted').checked;
        config.selectRow = document.getElementById('csvSelectRow').value;
        config.updateValues = document.getElementById('csvUpdateValues').value;
        config.outOfValues = document.getElementById('csvOutOfValues').value;
        const allocateMode = document.querySelector('input[name="csvAllocateMode"]:checked').value;
        config.allocateMode = allocateMode;
        config.allocateCount = allocateMode === 'manual' ? parseInt(document.getElementById('csvAllocateCount').value) || 1 : 0;
    } else if (type === 'UniqueCSVDataSet') {
        config.shareMode = document.getElementById('csvShareMode').value;
        config.recycle = document.getElementById('csvRecycle').checked;
        config.stopThread = document.getElementById('csvStopThread').checked;
        config.ignoreFirstLine = document.getElementById('csvIgnoreFirstLine').checked;
        config.allowQuoted = document.getElementById('csvAllowQuoted').checked;
        config.targetThreadGroup = document.getElementById('csvTargetThreadGroup').value.trim();
        config.blockSize = parseInt(document.getElementById('csvBlockSize').value) || 1;
    }
    
    const result = addCSV(type, config);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    renderCSVTable();
    showToast(`CSV Config "${name}" added successfully`, 'success');
    
    // Reset form
    document.getElementById('csvName').value = '';
    document.getElementById('csvFilePath').value = '';
    document.getElementById('csvVariables').value = '';
    document.getElementById('csvFileEncoding').value = 'UTF-8';
    document.getElementById('csvDelimiter').value = ',';
    document.getElementById('csvAllocateAuto').checked = true;
    document.getElementById('csvAllocateCount').value = '1';
};

window.editCSVConfig = function(index) {
    const result = editCSV(index);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    renderCSVTable();
    showToast('Edit the config and click "Add CSV Config" to save changes', 'info');
};

window.deleteCSVConfig = function(index) {
    if (!confirm('Are you sure you want to delete this CSV config?')) {
        return;
    }
    
    const result = delCSV(index);
    
    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }
    
    renderCSVTable();
    showToast('CSV config deleted successfully', 'success');
};

window.updateCSVTypeFields = function() {
    const type = document.getElementById('csvType').value;
    const shareModeSelect = document.getElementById('csvShareMode');
    
    // Hide all type-specific fields first
    document.getElementById('extendedSelectRow').classList.add('hidden');
    document.getElementById('extendedUpdateValues').classList.add('hidden');
    document.getElementById('extendedOutOfValues').classList.add('hidden');
    document.getElementById('extendedAllocateValues').classList.add('hidden');
    document.getElementById('uniqueThreadGroup').classList.add('hidden');
    document.getElementById('uniqueBlockSize').classList.add('hidden');
    document.getElementById('randomOrderCheck').classList.add('hidden');
    document.getElementById('rewindCheck').classList.add('hidden');
    document.getElementById('headerCheck').classList.add('hidden');
    document.getElementById('independentCheck').classList.add('hidden');
    document.getElementById('recycleCheck').classList.add('hidden');
    document.getElementById('stopThreadCheck').classList.add('hidden');
    document.getElementById('ignoreFirstLineCheck').classList.add('hidden');
    document.getElementById('allowQuotedCheck').classList.add('hidden');
    
    // Update sharing mode options based on type
    if (type === 'CSVDataSet') {
        // Standard: All threads, Current thread group, Current thread
        shareModeSelect.innerHTML = `
            <option value="shareMode.all">All threads</option>
            <option value="shareMode.group">Current thread group</option>
            <option value="shareMode.thread">Current thread</option>
        `;
        // Show Standard CSV checkboxes
        document.getElementById('recycleCheck').classList.remove('hidden');
        document.getElementById('stopThreadCheck').classList.remove('hidden');
        document.getElementById('ignoreFirstLineCheck').classList.remove('hidden');
        document.getElementById('allowQuotedCheck').classList.remove('hidden');
    } else if (type === 'RandomCSVDataSet') {
        // Random: All threads, Current thread group, Current thread
        shareModeSelect.innerHTML = `
            <option value="shareMode.all">All threads</option>
            <option value="shareMode.group">Current thread group</option>
            <option value="shareMode.thread">Current thread</option>
        `;
        // Show Random CSV specific checkboxes
        document.getElementById('randomOrderCheck').classList.remove('hidden');
        document.getElementById('rewindCheck').classList.remove('hidden');
        document.getElementById('headerCheck').classList.remove('hidden');
        document.getElementById('independentCheck').classList.remove('hidden');
    } else if (type === 'ExtendedCSVDataSet') {
        // Extended: All threads, Current thread group, Current thread
        shareModeSelect.innerHTML = `
            <option value="shareMode.all">All threads</option>
            <option value="shareMode.group">Current thread group</option>
            <option value="shareMode.thread">Current thread</option>
        `;
        // Show Extended-specific fields
        document.getElementById('extendedSelectRow').classList.remove('hidden');
        document.getElementById('extendedUpdateValues').classList.remove('hidden');
        document.getElementById('extendedOutOfValues').classList.remove('hidden');
        document.getElementById('extendedAllocateValues').classList.remove('hidden');
        document.getElementById('ignoreFirstLineCheck').classList.remove('hidden');
        document.getElementById('allowQuotedCheck').classList.remove('hidden');
        // Trigger extended field behavior
        window.updateExtendedFields();
    } else if (type === 'UniqueCSVDataSet') {
        // Unique: All threads, Current thread group, Current thread, Target thread, Edit
        shareModeSelect.innerHTML = `
            <option value="shareMode.all">All threads</option>
            <option value="shareMode.group">Current thread group</option>
            <option value="shareMode.thread">Current thread</option>
            <option value="shareMode.target">Target thread</option>
            <option value="shareMode.edit">Edit</option>
        `;
        // Show Unique-specific fields
        document.getElementById('uniqueThreadGroup').classList.remove('hidden');
        document.getElementById('uniqueBlockSize').classList.remove('hidden');
        document.getElementById('recycleCheck').classList.remove('hidden');
        document.getElementById('stopThreadCheck').classList.remove('hidden');
        document.getElementById('ignoreFirstLineCheck').classList.remove('hidden');
        document.getElementById('allowQuotedCheck').classList.remove('hidden');
    }
};

window.updateExtendedFields = function() {
    const selectRow = document.getElementById('csvSelectRow').value;
    const outOfValuesSelect = document.getElementById('csvOutOfValues');
    const allocateSection = document.getElementById('extendedAllocateValues');
    
    if (selectRow === 'Random') {
        // Disable "When out of Values" and set to "Continue Cyclic"
        outOfValuesSelect.disabled = true;
        outOfValuesSelect.value = 'Continue Cyclic';
        allocateSection.classList.add('hidden');
    } else if (selectRow === 'Unique') {
        // Enable "When out of Values"
        outOfValuesSelect.disabled = false;
        // Show allocate values section
        allocateSection.classList.remove('hidden');
    } else { // Sequential
        // Enable "When out of Values"
        outOfValuesSelect.disabled = false;
        allocateSection.classList.add('hidden');
    }
};

// Timer type change handler
document.addEventListener('DOMContentLoaded', function() {
    const timerTypeSelect = document.getElementById('timerType');
    if (timerTypeSelect) {
        timerTypeSelect.addEventListener('change', function() {
            const type = this.value;
            const additionalOptions = document.getElementById('timerAdditionalOptions');
            
            if (type === 'UniformRandomTimer' || type === 'GaussianRandomTimer') {
                additionalOptions.classList.remove('hidden');
            } else {
                additionalOptions.classList.add('hidden');
            }
        });
    }
});

// Master Controller Functions
window.updatePerformanceSummary = updatePerformanceSummary;
window.renderScalingTable = renderScalingTable;
window.renderWorkloadTable = renderWorkloadTable;
window.setMasterScale = setMasterScale;

// Capture the imported function reference before creating window function
const applyMasterScaleImpl = applyMasterScale;

window.applyMasterScale = function() {
    const result = applyMasterScaleImpl();
    if (!result.success) {
        window.showToast(result.error, 'error');
        return;
    }
    
    // Show visual confirmation badge
    const badge = document.getElementById('scalingAppliedBadge');
    if (badge) {
        badge.style.display = 'block';
        // Hide after 5 seconds
        setTimeout(() => {
            badge.style.display = 'none';
        }, 5000);
    }
    
    // Re-render Thread Groups table with updated counts
    renderThreadGroupsTable();
    updatePerformanceSummary();
    window.showToast(`Applied ${document.getElementById('masterScale').value}% scaling`, 'success');
};

// Workload Calculator Mode Switcher
window.switchWorkloadMode = function(mode) {
    const scalingCalc = document.getElementById('scaling-calculator');
    const littlesCalc = document.getElementById('littles-calculator');
    const scalingBtn = document.getElementById('btn-scaling-mode');
    const littlesBtn = document.getElementById('btn-littles-mode');
    
    if (mode === 'scaling') {
        scalingCalc.style.display = 'block';
        littlesCalc.style.display = 'none';
        scalingBtn.className = 'flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors bg-blue-600 text-white';
        littlesBtn.className = 'flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300';
    } else {
        scalingCalc.style.display = 'none';
        littlesCalc.style.display = 'block';
        scalingBtn.className = 'flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300';
        littlesBtn.className = 'flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors bg-blue-600 text-white';
    }
};

// TPS Scaling Calculator Functions
window.calculateScalingFactor = calculateScalingFactor;
window.applyScaledValues = applyScaledValues;
window.calculateAndApplyIndividualTPS = calculateAndApplyIndividualTPS;

// Initialize
console.log('JMX Studio v4.0.0 initialized');
