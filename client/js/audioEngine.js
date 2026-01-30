import { loadAndDecodeSound, playSound } from './soundutils.js';
import { pixelToSeconds } from './utils.js';

class Sample {
    constructor(buf, name, index) {
        this.buf = buf;
        this.name = name;
        this.index = index;
    }
}

class AudioEngine {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.samples = [];
        this.trimPositions = {};
        this.currentSample = { index: -1, buf: null, name: null };
        this.keyPressed = new Set();
        
        this.keyMap = {
            'KeyZ': 0, 'KeyX': 1, 'KeyC': 2, 'KeyV': 3,
            'KeyA': 4, 'KeyS': 5, 'KeyD': 6, 'KeyF': 7,
            'KeyQ': 8, 'KeyW': 9, 'KeyE': 10, 'KeyR': 11,
            'Digit1': 12, 'Digit2': 13, 'Digit3': 14, 'Digit4': 15
        };
        
        this.midiMap = {};
        for (let i = 0; i < 16; i++) {
            this.midiMap[36 + i] = i;
        }
        
        this.onSamplePlay = null;
        this.onSampleSelect = null;
        this.onLoadProgress = null;
        this.onKeyDown = null;
        this.onKeyUp = null;
    }

    async decodeAll(samples) {
        let completed = 0;
        
        if (this.onLoadProgress) {
            this.onLoadProgress(completed, samples.length);
        }

        const decodePromises = samples.map(s => loadAndDecodeSound(s.url, this.ctx)
            .then(buf => {
                completed++;
                if (this.onLoadProgress) {
                    this.onLoadProgress(completed, samples.length);
                }
                return { buf, name: s.name };
            })
            .catch(e => { 
                console.error('load failed', s.url, e);
                completed++;
                if (this.onLoadProgress) {
                    this.onLoadProgress(completed, samples.length);
                }
                return null;
            }));

        const results = await Promise.all(decodePromises);
        const good = results
            .map((r, i) => ({ buf: r ? r.buf : null, name: r ? r.name : samples[i].name }))
            .filter(x => x.buf !== null);
        
        return good.map((g, i) => new Sample(g.buf, g.name, i));
    }

    async loadSamples(samples) {
        this.samples = await this.decodeAll(samples);
        return this.samples;
    }

    async playSampleByIndex(index, canvasWidth = 620) {
        if (!this.samples[index]) {
            console.warn(`Sample ${index} not found`);
            return null;
        }
        
        const sample = this.samples[index];
        
        this.currentSample.index = index;
        this.currentSample.buf = sample.buf;
        this.currentSample.name = sample.name;

        if (this.onSampleSelect) {
            this.onSampleSelect(sample, index);
        }

        const pos = this.trimPositions[index] || { left: 0, right: canvasWidth };
        
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        
        const start = pixelToSeconds(pos.left, sample.buf.duration, canvasWidth);
        const end = pixelToSeconds(pos.right, sample.buf.duration, canvasWidth);
        const result = playSound(this.ctx, sample.buf, start, end);

        if (this.onSamplePlay) {
            this.onSamplePlay(sample, index, result, pos);
        }

        return result;
    }

    setTrimPosition(sampleIndex, left, right) {
        this.trimPositions[sampleIndex] = { left, right };
    }

    getTrimPosition(sampleIndex, defaultWidth = 620) {
        return this.trimPositions[sampleIndex] || { left: 0, right: defaultWidth };
    }

    setupKeyboardListener() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const sampleIndex = this.keyMap[e.code];
            if (sampleIndex !== undefined && !this.keyPressed.has(e.code)) {
                this.keyPressed.add(e.code);
                this.playSampleByIndex(sampleIndex);
                
                if (this.onKeyDown) {
                    this.onKeyDown(sampleIndex, e.code);
                }
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keyPressed.delete(e.code);
            const sampleIndex = this.keyMap[e.code];
            
            if (sampleIndex !== undefined && this.onKeyUp) {
                this.onKeyUp(sampleIndex, e.code);
            }
        });
    }

    async setupMIDI() {
        if (!navigator.requestMIDIAccess) {
            console.log('Web MIDI API non supportée');
            return false;
        }

        try {
            const midiAccess = await navigator.requestMIDIAccess();
            console.log('MIDI activé');
            
            for (const input of midiAccess.inputs.values()) {
                input.onmidimessage = (message) => this.handleMIDIMessage(message);
            }
            return true;
        } catch (err) {
            console.log('Erreur MIDI:', err);
            return false;
        }
    }

    handleMIDIMessage(message) {
        const [status, note, velocity] = message.data;
        const command = status >> 4;
        
        if (command === 9 && velocity > 0) {
            const sampleIndex = this.midiMap[note];
            if (sampleIndex !== undefined) {
                this.playSampleByIndex(sampleIndex);
                
                if (this.onKeyDown) {
                    this.onKeyDown(sampleIndex, `MIDI-${note}`);
                }
            }
        }
        else if (command === 8 || (command === 9 && velocity === 0)) {
            const sampleIndex = this.midiMap[note];
            if (sampleIndex !== undefined && this.onKeyUp) {
                this.onKeyUp(sampleIndex, `MIDI-${note}`);
            }
        }
    }

    getSample(index) {
        return this.samples[index];
    }

    getSamples() {
        return this.samples;
    }

    getSampleCount() {
        return this.samples.length;
    }
}

export { Sample, AudioEngine };
