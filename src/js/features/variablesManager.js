// Variables Manager - Manage user-defined variables
// Feature 2: Add, edit, delete variables with find & replace

export function initVariablesManager() {
    console.log('Variables Manager initialized');
}

export function renderVariablesTable() {
    const tbody = document.getElementById('variablesTableBody');
    if (!tbody) return;
    
    const variables = window.appState.userDefinedVariables || [];
    
    // Load current UDV group name
    const udvGroupNameInput = document.getElementById('udvGroupName');
    if (udvGroupNameInput && window.appState.userDefinedVariablesElement) {
        const currentName = window.appState.userDefinedVariablesElement.getAttribute('testname');
        udvGroupNameInput.value = currentName || 'User Defined Variables';
    }
    
    if (variables.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No variables found</td></tr>';
        return;
    }
    
    tbody.innerHTML = variables.map((variable, index) => `
        <tr>
            <td class="px-4 py-3 text-sm text-gray-600">${index + 1}</td>
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(variable.name)}</td>
            <td class="px-4 py-3">
                <input type="text" 
                    id="var-value-${index}" 
                    value="${escapeHtml(variable.value)}" 
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </td>
            <td class="px-4 py-3 text-center">
                <button onclick="updateVariable(${index})" 
                    class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors mr-2">
                    Update
                </button>
                <button onclick="deleteVariable(${index})" 
                    class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

export function addVariable(name, value) {
    if (!name || !name.trim()) {
        return { success: false, error: 'Variable name is required' };
    }
    
    const variables = window.appState.userDefinedVariables || [];
    
    // Check for duplicate
    const exists = variables.find(v => v.name === name);
    if (exists) {
        return { success: false, error: 'Variable already exists' };
    }
    
    // Get Arguments element from JMX
    const argumentsElement = window.appState.userDefinedVariablesElement;
    if (!argumentsElement) {
        return { success: false, error: 'User Defined Variables element not found' };
    }
    
    // Get collectionProp
    let collectionProp = argumentsElement.querySelector('collectionProp[name="Arguments.arguments"]');
    if (!collectionProp) {
        const jmxDoc = window.appState.jmxDocument;
        collectionProp = jmxDoc.createElement('collectionProp');
        collectionProp.setAttribute('name', 'Arguments.arguments');
        argumentsElement.appendChild(collectionProp);
    }
    
    // Create new elementProp
    const jmxDoc = window.appState.jmxDocument;
    const elementProp = jmxDoc.createElement('elementProp');
    elementProp.setAttribute('name', name);
    elementProp.setAttribute('elementType', 'Argument');
    
    const nameNode = jmxDoc.createElement('stringProp');
    nameNode.setAttribute('name', 'Argument.name');
    nameNode.textContent = name;
    
    const valueNode = jmxDoc.createElement('stringProp');
    valueNode.setAttribute('name', 'Argument.value');
    valueNode.textContent = value;
    
    const metadataNode = jmxDoc.createElement('stringProp');
    metadataNode.setAttribute('name', 'Argument.metadata');
    metadataNode.textContent = '=';
    
    elementProp.appendChild(nameNode);
    elementProp.appendChild(valueNode);
    elementProp.appendChild(metadataNode);
    
    collectionProp.appendChild(elementProp);
    
    // Update state
    variables.push({ name, value, element: elementProp });
    window.appState.userDefinedVariables = variables;
    
    return { success: true };
}

export function updateVariable(index) {
    const variables = window.appState.userDefinedVariables || [];
    if (index < 0 || index >= variables.length) {
        return { success: false, error: 'Invalid variable index' };
    }
    
    const newValue = document.getElementById(`var-value-${index}`).value;
    const variable = variables[index];
    
    // Update XML
    const valueNode = variable.element.querySelector('stringProp[name="Argument.value"]');
    if (valueNode) {
        valueNode.textContent = newValue;
        variable.value = newValue;
        return { success: true };
    }
    
    return { success: false, error: 'Failed to update variable' };
}

export function deleteVariable(index) {
    const variables = window.appState.userDefinedVariables || [];
    if (index < 0 || index >= variables.length) {
        return { success: false, error: 'Invalid variable index' };
    }
    
    const variable = variables[index];
    
    // Remove from XML
    if (variable.element && variable.element.parentNode) {
        variable.element.parentNode.removeChild(variable.element);
    }
    
    // Remove from state
    variables.splice(index, 1);
    window.appState.userDefinedVariables = variables;
    
    return { success: true };
}

export function findAndReplace(findText, replaceText) {
    if (!findText) {
        return { success: false, error: 'Find text is required', count: 0 };
    }
    
    const variables = window.appState.userDefinedVariables || [];
    let replacementCount = 0;
    
    variables.forEach(variable => {
        if (variable.value.includes(findText)) {
            const newValue = variable.value.replaceAll(findText, replaceText);
            const valueNode = variable.element.querySelector('stringProp[name="Argument.value"]');
            if (valueNode) {
                valueNode.textContent = newValue;
                variable.value = newValue;
                replacementCount++;
            }
        }
    });
    
    return { success: true, count: replacementCount };
}

export function previewFindReplace(findText) {
    if (!findText) {
        return { matches: [] };
    }
    
    const variables = window.appState.userDefinedVariables || [];
    const matches = variables.filter(v => v.value.includes(findText));
    
    return { matches };
}

export function updateUDVGroupName() {
    const udvElement = window.appState.userDefinedVariablesElement;
    if (!udvElement) {
        return { success: false, error: 'No UDV element found' };
    }
    
    let newName = document.getElementById('udvGroupName').value.trim();
    // Use default if empty
    if (!newName) {
        newName = 'User Defined Variables';
    }
    
    // Update the testname attribute
    udvElement.setAttribute('testname', newName);
    
    return { success: true, message: `UDV group renamed to "${newName}"` };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

