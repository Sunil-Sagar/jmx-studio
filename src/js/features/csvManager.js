// CSV Manager - Configure CSV Data Set (all variants)
// Feature 3: LoadRunner-style parameterization

export function initCSVManager() {
    console.log('CSV Manager initialized');
}

export function renderCSVTable() {
    const csvConfigs = window.appState.csvConfigs || [];
    const container = document.getElementById('csvTableContainer');
    
    document.getElementById('csvCount').textContent = `${csvConfigs.length} config${csvConfigs.length !== 1 ? 's' : ''}`;
    
    if (csvConfigs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <p class="mb-2">No CSV Data Set configs found</p>
                <p class="text-sm">Add CSV configs above to parameterize your test</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Config Name</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">File Path</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Variables</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Share Mode</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    csvConfigs.forEach((config, index) => {
        const typeBadge = getCSVTypeBadge(config.type);
        const shareMode = getShareModeLabel(config.shareMode);
        
        html += `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${config.name || 'Unnamed Config'}</td>
                <td class="px-4 py-3 text-sm">${typeBadge}</td>
                <td class="px-4 py-3 text-sm text-gray-600 font-mono">${config.filename || 'N/A'}</td>
                <td class="px-4 py-3 text-sm text-gray-600 font-mono">${config.variableNames || 'N/A'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${shareMode}</td>
                <td class="px-4 py-3 text-sm text-center">
                    <button onclick="editCSVConfig(${index})" 
                        class="text-blue-600 hover:text-blue-800 mr-3 font-medium">
                        Edit
                    </button>
                    <button onclick="deleteCSVConfig(${index})" 
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

function getCSVTypeBadge(type) {
    const badges = {
        'CSVDataSet': '<span class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">Standard CSV</span>',
        'RandomCSVDataSet': '<span class="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">Random CSV</span>',
        'ExtendedCSVDataSet': '<span class="px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded">Extended CSV</span>',
        'UniqueCSVDataSet': '<span class="px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded">Unique CSV</span>'
    };
    return badges[type] || '<span class="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded">Unknown</span>';
}

function getShareModeLabel(shareMode) {
    const modes = {
        'shareMode.all': 'All threads',
        'shareMode.group': 'Thread group',
        'shareMode.thread': 'Current thread'
    };
    return modes[shareMode] || shareMode;
}

export function addCSVConfig(type, config) {
    const jmxDoc = window.appState.jmxDocument;
    if (!jmxDoc) {
        return { success: false, error: 'No JMX file loaded' };
    }
    
    // Find Test Plan's hashTree (top level)
    const testPlan = jmxDoc.getElementsByTagName('TestPlan')[0];
    if (!testPlan) {
        return { success: false, error: 'No Test Plan found' };
    }
    
    const testPlanHashTree = testPlan.nextElementSibling;
    if (!testPlanHashTree || testPlanHashTree.tagName !== 'hashTree') {
        return { success: false, error: 'Invalid JMX structure' };
    }
    
    // Create appropriate CSV element based on type
    let csvElement, guiClass, testClass;
    
    if (type === 'RandomCSVDataSet') {
        csvElement = jmxDoc.createElement('com.blazemeter.jmeter.RandomCSVDataSetConfig');
        guiClass = 'com.blazemeter.jmeter.RandomCSVDataSetConfigGui';
        testClass = 'com.blazemeter.jmeter.RandomCSVDataSetConfig';
    } else if (type === 'ExtendedCSVDataSet') {
        csvElement = jmxDoc.createElement('com.di.jmeter.config.ExtendedCsvDataSetConfig');
        guiClass = 'com.di.jmeter.config.gui.ExtendedCsvDataSetConfigGui';
        testClass = 'com.di.jmeter.config.ExtendedCsvDataSetConfig';
    } else if (type === 'UniqueCSVDataSet') {
        csvElement = jmxDoc.createElement('dukhi.a.jmeter.config.UniqueCSVDataSet');
        guiClass = 'TestBeanGUI';
        testClass = 'dukhi.a.jmeter.config.UniqueCSVDataSet';
    } else {
        // Standard CSVDataSet
        csvElement = jmxDoc.createElement('CSVDataSet');
        guiClass = 'TestBeanGUI';
        testClass = 'CSVDataSet';
    }
    
    csvElement.setAttribute('guiclass', guiClass);
    csvElement.setAttribute('testclass', testClass);
    csvElement.setAttribute('testname', config.name);
    
    csvElement.setAttribute('guiclass', guiClass);
    csvElement.setAttribute('testclass', testClass);
    csvElement.setAttribute('testname', config.name);
    
    // Add properties based on type
    if (type === 'CSVDataSet') {
        // Standard CSV - exact structure from JMeter
        addStringProp(csvElement, 'delimiter', config.delimiter);
        addStringProp(csvElement, 'fileEncoding', config.fileEncoding || '');
        addStringProp(csvElement, 'filename', config.filename);
        addBoolProp(csvElement, 'ignoreFirstLine', config.ignoreFirstLine || false);
        addBoolProp(csvElement, 'quotedData', config.allowQuoted || false);
        addBoolProp(csvElement, 'recycle', config.recycle !== undefined ? config.recycle : true);
        addStringProp(csvElement, 'shareMode', config.shareMode || 'shareMode.all');
        addBoolProp(csvElement, 'stopThread', config.stopThread || false);
        addStringProp(csvElement, 'variableNames', config.variableNames);
    } else if (type === 'RandomCSVDataSet') {
        // BlazeMeter Random CSV
        addStringProp(csvElement, 'filename', config.filename);
        addStringProp(csvElement, 'fileEncoding', config.fileEncoding || 'UTF-8');
        addStringProp(csvElement, 'delimiter', config.delimiter);
        addStringProp(csvElement, 'variableNames', config.variableNames);
        addBoolProp(csvElement, 'randomOrder', config.randomOrder || true);
        addBoolProp(csvElement, 'ignoreFirstLine', config.ignoreFirstLine || false);
        addBoolProp(csvElement, 'rewindOnTheEndOfList', config.rewind !== undefined ? config.rewind : true);
        addBoolProp(csvElement, 'independentListPerThread', config.independentList || false);
    } else if (type === 'ExtendedCSVDataSet') {
        // Di Extended CSV
        addStringProp(csvElement, 'filename', config.filename);
        addStringProp(csvElement, 'fileEncoding', config.fileEncoding || 'UTF-8');
        addStringProp(csvElement, 'variableNames', config.variableNames);
        addBoolProp(csvElement, 'ignoreFirstLine', config.ignoreFirstLine || true);
        addStringProp(csvElement, 'delimiter', config.delimiter);
        addBoolProp(csvElement, 'quotedData', config.allowQuoted || false);
        addStringProp(csvElement, 'selectRow', config.selectRow || 'Sequential');
        addStringProp(csvElement, 'updateValue', config.updateValues || 'Each Iteration');
        addStringProp(csvElement, 'ooValue', config.outOfValues || 'Continue Cyclic');
        addStringProp(csvElement, 'shareMode', config.shareMode || 'All threads');
        addBoolProp(csvElement, 'autoAllocate', config.allocateMode === 'Auto');
        addBoolProp(csvElement, 'allocate', config.allocateMode === 'Manual');
        addStringProp(csvElement, 'blockSize', config.allocateCount ? config.allocateCount.toString() : '');
    } else if (type === 'UniqueCSVDataSet') {
        // Dukhi Unique CSV
        addIntProp(csvElement, 'blockSize', config.blockSize || 1);
        addStringProp(csvElement, 'delimiter', config.delimiter);
        addStringProp(csvElement, 'fileEncoding', config.fileEncoding || '');
        addStringProp(csvElement, 'filename', config.filename);
        addBoolProp(csvElement, 'ignoreFirstLine', config.ignoreFirstLine || false);
        addBoolProp(csvElement, 'quotedData', config.allowQuoted || false);
        addBoolProp(csvElement, 'recycle', config.recycle !== undefined ? config.recycle : true);
        addStringProp(csvElement, 'shareMode', config.shareMode || 'shareMode.all');
        addBoolProp(csvElement, 'stopThread', config.stopThread || false);
        addStringProp(csvElement, 'threadGroup', config.targetThreadGroup || 'Thread Group A');
        addStringProp(csvElement, 'variableNames', config.variableNames);
    }
    
    // Helper functions
    function addStringProp(parent, name, value) {
        const prop = jmxDoc.createElement('stringProp');
        prop.setAttribute('name', name);
        prop.textContent = value || '';
        parent.appendChild(prop);
    }
    
    function addBoolProp(parent, name, value) {
        const prop = jmxDoc.createElement('boolProp');
        prop.setAttribute('name', name);
        prop.textContent = value ? 'true' : 'false';
        parent.appendChild(prop);
    }
    
    function addIntProp(parent, name, value) {
        const prop = jmxDoc.createElement('intProp');
        prop.setAttribute('name', name);
        prop.textContent = value.toString();
        parent.appendChild(prop);
    }
    
    // Add to Test Plan level (after UDV/Arguments, before first ThreadGroup)
    const threadGroups = jmxDoc.getElementsByTagName('ThreadGroup');
    if (threadGroups.length > 0) {
        // Insert before first thread group
        testPlanHashTree.insertBefore(csvElement, threadGroups[0]);
        const emptyHashTree = jmxDoc.createElement('hashTree');
        testPlanHashTree.insertBefore(emptyHashTree, threadGroups[0]);
    } else {
        // No thread groups, append at end
        testPlanHashTree.appendChild(csvElement);
        const emptyHashTree = jmxDoc.createElement('hashTree');
        testPlanHashTree.appendChild(emptyHashTree);
    }
    
    // Update state
    if (!window.appState.csvConfigs) {
        window.appState.csvConfigs = [];
    }
    
    window.appState.csvConfigs.push({
        element: csvElement,
        type: type,
        ...config
    });
    
    return { success: true };
}

// No longer needed - always use CSVDataSet
// function getGuiClass(type) {
//     return 'TestBeanGUI';
// }

export function deleteCSVConfig(index) {
    const csvConfigs = window.appState.csvConfigs;
    if (!csvConfigs || index < 0 || index >= csvConfigs.length) {
        return { success: false, error: 'Invalid config index' };
    }
    
    const config = csvConfigs[index];
    const element = config.element;
    
    // Remove element and its hashTree
    const hashTree = element.nextElementSibling;
    if (hashTree && hashTree.tagName === 'hashTree') {
        hashTree.remove();
    }
    element.remove();
    
    // Remove from state
    csvConfigs.splice(index, 1);
    
    return { success: true };
}

export function editCSVConfig(index) {
    const csvConfigs = window.appState.csvConfigs;
    if (!csvConfigs || index < 0 || index >= csvConfigs.length) {
        return { success: false, error: 'Invalid config index' };
    }
    
    const config = csvConfigs[index];
    
    // Populate common form fields
    document.getElementById('csvType').value = config.type;
    document.getElementById('csvName').value = config.name;
    document.getElementById('csvFilePath').value = config.filename;
    document.getElementById('csvFileEncoding').value = config.fileEncoding || 'UTF-8';
    document.getElementById('csvVariables').value = config.variableNames;
    document.getElementById('csvDelimiter').value = config.delimiter;
    
    // Trigger type field visibility
    window.updateCSVTypeFields();
    
    // Populate type-specific fields
    if (config.type === 'CSVDataSet') {
        document.getElementById('csvShareMode').value = config.shareMode;
        document.getElementById('csvRecycle').checked = config.recycle;
        document.getElementById('csvStopThread').checked = config.stopThread;
        document.getElementById('csvIgnoreFirstLine').checked = config.ignoreFirstLine;
        document.getElementById('csvAllowQuoted').checked = config.allowQuoted;
    } else if (config.type === 'RandomCSVDataSet') {
        document.getElementById('csvRandomOrder').checked = config.randomOrder;
        document.getElementById('csvRewind').checked = config.rewind;
        document.getElementById('csvFirstLineHeader').checked = config.firstLineHeader;
        document.getElementById('csvIndependentList').checked = config.independentList;
    } else if (config.type === 'ExtendedCSVDataSet') {
        document.getElementById('csvShareMode').value = config.shareMode;
        document.getElementById('csvIgnoreFirstLine').checked = config.ignoreFirstLine;
        document.getElementById('csvAllowQuoted').checked = config.allowQuoted;
        document.getElementById('csvSelectRow').value = config.selectRow;
        document.getElementById('csvUpdateValues').value = config.updateValues;
        document.getElementById('csvOutOfValues').value = config.outOfValues;
        if (config.allocateMode === 'auto') {
            document.getElementById('csvAllocateAuto').checked = true;
        } else {
            document.getElementById('csvAllocateManual').checked = true;
            document.getElementById('csvAllocateCount').value = config.allocateCount || 1;
        }
        window.updateExtendedFields();
    } else if (config.type === 'UniqueCSVDataSet') {
        document.getElementById('csvShareMode').value = config.shareMode;
        document.getElementById('csvRecycle').checked = config.recycle;
        document.getElementById('csvStopThread').checked = config.stopThread;
        document.getElementById('csvIgnoreFirstLine').checked = config.ignoreFirstLine;
        document.getElementById('csvAllowQuoted').checked = config.allowQuoted;
        document.getElementById('csvTargetThreadGroup').value = config.targetThreadGroup || '';
        document.getElementById('csvBlockSize').value = config.blockSize || 1;
    }
    
    // Delete old config
    deleteCSVConfig(index);
    
    // Scroll to form
    document.getElementById('csvType').scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    return { success: true };
}
