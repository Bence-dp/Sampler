import { loadAndDecodeSound, playSound } from './soundutils.js';
import { pixelToSeconds } from './utils.js';
import { createPadElement, clearPadGrid } from './dom.js';

// audioManager: chargement et construction des pads de samples
async function decodeAll(samples, ctx) {
    const decodePromises = samples.map(s => loadAndDecodeSound(s.url, ctx)
        .then(buf => ({ buf, name: s.name }))
        .catch(e => { console.error('load failed', s.url, e); return null; }));

    const results = await Promise.all(decodePromises);
    return results.map((r, i) => ({ buf: r ? r.buf : null, name: r ? r.name : samples[i].name })).filter(x => x.buf !== null);
}

function arrangePadBuffers(good, cols = 4, rows = 4) {
    const padBuffers = new Array(cols * rows).fill(null);
    for (let i = 0; i < Math.min(good.length, cols * rows); i++) {
        const col = i % cols;
        const rowFromBottom = Math.floor(i / cols);
        const row = rows - 1 - rowFromBottom;
        const padIndex = row * cols + col;
        padBuffers[padIndex] = { buf: good[i].buf, sampleIndex: i, name: good[i].name };
    }
    return { padBuffers, cols, rows };
}

function makePadClickHandler(info, deps) {
    const { waveformDrawer, trimbarsDrawer, canvas, ctx, trimPositions, currentSelected, canvasMgr } = deps;
    return async () => {
        currentSelected.index = info.sampleIndex;
        currentSelected.buf = info.buf;
        currentSelected.name = info.name;

        waveformDrawer.init(info.buf, canvas, '#83E83E');
        const ctx2d = canvas.getContext('2d');
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        waveformDrawer.drawWave(0, canvas.height);

        const pos = trimPositions[info.sampleIndex] || { left: 0, right: canvas.width };
        trimbarsDrawer.leftTrimBar.x = pos.left;
        trimbarsDrawer.rightTrimBar.x = pos.right;

        if (ctx.state === 'suspended') await ctx.resume();
        const start = pixelToSeconds(trimbarsDrawer.leftTrimBar.x, info.buf.duration, canvas.width);
        const end = pixelToSeconds(trimbarsDrawer.rightTrimBar.x, info.buf.duration, canvas.width);
        const res = playSound(ctx, info.buf, start, end);

        if (canvasMgr && res) {
            const startX = trimbarsDrawer.leftTrimBar.x;
            const endX = trimbarsDrawer.rightTrimBar.x;
            canvasMgr.startPlayhead(startX, endX, res.startedAt, res.playDuration);

            if (res.bufferSource && typeof res.bufferSource.onended !== 'undefined') {
                res.bufferSource.onended = () => {
                    try { canvasMgr.stopPlayhead(); } catch (e) { /* ignore */ }
                };
            }
        }
    };
}
// cree les pads visuels
function renderPads(padBuffers, deps) {
    const { padGrid, waveformDrawer, trimbarsDrawer, canvas, ctx, trimPositions, currentSelected } = deps;
    clearPadGrid(padGrid);

    const cols = Math.sqrt(padBuffers.length); 
    const rows = padBuffers.length / cols;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            const info = padBuffers[idx];
            const pad = createPadElement(
                info,
                info
                    ? makePadClickHandler(info, { waveformDrawer, trimbarsDrawer, canvas, ctx, trimPositions, currentSelected, canvasMgr: deps.canvasMgr })
                    : null
            );
            padGrid.appendChild(pad);
        }
    }
}
//charge et affiche les samples

export default async function loadAndShow(samples, deps) {
    const { ctx } = deps;
    const good = await decodeAll(samples, ctx);
    const { padBuffers } = arrangePadBuffers(good, 4, 4);
    renderPads(padBuffers, deps);
}
