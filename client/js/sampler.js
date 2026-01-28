import { loadAndDecodeSound, playSound } from './soundutils.js';
import { pixelToSeconds } from './utils.js';
import { createPadElement, clearPadGrid } from './dom.js';

class Sample {
    constructor(buf, name, index) {
        this.buf = buf;
        this.name = name;
        this.index = index;
    }
}

class Sampler {
    constructor(deps) {
        this.ctx = deps.ctx;
        this.padGrid = deps.padGrid;
        this.waveformDrawer = deps.waveformDrawer;
        this.trimbarsDrawer = deps.trimbarsDrawer;
        this.canvas = deps.canvas;
        this.trimPositions = deps.trimPositions;
        this.currentSelected = deps.currentSelected;
        this.canvasMgr = deps.canvasMgr;
        
        // Stocker les samples pour le clavier et MIDI
        this.samples = [];
        this.padsElements = []; // Stocker les éléments DOM des pads
        this.keyPressed = new Set();
        
        // Mapping clavier : rangées de bas en haut
        // Rangée du bas (samples 0-3): W X C V
        // Rangée 2 (samples 4-7): A S D F
        // Rangée 3 (samples 8-11): Q Z E R
        // Rangée 4 (samples 12-15): 1 2 3 4
        this.keyMap = {
            'KeyW': 0, 'KeyX': 1, 'KeyC': 2, 'KeyV': 3,
            'KeyA': 4, 'KeyS': 5, 'KeyD': 6, 'KeyF': 7,
            'KeyQ': 8, 'KeyZ': 9, 'KeyE': 10, 'KeyR': 11,
            'Digit1': 12, 'Digit2': 13, 'Digit3': 14, 'Digit4': 15
        };
        
        // Mapping MIDI : notes 36-51 (C1 à D#2)
        this.midiMap = {};
        for (let i = 0; i < 16; i++) {
            this.midiMap[36 + i] = i;
        }
        
        this.setupKeyboardListener();
        this.setupMIDI();
    }

    async decodeAll(samples) {
        const loadingContainer = document.getElementById('loadingContainer');
        const progressBar = document.getElementById('samplesProgress');
        const loadingText = document.getElementById('loadingText');
        
        if (loadingContainer) loadingContainer.style.display = 'block';
        if (progressBar) progressBar.value = 0;
        if (loadingText) loadingText.textContent = `Chargement 0/${samples.length}...`;

        let completed = 0;
        const decodePromises = samples.map(s => loadAndDecodeSound(s.url, this.ctx)
            .then(buf => {
                completed++;
                if (progressBar) progressBar.value = (completed / samples.length) * 100;
                if (loadingText) loadingText.textContent = `Chargement ${completed}/${samples.length}...`;
                return { buf, name: s.name };
            })
            .catch(e => { 
                console.error('load failed', s.url, e);
                completed++;
                if (progressBar) progressBar.value = (completed / samples.length) * 100;
                if (loadingText) loadingText.textContent = `Chargement ${completed}/${samples.length}...`;
                return null;
            }));

        const results = await Promise.all(decodePromises);
        
        if (loadingContainer) loadingContainer.style.display = 'none';
        
        const good = results.map((r, i) => ({ buf: r ? r.buf : null, name: r ? r.name : samples[i].name })).filter(x => x.buf !== null);
        return good.map((g, i) => new Sample(g.buf, g.name, i));
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
            this.currentSelected.index = info.sampleIndex;
            this.currentSelected.buf = info.buf;
            this.currentSelected.name = info.name;

            this.waveformDrawer.init(info.buf, this.canvas, '#83E83E');
            const ctx2d = this.canvas.getContext('2d');
            ctx2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.waveformDrawer.drawWave(0, this.canvas.height);

            const pos = this.trimPositions[info.sampleIndex] || { left: 0, right: this.canvas.width };
            this.trimbarsDrawer.leftTrimBar.x = pos.left;
            this.trimbarsDrawer.rightTrimBar.x = pos.right;

            if (this.ctx.state === 'suspended') await this.ctx.resume();
            const start = pixelToSeconds(this.trimbarsDrawer.leftTrimBar.x, info.buf.duration, this.canvas.width);
            const end = pixelToSeconds(this.trimbarsDrawer.rightTrimBar.x, info.buf.duration, this.canvas.width);
            const res = playSound(this.ctx, info.buf, start, end);

            if (this.canvasMgr && res) {
                const startX = this.trimbarsDrawer.leftTrimBar.x;
                const endX = this.trimbarsDrawer.rightTrimBar.x;
                const token = this.canvasMgr.startPlayhead(startX, endX, res.startedAt, res.playDuration);
                if (res.bufferSource && typeof res.bufferSource.onended !== 'undefined') {
                    res.bufferSource.onended = () => { try { this.canvasMgr.stopPlayheadIfToken(token); } catch (e) { } };
                }
            }
        };
    }

    renderPads(padBuffers) {
        clearPadGrid(this.padGrid);
        this.padsElements = []; // Réinitialiser
        
        const cols = Math.sqrt(padBuffers.length);
        const rows = padBuffers.length / cols;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const info = padBuffers[idx];
                const pad = createPadElement(info, info ? this.makePadClickHandler(info) : null);
                
                // Stocker la référence du pad avec son sampleIndex
                if (info) {
                    this.padsElements[info.sampleIndex] = pad;
                }
                
                this.padGrid.appendChild(pad);
            }
        }
    }

    async loadAndShow(samples) {
        // Désactiver tous les pads pendant le chargement
        this.setAllPadsDisabled(true);
        
        const decoded = await this.decodeAll(samples);
        const { padBuffers } = this.arrangePadBuffers(decoded, 4, 4);
        this.renderPads(padBuffers);
        
        // Stocker les samples pour le clavier et MIDI
        this.samples = decoded;
        
        // Réactiver les pads après le chargement
        this.setAllPadsDisabled(false);
    }

    setupKeyboardListener() {
        document.addEventListener('keydown', (e) => {
            // Ignorer si l'utilisateur tape dans un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const sampleIndex = this.keyMap[e.code];
            if (sampleIndex !== undefined && !this.keyPressed.has(e.code)) {
                this.keyPressed.add(e.code);
                this.playSampleByIndex(sampleIndex);
                this.highlightPad(sampleIndex, true);
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keyPressed.delete(e.code);
            const sampleIndex = this.keyMap[e.code];
            if (sampleIndex !== undefined) {
                this.highlightPad(sampleIndex, false);
            }
        });
    }

    async setupMIDI() {
        if (!navigator.requestMIDIAccess) {
            console.log('Web MIDI API non supportée');
            return;
        }

        try {
            const midiAccess = await navigator.requestMIDIAccess();
            console.log('MIDI activé');
            
            for (const input of midiAccess.inputs.values()) {
                input.onmidimessage = (message) => this.handleMIDIMessage(message);
            }
        } catch (err) {
            console.log('Erreur MIDI:', err);
        }
    }

    handleMIDIMessage(message) {
        const [status, note, velocity] = message.data;
        const command = status >> 4;
        
        console.log('MIDI reçu - Status:', status, 'Note:', note, 'Velocity:', velocity, 'Command:', command);
        
        // Note On (0x9) avec velocity > 0
        if (command === 9 && velocity > 0) {
            const sampleIndex = this.midiMap[note];
            console.log('Note MIDI', note, '-> Sample index:', sampleIndex);
            if (sampleIndex !== undefined) {
                this.playSampleByIndex(sampleIndex);
                this.highlightPad(sampleIndex, true);
            }
        }
        // Note Off (0x8) ou Note On avec velocity 0
        else if (command === 8 || (command === 9 && velocity === 0)) {
            const sampleIndex = this.midiMap[note];
            if (sampleIndex !== undefined) {
                this.highlightPad(sampleIndex, false);
            }
        }
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

    async playSampleByIndex(index) {
        if (!this.samples[index]) return;
        
        const sample = this.samples[index];
        
        // Mettre à jour la sélection courante
        this.currentSelected.index = index;
        this.currentSelected.buf = sample.buf;
        this.currentSelected.name = sample.name;

        // Afficher la waveform
        this.waveformDrawer.init(sample.buf, this.canvas, '#83E83E');
        const ctx2d = this.canvas.getContext('2d');
        ctx2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.waveformDrawer.drawWave(0, this.canvas.height);

        const pos = this.trimPositions[index] || { left: 0, right: this.canvas.width };
        this.trimbarsDrawer.leftTrimBar.x = pos.left;
        this.trimbarsDrawer.rightTrimBar.x = pos.right;

        if (this.ctx.state === 'suspended') await this.ctx.resume();
        const start = pixelToSeconds(this.trimbarsDrawer.leftTrimBar.x, sample.buf.duration, this.canvas.width);
        const end = pixelToSeconds(this.trimbarsDrawer.rightTrimBar.x, sample.buf.duration, this.canvas.width);
        const res = playSound(this.ctx, sample.buf, start, end);

        if (this.canvasMgr && res) {
            const startX = this.trimbarsDrawer.leftTrimBar.x;
            const endX = this.trimbarsDrawer.rightTrimBar.x;
            const token = this.canvasMgr.startPlayhead(startX, endX, res.startedAt, res.playDuration);
            if (res.bufferSource && typeof res.bufferSource.onended !== 'undefined') {
                res.bufferSource.onended = () => { try { this.canvasMgr.stopPlayheadIfToken(token); } catch (e) { } };
            }
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
                // Ne retirer disabled que si le pad a réellement un son
                if (!pad.classList.contains('disabled') || pad.onclick) {
                    pad.classList.remove('disabled');
                    pad.style.pointerEvents = '';
                    pad.style.opacity = '';
                }
            }
        });
    }
}

export { Sample, Sampler };
