import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';

//initialise les dessins sur le canvas et gere les evenements de la souris
export function initCanvas(canvas, canvasOverlay, audioCtx) {
    const waveformDrawer = new WaveformDrawer();
    const trimbarsDrawer = new TrimbarsDrawer(canvasOverlay, 0, canvas.width);
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
            const rect = canvas.getBoundingClientRect();
            mousePos.x = (evt.clientX - rect.left);
            mousePos.y = (evt.clientY - rect.top);
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
