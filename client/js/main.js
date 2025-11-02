// About imports and exports in JavaScript modules
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export

import { Sampler } from './sampler.js';
import { getSelectors } from './dom.js';
import { initCanvas } from './canvasManager.js';

// The AudioContext object is the main "entry point" into the Web Audio API
let ctx;

const fallbackSoundURLs = [
    'https://upload.wikimedia.org/wikipedia/commons/a/a3/Hardstyle_kick.wav',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c7/Redoblante_de_marcha.ogg/Redoblante_de_marcha.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c9/Hi-Hat_Cerrado.ogg/Hi-Hat_Cerrado.ogg.mp3'
];

let waveformDrawer, trimbarsDrawer;
let canvas, canvasOverlay;
let trimPositions = {};
let currentSelected = { index: -1, buf: null, name: null };

window.onload = async function init() {
    ctx = new AudioContext();

    const apiBase = 'http://localhost:3000';

    let presets = null;
    try {
        const resp = await fetch(`${apiBase}/api/presets`);
        if (resp.ok) presets = await resp.json();
    } catch (err) {
        console.warn(`Could not fetch ${apiBase}/api/presets, using fallback`, err);
    }

    let samples = fallbackSoundURLs.map(u => ({ url: u, name: u.split('/').pop() }));

    const els = getSelectors();
    const presetSelect = els.presetSelect;
    const padGrid = els.padGrid;

    if (presets && presets.length > 0) {
        presets.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.name || `Preset ${i+1}`;
            presetSelect.appendChild(opt);
        });

        const first = presets[0];
        if (first.samples && first.samples.length > 0) {
            samples = first.samples.map(s => ({ url: `${apiBase}/presets/${s.url}`, name: s.name || s.url }));
        }
    }

    canvas = els.canvas;
    canvasOverlay = els.canvasOverlay;

    const canvasMgr = initCanvas(canvas, canvasOverlay, ctx);
    waveformDrawer = canvasMgr.waveformDrawer;
    trimbarsDrawer = canvasMgr.trimbarsDrawer;

    canvasMgr.setupMouseHandlers({
        onMove: () => {},
        onUp: () => {
            if (currentSelected.index >= 0) {
                trimPositions[currentSelected.index] = {
                    left: trimbarsDrawer.leftTrimBar.x,
                    right: trimbarsDrawer.rightTrimBar.x
                };
            }
        }
    });

    canvasMgr.startAnimation();

    const sampler = new Sampler({ ctx, padGrid, waveformDrawer, trimbarsDrawer, canvas, trimPositions, currentSelected, canvasMgr });

    presetSelect.onchange = async (evt) => {
        const index = parseInt(evt.target.value);
        const p = presets[index];
        let urls = fallbackSoundURLs;
        if (p && p.samples && p.samples.length > 0) urls = p.samples.map(s => ({ url: `${apiBase}/presets/${s.url}`, name: s.name || s.url }));
        await sampler.loadAndShow(urls);
    };

    await sampler.loadAndShow(samples);
};

