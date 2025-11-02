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
    const pad = document.createElement('div');
    pad.className = 'pad';
    if (!info) {
        pad.classList.add('disabled');
        pad.textContent = '';
    } else {
        const label = info.name || `#${info.sampleIndex+1}`;
        pad.textContent = label.length > 12 ? label.slice(0, 11) + '…' : label;
        pad.onclick = onClick;
    }
    return pad;
}
