// Sampler Manager - View, delete, rename, organize samplers
// Feature 1: Script cleaning after recording

export function initSamplerManager() {
    console.log('Sampler Manager initialized');
}

export function renderSamplersTable(filteredSamplers = null) {
    const tbody = document.getElementById('samplersTableBody');
    if (!tbody) return;
    
    const samplers = filteredSamplers || window.appState.samplers || [];
    
    if (samplers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">No samplers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = samplers.map((sampler, index) => `
        <tr class="${sampler.hidden ? 'hidden' : ''}">
            <td class="px-4 py-3 text-center">
                <input type="checkbox" 
                    id="checkbox-${sampler.originalIndex}"
                    class="sampler-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    data-index="${sampler.originalIndex}">
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">${sampler.originalIndex + 1}</td>
            <td class="px-4 py-3">
                <input type="text" 
                    id="sampler-name-${sampler.originalIndex}" 
                    value="${escapeHtml(sampler.name)}" 
                    oninput="document.getElementById('checkbox-${sampler.originalIndex}').checked = true"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </td>
            <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getMethodClass(sampler.method)}">
                    ${sampler.method}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-700 truncate max-w-md" title="${escapeHtml(sampler.url)}">
                ${escapeHtml(sampler.url)}
            </td>
            <td class="px-4 py-3 text-center">
                <button onclick="renameSampler(${sampler.originalIndex})" 
                    class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors mr-2">
                    Rename
                </button>
                <button onclick="deleteSampler(${sampler.originalIndex})" 
                    class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

export function deleteSampler(index) {
    const samplers = window.appState.samplers || [];
    const sampler = samplers.find(s => s.originalIndex === index);
    
    if (!sampler) {
        return { success: false, error: 'Sampler not found' };
    }
    
    // Remove from XML
    if (sampler.element && sampler.element.parentNode) {
        const hashTree = sampler.element.nextElementSibling;
        if (hashTree && hashTree.tagName === 'hashTree') {
            hashTree.parentNode.removeChild(hashTree);
        }
        sampler.element.parentNode.removeChild(sampler.element);
    }
    
    // Remove from state
    const samplerIndex = samplers.indexOf(sampler);
    if (samplerIndex > -1) {
        samplers.splice(samplerIndex, 1);
    }
    
    return { success: true };
}

export function renameSampler(index) {
    const samplers = window.appState.samplers || [];
    const sampler = samplers.find(s => s.originalIndex === index);
    
    if (!sampler) {
        return { success: false, error: 'Sampler not found' };
    }
    
    const newName = document.getElementById(`sampler-name-${index}`).value.trim();
    
    if (!newName) {
        return { success: false, error: 'Sampler name cannot be empty' };
    }
    
    // Update XML
    sampler.element.setAttribute('testname', newName);
    sampler.name = newName;
    
    return { success: true };
}

export function renameAllSamplers() {
    const samplers = window.appState.samplers || [];
    let renamedCount = 0;
    let emptyCount = 0;
    
    samplers.forEach(sampler => {
        const inputField = document.getElementById(`sampler-name-${sampler.originalIndex}`);
        if (inputField) {
            const newName = inputField.value.trim();
            
            if (!newName) {
                emptyCount++;
            } else {
                // Always update if name is valid
                const currentXmlName = sampler.element.getAttribute('testname');
                if (currentXmlName !== newName) {
                    sampler.element.setAttribute('testname', newName);
                    sampler.name = newName;
                    renamedCount++;
                }
            }
        }
    });
    
    if (emptyCount > 0) {
        return { success: false, error: `${emptyCount} sampler(s) have empty names`, count: renamedCount };
    }
    
    return { success: true, count: renamedCount };
}

export function bulkDeleteSamplers() {
    const checkboxes = document.querySelectorAll('.sampler-checkbox:checked');
    const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
    
    if (indices.length === 0) {
        return { success: false, error: 'No samplers selected', count: 0 };
    }
    
    let deletedCount = 0;
    
    // Delete in reverse order to maintain indices
    indices.sort((a, b) => b - a).forEach(index => {
        const result = deleteSampler(index);
        if (result.success) {
            deletedCount++;
        }
    });
    
    return { success: true, count: deletedCount };
}

export function filterSamplers(searchTerm) {
    const samplers = window.appState.samplers || [];
    
    if (!searchTerm || searchTerm.trim() === '') {
        return samplers;
    }
    
    const term = searchTerm.toLowerCase();
    return samplers.filter(s => 
        s.name.toLowerCase().includes(term) || 
        s.url.toLowerCase().includes(term)
    );
}

function getMethodClass(method) {
    const classes = {
        'GET': 'bg-green-100 text-green-800',
        'POST': 'bg-blue-100 text-blue-800',
        'PUT': 'bg-yellow-100 text-yellow-800',
        'DELETE': 'bg-red-100 text-red-800',
        'PATCH': 'bg-purple-100 text-purple-800'
    };
    return classes[method] || 'bg-gray-100 text-gray-800';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

