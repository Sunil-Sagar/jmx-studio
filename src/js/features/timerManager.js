// Timer Manager - Add think time and pacing
// Feature 4: Realistic user behavior simulation

export function initTimerManager() {
    console.log('Timer Manager initialized');
}

export function populateTimerDropdowns() {
    const threadGroupSelect = document.getElementById('timerThreadGroup');
    if (!threadGroupSelect) return;
    
    const threadGroups = window.appState.threadGroupData || [];
    threadGroupSelect.innerHTML = '<option value="">Select Thread Group</option>';
    
    threadGroups.forEach((tg, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = tg.name;
        threadGroupSelect.appendChild(option);
    });
}

export function updateTimerSamplerList() {
    const threadGroupIndex = parseInt(document.getElementById('timerThreadGroup').value);
    const samplerSelect = document.getElementById('timerSampler');
    
    if (!samplerSelect) return;
    
    samplerSelect.innerHTML = '<option value="">Select Sampler (or leave empty for all)</option>';
    
    if (isNaN(threadGroupIndex)) {
        // Reset to default when no thread group selected
        return;
    }
    
    // Change text when thread group is selected
    samplerSelect.innerHTML = '<option value="">All samplers in this thread group</option>';
    
    const samplers = window.appState.samplers || [];
    const threadGroup = window.appState.threadGroupData[threadGroupIndex];
    
    if (!threadGroup) return;
    
    // Find samplers that belong to this thread group
    const tgElement = threadGroup.element;
    const tgHashTree = tgElement.nextElementSibling;
    
    if (!tgHashTree || tgHashTree.tagName !== 'hashTree') return;
    
    samplers.forEach((sampler, index) => {
        // Check if this sampler is a descendant of the thread group's hashTree
        if (tgHashTree.contains(sampler.element)) {
            const option = document.createElement('option');
            option.value = sampler.originalIndex;
            option.textContent = sampler.name;
            samplerSelect.appendChild(option);
        }
    });
}

export function renderTimersTable() {
    const timers = window.appState.timers || [];
    const container = document.getElementById('timersTableContainer');
    
    document.getElementById('timerCount').textContent = `${timers.length} timer${timers.length !== 1 ? 's' : ''}`;
    
    if (timers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <p class="mb-2">No timers found in this JMX file</p>
                <p class="text-sm">Add timers above to control think time and pacing</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Timer Name</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Configuration</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    timers.forEach((timer, index) => {
        const statusBadge = timer.enabled 
            ? '<span class="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">Enabled</span>'
            : '<span class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded">Disabled</span>';
        
        const typeBadge = getTimerTypeBadge(timer.type);
        const config = getTimerConfig(timer);
        
        html += `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${timer.name || 'Unnamed Timer'}</td>
                <td class="px-4 py-3 text-sm">${typeBadge}</td>
                <td class="px-4 py-3 text-sm text-gray-600 font-mono">${config}</td>
                <td class="px-4 py-3 text-sm">${statusBadge}</td>
                <td class="px-4 py-3 text-sm text-center">
                    <button onclick="toggleTimer(${index})" 
                        class="text-blue-600 hover:text-blue-800 mr-3 font-medium">
                        ${timer.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onclick="deleteTimer(${index})" 
                        class="text-red-600 hover:text-red-800 font-medium">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function getTimerTypeBadge(type) {
    const badges = {
        'UniformRandomTimer': '<span class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">Uniform Random</span>',
        'ConstantTimer': '<span class="px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded">Constant</span>',
        'GaussianRandomTimer': '<span class="px-2 py-1 text-xs font-semibold text-indigo-800 bg-indigo-100 rounded">Gaussian Random</span>'
    };
    return badges[type] || '<span class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded">Unknown</span>';
}

function getTimerConfig(timer) {
    const element = timer.element;
    const type = timer.type;
    
    if (type === 'ConstantTimer') {
        const delay = getStringProp(element, 'ConstantTimer.delay') || '0';
        return `Delay: ${delay}ms`;
    } else if (type === 'UniformRandomTimer') {
        const delay = getStringProp(element, 'ConstantTimer.delay') || '0';
        const range = getStringProp(element, 'RandomTimer.range') || '0';
        return `Delay: ${delay}ms, Range: ${range}ms`;
    } else if (type === 'GaussianRandomTimer') {
        const delay = getStringProp(element, 'ConstantTimer.delay') || '0';
        const range = getStringProp(element, 'RandomTimer.range') || '0';
        return `Offset: ${delay}ms, Deviation: ${range}ms`;
    }
    
    return 'N/A';
}

function getStringProp(element, propName) {
    const props = element.getElementsByTagName('stringProp');
    for (let i = 0; i < props.length; i++) {
        if (props[i].getAttribute('name') === propName) {
            return props[i].textContent;
        }
    }
    return '';
}

function getDoubleProp(element, propName) {
    const props = element.getElementsByTagName('doubleProp');
    for (let i = 0; i < props.length; i++) {
        if (props[i].getAttribute('name') === propName) {
            return props[i].textContent;
        }
    }
    return '';
}

function getIntProp(element, propName) {
    const props = element.getElementsByTagName('intProp');
    for (let i = 0; i < props.length; i++) {
        if (props[i].getAttribute('name') === propName) {
            return props[i].textContent;
        }
    }
    return '';
}

export function addTimer(type, name, delay, randomDelay = 0, deviation = 0, threadGroupIndex = null, samplerIndex = null) {
    const jmxDoc = window.appState.jmxDocument;
    if (!jmxDoc) {
        return { success: false, error: 'No JMX file loaded' };
    }
    
    // Get thread group index from UI if not provided
    if (threadGroupIndex === null) {
        const tgSelect = document.getElementById('timerThreadGroup');
        if (!tgSelect || tgSelect.value === '') {
            return { success: false, error: 'Please select a thread group' };
        }
        threadGroupIndex = parseInt(tgSelect.value);
    }
    
    // Get sampler index from UI if not provided
    if (samplerIndex === null) {
        const samplerSelect = document.getElementById('timerSampler');
        samplerIndex = samplerSelect && samplerSelect.value !== '' ? parseInt(samplerSelect.value) : null;
    }
    
    const threadGroups = window.appState.threadGroupData || [];
    const samplers = window.appState.samplers || [];
    
    if (threadGroupIndex < 0 || threadGroupIndex >= threadGroups.length) {
        return { success: false, error: 'Invalid thread group selected' };
    }
    
    const threadGroup = threadGroups[threadGroupIndex];
    const tgHashTree = threadGroup.element.nextElementSibling;
    
    if (!tgHashTree || tgHashTree.tagName !== 'hashTree') {
        return { success: false, error: 'Invalid JMX structure - thread group has no hashTree' };
    }
    
    // Find target samplers
    let targetSamplers = [];
    
    if (samplerIndex !== null) {
        // Add to specific sampler
        const sampler = samplers.find(s => s.originalIndex === samplerIndex);
        if (sampler && tgHashTree.contains(sampler.element)) {
            targetSamplers.push(sampler);
        } else {
            return { success: false, error: 'Selected sampler not found in this thread group' };
        }
    } else {
        // Add to all samplers in this thread group
        samplers.forEach(sampler => {
            if (tgHashTree.contains(sampler.element)) {
                targetSamplers.push(sampler);
            }
        });
    }
    
    if (targetSamplers.length === 0) {
        return { success: false, error: 'No samplers found in selected thread group' };
    }
    
    let addedCount = 0;
    
    targetSamplers.forEach(sampler => {
        const samplerHashTree = sampler.element.nextElementSibling;
        
        if (!samplerHashTree || samplerHashTree.tagName !== 'hashTree') {
            return;
        }
        
        // Verify the samplerHashTree is part of the jmxDocument
        if (samplerHashTree.ownerDocument !== jmxDoc) {
            return;
        }
        
        // Create the timer element
        let timerElement;
        const timerName = name || `${type} - ${sampler.name}`;
        
        if (type === 'UniformRandomTimer') {
            timerElement = jmxDoc.createElement('UniformRandomTimer');
            timerElement.setAttribute('guiclass', 'UniformRandomTimerGui');
            timerElement.setAttribute('testclass', 'UniformRandomTimer');
            timerElement.setAttribute('testname', timerName);
            timerElement.setAttribute('enabled', 'true');
            
            const delayProp = jmxDoc.createElement('stringProp');
            delayProp.setAttribute('name', 'ConstantTimer.delay');
            delayProp.textContent = delay.toString();
            
            const rangeProp = jmxDoc.createElement('stringProp');
            rangeProp.setAttribute('name', 'RandomTimer.range');
            rangeProp.textContent = randomDelay.toString();
            
            timerElement.appendChild(delayProp);
            timerElement.appendChild(rangeProp);
            
        } else if (type === 'ConstantTimer') {
            timerElement = jmxDoc.createElement('ConstantTimer');
            timerElement.setAttribute('guiclass', 'ConstantTimerGui');
            timerElement.setAttribute('testclass', 'ConstantTimer');
            timerElement.setAttribute('testname', timerName);
            timerElement.setAttribute('enabled', 'true');
            
            const delayProp = jmxDoc.createElement('stringProp');
            delayProp.setAttribute('name', 'ConstantTimer.delay');
            delayProp.textContent = delay.toString();
            
            timerElement.appendChild(delayProp);
            
        } else if (type === 'GaussianRandomTimer') {
            timerElement = jmxDoc.createElement('GaussianRandomTimer');
            timerElement.setAttribute('guiclass', 'GaussianRandomTimerGui');
            timerElement.setAttribute('testclass', 'GaussianRandomTimer');
            timerElement.setAttribute('testname', timerName);
            timerElement.setAttribute('enabled', 'true');
            
            const offsetProp = jmxDoc.createElement('stringProp');
            offsetProp.setAttribute('name', 'ConstantTimer.delay');
            offsetProp.textContent = delay.toString();
            
            const deviationProp = jmxDoc.createElement('stringProp');
            deviationProp.setAttribute('name', 'RandomTimer.range');
            deviationProp.textContent = deviation.toString();
            
            timerElement.appendChild(offsetProp);
            timerElement.appendChild(deviationProp);
        }
        
        // Add timer to sampler's hashTree
        samplerHashTree.appendChild(timerElement);
        
        // Add empty hashTree after timer
        const emptyHashTree = jmxDoc.createElement('hashTree');
        samplerHashTree.appendChild(emptyHashTree);
        
        // Update state
        if (!window.appState.timers) {
            window.appState.timers = [];
        }
        
        window.appState.timers.push({
            element: timerElement,
            type: type,
            name: timerName,
            enabled: true,
            threadGroup: threadGroup.name,
            sampler: sampler.name
        });
        
        addedCount++;
    });
    
    return { success: true, addedCount: addedCount };
}

export function deleteTimer(index) {
    const timers = window.appState.timers;
    if (!timers || index < 0 || index >= timers.length) {
        return { success: false, error: 'Invalid timer index' };
    }
    
    const timer = timers[index];
    const element = timer.element;
    
    // Remove timer and its hashTree from XML
    const hashTree = element.nextElementSibling;
    if (hashTree && hashTree.tagName === 'hashTree') {
        hashTree.remove();
    }
    element.remove();
    
    // Remove from state
    timers.splice(index, 1);
    
    return { success: true };
}

export function toggleTimer(index) {
    const timers = window.appState.timers;
    if (!timers || index < 0 || index >= timers.length) {
        return { success: false, error: 'Invalid timer index' };
    }
    
    const timer = timers[index];
    const newStatus = !timer.enabled;
    
    timer.enabled = newStatus;
    timer.element.setAttribute('enabled', newStatus.toString());
    
    return { success: true };
}

export function bulkAddThinkTime(delay, randomDelay, timerType = 'UniformRandomTimer') {
    const samplers = window.appState.samplers || [];
    if (samplers.length === 0) {
        return { success: false, error: 'No samplers found' };
    }
    
    let addedCount = 0;
    const jmxDoc = window.appState.jmxDocument;
    
    samplers.forEach((sampler, index) => {
        // Find the sampler's hashTree
        const samplerHashTree = sampler.element.nextElementSibling;
        if (!samplerHashTree || samplerHashTree.tagName !== 'hashTree') {
            return;
        }
        
        // Check if timer already exists in this sampler
        const existingTimers = samplerHashTree.querySelectorAll(timerType);
        if (existingTimers.length > 0) {
            return; // Skip if timer already exists
        }
        
        // Create timer
        let timerElement;
        const timerName = `Think Time - ${sampler.name}`;
        
        if (timerType === 'UniformRandomTimer') {
            timerElement = jmxDoc.createElement('UniformRandomTimer');
            timerElement.setAttribute('guiclass', 'UniformRandomTimerGui');
            timerElement.setAttribute('testclass', 'UniformRandomTimer');
            timerElement.setAttribute('testname', timerName);
            timerElement.setAttribute('enabled', 'true');
            
            const delayProp = jmxDoc.createElement('stringProp');
            delayProp.setAttribute('name', 'ConstantTimer.delay');
            delayProp.textContent = delay.toString();
            
            const rangeProp = jmxDoc.createElement('stringProp');
            rangeProp.setAttribute('name', 'RandomTimer.range');
            rangeProp.textContent = randomDelay.toString();
            
            timerElement.appendChild(delayProp);
            timerElement.appendChild(rangeProp);
            
        } else if (timerType === 'ConstantTimer') {
            timerElement = jmxDoc.createElement('ConstantTimer');
            timerElement.setAttribute('guiclass', 'ConstantTimerGui');
            timerElement.setAttribute('testclass', 'ConstantTimer');
            timerElement.setAttribute('testname', timerName);
            timerElement.setAttribute('enabled', 'true');
            
            const delayProp = jmxDoc.createElement('stringProp');
            delayProp.setAttribute('name', 'ConstantTimer.delay');
            delayProp.textContent = delay.toString();
            
            timerElement.appendChild(delayProp);
        }
        
        // Add to sampler's hashTree
        samplerHashTree.appendChild(timerElement);
        const emptyHashTree = jmxDoc.createElement('hashTree');
        samplerHashTree.appendChild(emptyHashTree);
        
        // Add to state
        if (!window.appState.timers) {
            window.appState.timers = [];
        }
        
        window.appState.timers.push({
            element: timerElement,
            type: timerType,
            name: timerName,
            enabled: true
        });
        
        addedCount++;
    });
    
    return { success: true, addedCount };
}
