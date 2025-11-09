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
    }

    async decodeAll(samples) {
        const decodePromises = samples.map(s => loadAndDecodeSound(s.url, this.ctx)
            .then(buf => ({ buf, name: s.name }))
            .catch(e => { console.error('load failed', s.url, e); return null; }));

        const results = await Promise.all(decodePromises);
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
        const cols = Math.sqrt(padBuffers.length);
        const rows = padBuffers.length / cols;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const info = padBuffers[idx];
                const pad = createPadElement(info, info ? this.makePadClickHandler(info) : null);
                this.padGrid.appendChild(pad);
            }
        }
    }

    async loadAndShow(samples) {
        const decoded = await this.decodeAll(samples);
        const { padBuffers } = this.arrangePadBuffers(decoded, 4, 4);
        this.renderPads(padBuffers);
    }
}

export { Sample, Sampler };
