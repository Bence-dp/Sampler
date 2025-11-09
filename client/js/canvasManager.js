import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';

//initialise les dessins sur le canvas et gere les evenements de la souris
export function initCanvas(canvas, canvasOverlay, audioCtx) {
    const waveformDrawer = new WaveformDrawer();
    // ensure canvas pixel buffer matches displayed size so mouse coords map correctly
    let currentWidth = 0;
    let currentHeight = 0;
    let trimbarsDrawer = null;

    function setSizeAndSync() {
        const w = Math.max(1, Math.floor(canvas.clientWidth));
        const h = Math.max(1, Math.floor(canvas.clientHeight));
        if (w === currentWidth && h === currentHeight) return;

        // compute scale to preserve trim positions when resizing
        const scaleX = currentWidth ? (w / currentWidth) : 1;

        // update internal pixel buffer size
        canvas.width = w;
        canvas.height = h;
        canvasOverlay.width = w;
        canvasOverlay.height = h;

        // if we already had trim bars, scale their positions
        if (trimbarsDrawer) {
            trimbarsDrawer.leftTrimBar.x = Math.round(trimbarsDrawer.leftTrimBar.x * scaleX);
            trimbarsDrawer.rightTrimBar.x = Math.round(trimbarsDrawer.rightTrimBar.x * scaleX);
            trimbarsDrawer.canvas = canvasOverlay;
            trimbarsDrawer.ctx = canvasOverlay.getContext('2d');
        } else {
            trimbarsDrawer = new TrimbarsDrawer(canvasOverlay, 0, w);
        }

        currentWidth = w;
        currentHeight = h;
    }

    // initial sizing
    setSizeAndSync();

    // update sizes on window resize (debounced-ish)
    let resizeId = null;
    window.addEventListener('resize', () => {
        if (resizeId) cancelAnimationFrame(resizeId);
        resizeId = requestAnimationFrame(() => { setSizeAndSync(); resizeId = null; });
    });
    const mousePos = { x: 0, y: 0 };

    // playhead state
    const playhead = {
        active: false,
        startX: 0,
        endX: canvas.width,
        startedAt: 0,
        duration: 0
    };

    function animate() {
        if (trimbarsDrawer) {
            trimbarsDrawer.clear();
        }

        if (playhead.active && audioCtx) {
            const now = audioCtx.currentTime;
            const elapsed = now - playhead.startedAt;
            const t = playhead.duration > 0 ? (elapsed / playhead.duration) : 1;

            let x = playhead.startX + t * (playhead.endX - playhead.startX);
            if (t >= 1) {
                x = playhead.endX;
                playhead.active = false;
            }

            const ctx2 = canvasOverlay.getContext('2d');
            ctx2.save();
            ctx2.strokeStyle = 'red';
            ctx2.lineWidth = 2;
            ctx2.beginPath();
            ctx2.moveTo(x, 0);
            ctx2.lineTo(x, canvasOverlay.height);
            ctx2.stroke();
            ctx2.restore();
        }

        if (trimbarsDrawer) {
            trimbarsDrawer.draw();
        }

        requestAnimationFrame(animate);
    }

    function setupMouseHandlers(handlers = {}) {
        const { onMove, onDown, onUp } = handlers;

        canvasOverlay.onmousemove = (evt) => {
            // use overlay's bounding rect so coords remain consistent
            const rect = canvasOverlay.getBoundingClientRect();
            // map client coords to canvas pixels (internal width)
            mousePos.x = (evt.clientX - rect.left) * (canvas.width / rect.width || 1);
            mousePos.y = (evt.clientY - rect.top) * (canvas.height / rect.height || 1);
            trimbarsDrawer.moveTrimBars(mousePos);
            if (onMove) onMove(mousePos);
        };

        canvasOverlay.onmousedown = () => {
            trimbarsDrawer.startDrag();
            if (onDown) onDown();
        };

        canvasOverlay.onmouseup = () => {
            trimbarsDrawer.stopDrag();
            if (onUp) onUp();
        };
    }

    function startAnimation() {
        requestAnimationFrame(animate);
    }

    function startPlayhead(startX, endX, startedAt, duration) {
        playhead.active = true;
        playhead.startX = startX;
        playhead.endX = endX;
        playhead.startedAt = startedAt;
        playhead.duration = duration;
    }

    function stopPlayhead() {
        playhead.active = false;
    }

    return { waveformDrawer, trimbarsDrawer, mousePos, setupMouseHandlers, startAnimation, startPlayhead, stopPlayhead };
}
