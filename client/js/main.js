// About imports and exports in JavaScript modules
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export

import { Sampler } from './sampler.js';
import { getSelectors } from './dom.js';
import { initCanvas } from './canvasManager.js';
import Recorder from './recorder.js';
import { PresetManager } from './presetManager.js';
/* import recorder.js */
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
let recorder;
let presetManager;

window.onload = async function init() {
    ctx = new AudioContext();
    const apiBase = 'https://samplerserver.onrender.com';

    const els = getSelectors();
    const presetSelect = els.presetSelect;
    const padGrid = els.padGrid;

    canvas = els.canvas;
    canvasOverlay = els.canvasOverlay;

    const canvasMgr = initCanvas(canvas, canvasOverlay, ctx);
    waveformDrawer = canvasMgr.waveformDrawer;
    trimbarsDrawer = canvasMgr.trimbarsDrawer;

    canvasMgr.setupMouseHandlers({
        onMove: () => {},
        onUp: () => {
            if (currentSelected.index >= 0 && sampler.audioEngine) {
                sampler.updateTrimPosition(currentSelected.index);
            }
        }
    });

    canvasMgr.startAnimation();

    const sampler = new Sampler({ ctx, padGrid, waveformDrawer, trimbarsDrawer, canvas, trimPositions, currentSelected, canvasMgr });

    // Initialiser le PresetManager
    presetManager = new PresetManager({
        apiBase,
        presetSelect,
        sampler
    });

    // Charger les presets et configurer le handler de changement
    await presetManager.initialize();
    presetManager.setupChangeHandler();

    // create recorder after preset manager so it can notify on new uploads
    // pass `apiBase` so Recorder uploads to the correct server (can be remote)
    recorder = new Recorder({ audioContext: ctx, canvasMgr, canvas, apiBase, presetManager });
    await recorder.init();

    // Si aucun preset n'est disponible, charger les sons par défaut
    if (presetManager.presets.length === 0) {
        const samples = fallbackSoundURLs.map(u => ({ url: u, name: u.split('/').pop() }));
        await sampler.loadAndShow(samples);
    }
};

