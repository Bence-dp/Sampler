import { AudioEngine } from './audioEngine.js';
import { createPadElement, clearPadGrid } from './dom.js';

class Sampler {
    constructor(deps) {
        this.audioEngine = new AudioEngine(deps.ctx);
        this.padGrid = deps.padGrid;
        this.waveformDrawer = deps.waveformDrawer;
        this.trimbarsDrawer = deps.trimbarsDrawer;
        this.canvas = deps.canvas;
        this.canvasMgr = deps.canvasMgr;
        this.currentSelected = deps.currentSelected;
        
        this.padsElements = [];
        
        this.setupEngineCallbacks();
        this.audioEngine.setupKeyboardListener();
        this.audioEngine.setupMIDI();
    }

    setupEngineCallbacks() {
        this.audioEngine.onLoadProgress = (completed, total) => {
            const loadingContainer = document.getElementById('loadingContainer');
            const progressBar = document.getElementById('samplesProgress');
            const loadingText = document.getElementById('loadingText');
            
            if (loadingContainer) {
                loadingContainer.style.display = completed < total ? 'block' : 'none';
            }
            if (progressBar) progressBar.value = (completed / total) * 100;
            if (loadingText) loadingText.textContent = `Chargement ${completed}/${total}...`;
        };

        this.audioEngine.onSampleSelect = (sample, index) => {
            this.currentSelected.index = index;
            this.currentSelected.buf = sample.buf;
            this.currentSelected.name = sample.name;

            this.waveformDrawer.init(sample.buf, this.canvas, '#83E83E');
            const ctx2d = this.canvas.getContext('2d');
            ctx2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.waveformDrawer.drawWave(0, this.canvas.height);

            const pos = this.audioEngine.getTrimPosition(index, this.canvas.width);
            this.trimbarsDrawer.leftTrimBar.x = pos.left;
            this.trimbarsDrawer.rightTrimBar.x = pos.right;
        };

        this.audioEngine.onSamplePlay = (sample, index, result, trimPos) => {
            if (this.canvasMgr && result) {
                const startX = trimPos.left;
                const endX = trimPos.right;
                const token = this.canvasMgr.startPlayhead(startX, endX, result.startedAt, result.playDuration);
                if (result.bufferSource && typeof result.bufferSource.onended !== 'undefined') {
                    result.bufferSource.onended = () => { 
                        try { 
                            this.canvasMgr.stopPlayheadIfToken(token); 
                        } catch (e) { } 
                    };
                }
            }
        };

        this.audioEngine.onKeyDown = (sampleIndex) => {
            this.highlightPad(sampleIndex, true);
        };

        this.audioEngine.onKeyUp = (sampleIndex) => {
            this.highlightPad(sampleIndex, false);
        };
    }

    arrangePadBuffers(samples, cols = 4, rows = 4) {
        const padBuffers = new Array(cols * rows).fill(null);
        for (let i = 0; i < Math.min(samples.length, cols * rows); i++) {
            const col = i % cols;
            const rowFromBottom = Math.floor(i / cols);
            const row = rows - 1 - rowFromBottom;
            const padIndex = row * cols + col;
            padBuffers[padIndex] = { buf: samples[i].buf, sampleIndex: i, name: samples[i].name };
        }
        return { padBuffers, cols, rows };
    }

    makePadClickHandler(info) {
        return async () => {
            await this.audioEngine.playSampleByIndex(info.sampleIndex, this.canvas.width);
        };
    }

    renderPads(padBuffers) {
        clearPadGrid(this.padGrid);
        this.padsElements = [];
        
        const cols = Math.sqrt(padBuffers.length);
        const rows = padBuffers.length / cols;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const info = padBuffers[idx];
                const pad = createPadElement(info, info ? this.makePadClickHandler(info) : null);
                
                if (info) {
                    this.padsElements[info.sampleIndex] = pad;
                }
                
                this.padGrid.appendChild(pad);
            }
        }
    }

    async loadAndShow(samples) {
        this.setAllPadsDisabled(true);
        
        const decoded = await this.audioEngine.loadSamples(samples);
        const { padBuffers } = this.arrangePadBuffers(decoded, 4, 4);
        this.renderPads(padBuffers);
        
        this.setAllPadsDisabled(false);
    }

    highlightPad(sampleIndex, active) {
        const pad = this.padsElements[sampleIndex];
        if (!pad) return;
        
        if (active) {
            pad.style.backgroundColor = '#83E83E';
            pad.style.transform = 'scale(0.95)';
            pad.style.color = '#000';
        } else {
            pad.style.backgroundColor = '';
            pad.style.transform = '';
            pad.style.color = '';
        }
    }

    updateTrimPosition(sampleIndex) {
        if (sampleIndex >= 0) {
            this.audioEngine.setTrimPosition(
                sampleIndex,
                this.trimbarsDrawer.leftTrimBar.x,
                this.trimbarsDrawer.rightTrimBar.x
            );
        }
    }

    setAllPadsDisabled(disabled) {
        if (!this.padGrid) return;
        
        const pads = this.padGrid.querySelectorAll('.pad');
        pads.forEach(pad => {
            if (disabled) {
                pad.classList.add('disabled');
                pad.style.pointerEvents = 'none';
                pad.style.opacity = '0.5';
            } else {
                if (!pad.classList.contains('disabled') || pad.onclick) {
                    pad.classList.remove('disabled');
                    pad.style.pointerEvents = '';
                    pad.style.opacity = '';
                }
            }
        });
    }
}

export { Sampler };