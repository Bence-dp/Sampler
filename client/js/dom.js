// utilitaires pour manipuler le DOM
export function getSelectors() {
    return {
        padGrid: document.querySelector('#padGrid'),
        presetSelect: document.querySelector('#presetSelect'),
        canvas: document.querySelector('#myCanvas'),
        canvasOverlay: document.querySelector('#myCanvasOverlay')
    };
}

export function clearPadGrid(padGrid) {
    padGrid.innerHTML = '';
}

export function createPadElement(info, onClick) {
    // Mapping des touches pour chaque index de sample
    const keyMapping = ['W', 'X', 'C', 'V', 'A', 'S', 'D', 'F', 'Q', 'Z', 'E', 'R', '1', '2', '3', '4'];
    
    const pad = document.createElement('div');
    pad.className = 'pad';
    
    if (!info) {
        pad.classList.add('disabled');
        pad.textContent = '';
    } else {
        const label = info.name || `#${info.sampleIndex+1}`;
        
        // Créer le conteneur du label
        const labelSpan = document.createElement('span');
        labelSpan.className = 'pad-label';
        labelSpan.textContent = label.length > 20 ? label.slice(0, 19) + '…' : label;
        
        // Créer l'affichage de la touche en bas
        const keySpan = document.createElement('span');
        keySpan.className = 'pad-key';
        keySpan.textContent = keyMapping[info.sampleIndex] || '';
        keySpan.style.cssText = 'position: absolute; bottom: 5px; right: 5px; font-size: 12px; opacity: 0.7; font-weight: bold;';
        
        pad.style.position = 'relative';
        pad.appendChild(labelSpan);
        pad.appendChild(keySpan);
        pad.title = label;
        pad.onclick = onClick;
    }
    return pad;
}
