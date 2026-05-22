import { Hyperpuzzle } from './engine/hyperpuzzle.js?v=80';
import { PuzzleRenderer } from './engine/renderer.js?v=79';
import { Controls4D } from './controls.js?v=80';
import { buildFacetCenteredView, FACE_NAMES } from './engine/projection.js?v=80';
import {
    solveByReversing,
    playMovesAnimated,
    positionMatchesHistory,
} from './engine/solver.js?v=83';
import { formatMove, formatHistoryMove } from './engine/notation.js?v=88';
import { SolveLog } from './engine/solve-log.js?v=80';
import { isSolvedSlots } from './engine/puzzle-state.js?v=80';
import {
    saveScrambleHistory,
    loadScrambleHistory,
    clearScrambleHistory,
    replayHistoryOnPuzzle,
    saveSolution,
    loadSolution,
    clearSolution,
    MAX_SCRAMBLE_HISTORY,
} from './engine/puzzle-store.js?v=80';
let selectedFace = -1;
let selectedSlot = null;
let selectedSlice = 0;
let twistPlane = 1;
let moveHistory = [];

const DEFAULT_HINT =
    'Drag to rotate view · Rotate W / ZW / continuously · Stop rotation · Click a cubie, then CW / CCW';

const LAYER_LABELS = ['outer', 'middle', 'inner'];
const PLANE_LABELS = ['A (shallow)', 'B (wide)', 'C (deep)'];

let statusClearTimer = null;

function puzzleIsSolved(puzzle) {
    return isSolvedSlots(puzzle.slots);
}

function historyMatchesCube(puzzle, history = moveHistory) {
    return history.length > 0 && positionMatchesHistory(puzzle.slots, history);
}

function init() {
    const container = document.getElementById('canvas-container');
    const solveLog = new SolveLog(document.getElementById('solve-log'));
    const puzzle = new Hyperpuzzle();
    puzzle.rot4d = buildFacetCenteredView();

    const renderer = new PuzzleRenderer(container);
    const canvas = renderer.renderer.domElement;
    const controls = new Controls4D(canvas, puzzle, null);
    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousedown', () => { canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('mouseup', () => { canvas.style.cursor = 'grab'; });

    canvas.addEventListener('mousemove', e => {
        if (controls.isDragging()) return;
        const rect = canvas.getBoundingClientRect();
        const ndc = {
            x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
        };
        const hit = renderer.pick(ndc.x, ndc.y);
        renderer.setHoverSlot(hit?.slot ?? null);
    });

    canvas.addEventListener('mouseleave', () => renderer.setHoverSlot(null));

    canvas.addEventListener('click', e => {
        if (!controls.wasClick()) return;
        const rect = canvas.getBoundingClientRect();
        const ndc = {
            x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
        };
        const hit = renderer.pick(ndc.x, ndc.y);
        if (hit && hit.faceIdx >= 0) {
            selectedFace = hit.faceIdx;
            selectedSlot = hit.slot;
            highlightFaceButtons(selectedFace);
            updateSelectionSummary(puzzle);
            updateHint(`Selected ${FACE_NAMES[selectedFace]} — layer ${selectedSlice} — CW/CCW to twist.`);
        } else {
            updateHint('Click a colored sticker face to select twist axis.');
        }
    });

    document.getElementById('btn-clear-solve-log')?.addEventListener('click', () => solveLog.clear());

    const lastSol = loadSolution();
    if (lastSol?.log?.steps?.length) {
        solveLog.load(lastSol.log);
    }

    moveHistory = loadScrambleHistory();
    if (moveHistory.length) {
        replayHistoryOnPuzzle(puzzle, moveHistory);
    }

    function trackedHistory() {
        if (moveHistory.length) return moveHistory;
        const stored = loadScrambleHistory();
        if (stored.length) return stored;
        return [];
    }

    document.getElementById('btn-reset').addEventListener('click', () => {
        puzzle.reset();
        moveHistory = [];
        clearScrambleHistory();
        clearSolution();
        solveLog.clear();
        selectedFace = -1;
        selectedSlot = null;
        highlightFaceButtons(-1);
        updateStatus(puzzle);
    });

    const scrambleSlider = document.getElementById('scramble-length');
    const scrambleLengthOut = document.getElementById('scramble-length-val');

    function getScrambleLength() {
        const n = parseInt(scrambleSlider?.value ?? '10', 10);
        return Math.min(30, Math.max(1, Number.isFinite(n) ? n : 10));
    }

    function syncScrambleLengthLabel() {
        const n = getScrambleLength();
        if (scrambleLengthOut) scrambleLengthOut.textContent = String(n);
    }

    scrambleSlider?.addEventListener('input', syncScrambleLengthLabel);
    syncScrambleLengthLabel();

    document.getElementById('btn-scramble').addEventListener('click', () => {
        const n = getScrambleLength();
        puzzle.reset();
        moveHistory = puzzle.scramble(n);
        saveScrambleHistory(moveHistory);
        clearSolution();
        solveLog.clear();
        selectedFace = -1;
        selectedSlot = null;
        highlightFaceButtons(-1);
        updateStatus(puzzle);
        updateHint(`Scrambled ${n} moves. Press Solve to restore.`);
    });

    document.getElementById('btn-undo').addEventListener('click', async () => {
        if (!moveHistory.length) return;
        if (puzzle.twistAnim) return;
        const last = moveHistory.pop();
        puzzle.applyTwist(last.faceIdx, last.sliceMask, -last.direction, true, last.plane ?? 0);
        while (puzzle.twistAnim) {
            puzzle.tickAnim(performance.now());
            await new Promise(r => requestAnimationFrame(r));
        }
        saveScrambleHistory(moveHistory);
        updateStatus(puzzle);
    });

    document.getElementById('btn-recenter')?.addEventListener('click', () => {
        puzzle.rot4d = buildFacetCenteredView();
    });

    let viewSpinSpeed = 0.0035;
    let viewSpinMode = '3d';
    let viewSpinning = false;

    const rotationSpeedSlider = document.getElementById('rotation-speed');
    const rotationSpeedOut = document.getElementById('rotation-speed-val');

    function syncRotationSpeed() {
        const n = parseInt(rotationSpeedSlider?.value ?? '35', 10);
        const clamped = Math.min(100, Math.max(1, Number.isFinite(n) ? n : 35));
        if (rotationSpeedOut) rotationSpeedOut.textContent = String(clamped);
        viewSpinSpeed = clamped * 0.0001;
    }

    rotationSpeedSlider?.addEventListener('input', syncRotationSpeed);
    syncRotationSpeed();

    function syncViewSpinButtons() {
        document.getElementById('btn-rotate-w')?.classList.toggle('active', viewSpinning && viewSpinMode === 'w');
        document.getElementById('btn-rotate-zw')?.classList.toggle('active', viewSpinning && viewSpinMode === 'zw');
        document.getElementById('btn-rotate-start')?.classList.toggle('active', viewSpinning && viewSpinMode === '3d');
    }

    function startViewSpin(mode) {
        viewSpinMode = mode;
        viewSpinning = true;
        syncViewSpinButtons();
    }

    function stopViewSpin() {
        viewSpinning = false;
        syncViewSpinButtons();
    }

    function toggleViewSpin(mode, onLabel) {
        if (viewSpinning && viewSpinMode === mode) {
            stopViewSpin();
            updateHint('Rotation stopped.');
        } else {
            startViewSpin(mode);
            updateHint(onLabel);
        }
    }

    document.getElementById('btn-rotate-w')?.addEventListener('click', () => {
        toggleViewSpin('w', 'Rotating W axis (XW / YW).');
    });

    document.getElementById('btn-rotate-zw')?.addEventListener('click', () => {
        toggleViewSpin('zw', 'Rotating ZW plane.');
    });

    document.getElementById('btn-rotate-start')?.addEventListener('click', () => {
        toggleViewSpin('3d', 'Rotating continuously (3D view).');
    });

    document.getElementById('btn-rotate-stop')?.addEventListener('click', () => {
        stopViewSpin();
        updateHint('Rotation stopped.');
    });

    function tickViewSpin() {
        if (!viewSpinning) return;
        if (viewSpinMode === 'w') {
            puzzle.applyViewRotation([0, 3], viewSpinSpeed);
            puzzle.applyViewRotation([1, 3], viewSpinSpeed * 0.65);
        } else if (viewSpinMode === 'zw') {
            puzzle.applyViewRotation([2, 3], viewSpinSpeed);
        } else {
            puzzle.applyViewRotation([2, 0], viewSpinSpeed);
            puzzle.applyViewRotation([2, 1], viewSpinSpeed * 0.7);
        }
    }

    function logPlaybackMoves(moves, prefix) {
        const indices = [];
        for (let i = 0; i < moves.length; i++) {
            indices.push(solveLog.add('move', `${prefix} ${i + 1}/${moves.length}`, formatMove(moves[i])));
        }
        return indices;
    }

    async function playWithLog(moves, prefix) {
        const indices = logPlaybackMoves(moves, prefix);
        await playMovesAnimated(puzzle, moves, {
            delayMs: 22,
            onStep: ({ index }) => solveLog.highlight(indices[index]),
            onComplete: () => solveLog.unhighlight(),
        });
    }

    document.getElementById('btn-solve')?.addEventListener('click', async () => {
        const prog = document.getElementById('solve-progress');
        const btnSolve = document.getElementById('btn-solve');
        if (puzzle.twistAnim) return;
        if (puzzleIsSolved(puzzle)) {
            updateHint('Already solved.');
            return;
        }
        const history = trackedHistory();
        if (!history.length) {
            updateHint('No recorded scramble — press Scramble first.');
            return;
        }
        if (!historyMatchesCube(puzzle, history)) {
            solveLog.clear();
            solveLog.add('error', 'History out of sync', `${history.length} saved moves do not match this cube — use Scramble or Reset`);
            updateHint('Recorded moves do not match the cube. Press Scramble or Reset.');
            return;
        }
        const inverse = solveByReversing(history);
        if (!inverse?.length) return;

        btnSolve.disabled = true;
        const showActiveStatus = msg => {
            if (statusClearTimer) {
                clearTimeout(statusClearTimer);
                statusClearTimer = null;
            }
            if (prog) prog.textContent = msg;
            updateHint(msg);
        };
        solveLog.clear();
        solveLog.add('info', 'Solve', 'Reverses the exact twists that built this position');
        for (let i = 0; i < history.length; i++) {
            solveLog.add('history', `Scramble twist ${i + 1}/${history.length}`, formatHistoryMove(history[i]));
        }
        solveLog.add('info', 'Inverse plan ready', `${inverse.length} twists to apply`);
        showActiveStatus('Solve: playing inverse…');
        await new Promise(r => setTimeout(r, 0));
        try {
            await playWithLog(inverse, 'Solve');
            if (puzzleIsSolved(puzzle)) {
                saveSolution(inverse, { method: 'solve', log: solveLog.export() });
                moveHistory = [];
                clearScrambleHistory();
                solveLog.add('done', 'Puzzle solved', `Restored in ${inverse.length} moves`);
                showTransientStatus(`Done — ${inverse.length} moves.`);
            } else {
                solveLog.add('error', 'Not fully solved after inverse', 'History may not match current position');
                showTransientStatus('Finished moves but puzzle not fully solved.', 3500);
            }
            updateStatus(puzzle);
        } catch (e) {
            console.error(e);
            solveLog.add('error', 'Solve failed', e.message);
            showTransientStatus(`Error: ${e.message}`, 3500);
        }
        btnSolve.disabled = false;
    });

    for (let i = 0; i < 8; i++) {
        document.getElementById(`face-${i}`)?.addEventListener('click', () => {
            selectedFace = i;
            highlightFaceButtons(i);
            updateSelectionSummary(puzzle);
            updateHint(`Selected ${FACE_NAMES[i]}.`);
        });
    }

    function sliceFromValue(v) {
        return v === 'middle' ? 1 : v === 'inner' ? 2 : 0;
    }

    function planeFromValue(v) {
        return v === 'deep' ? 2 : v === 'wide' ? 1 : 0;
    }

    document.querySelectorAll('input[name="twist-slice"]').forEach(radio => {
        radio.addEventListener('change', e => {
            if (e.target.checked) {
                selectedSlice = sliceFromValue(e.target.value);
                updateSelectionSummary(puzzle);
            }
        });
    });

    document.querySelectorAll('input[name="twist-plane"]').forEach(radio => {
        radio.addEventListener('change', e => {
            if (e.target.checked) {
                twistPlane = planeFromValue(e.target.value);
                updateSelectionSummary(puzzle);
            }
        });
    });

    document.getElementById('btn-ccw').addEventListener('click', () => {
        if (selectedFace < 0) { updateHint('Select a face first.'); return; }
        doTwist(puzzle, selectedFace, 1 << selectedSlice, 1, solveLog);
    });
    document.getElementById('btn-cw').addEventListener('click', () => {
        if (selectedFace < 0) { updateHint('Select a face first.'); return; }
        doTwist(puzzle, selectedFace, 1 << selectedSlice, -1, solveLog);
    });

    (function animate() {
        requestAnimationFrame(animate);
        tickViewSpin();
        renderer.update(puzzle, selectedFace, selectedSlot);
        renderer.render();
    })();

    updateStatus(puzzle);
    updateHint(DEFAULT_HINT);
}

function doTwist(puzzle, faceIdx, sliceMask, direction, solveLog = null) {
    if (moveHistory.length >= MAX_SCRAMBLE_HISTORY) {
        updateHint(`Move limit reached (${MAX_SCRAMBLE_HISTORY}). Press Reset or Scramble.`);
        return;
    }
    puzzle.applyTwist(faceIdx, sliceMask, direction, true, twistPlane);
    moveHistory.push({ faceIdx, sliceMask, direction, plane: twistPlane });
    saveScrambleHistory(moveHistory);
    if (solveLog) {
        const n = moveHistory.length;
        const label = direction > 0 ? 'CCW' : 'CW';
        solveLog.add(
            'move',
            `Manual ${label} (#${n})`,
            formatMove({ face: faceIdx, sliceMask, plane: twistPlane, dir: direction }),
        );
    }
    updateStatus(puzzle);
}

function highlightFaceButtons(activeIdx) {
    for (let i = 0; i < 8; i++) {
        document.getElementById(`face-${i}`)?.classList.toggle('active', i === activeIdx);
    }
}

function updateSelectionSummary(puzzle) {
    const faceEl = document.getElementById('sel-face');
    const layerEl = document.getElementById('sel-layer');
    const planeEl = document.getElementById('sel-plane');
    const movesEl = document.getElementById('sel-moves');
    const stateEl = document.getElementById('sel-state');
    if (!faceEl) return;

    faceEl.textContent = selectedFace >= 0
        ? FACE_NAMES[selectedFace]
        : '—';
    layerEl.textContent = LAYER_LABELS[selectedSlice] ?? 'outer';
    planeEl.textContent = PLANE_LABELS[twistPlane] ?? 'B (wide)';
    movesEl.textContent = String(moveHistory.length);
    if (stateEl && puzzle) {
        stateEl.textContent = puzzleIsSolved(puzzle) ? 'Solved' : 'Scrambled';
        stateEl.classList.toggle('glance-solved', puzzleIsSolved(puzzle));
        stateEl.classList.toggle('glance-scrambled', !puzzleIsSolved(puzzle));
    }
}

function updateStatus(puzzle) {
    const el = document.getElementById('status');
    if (!el) return;
    el.classList.remove('status-solved', 'status-scrambled');
    if (puzzleIsSolved(puzzle)) {
        el.textContent = 'Status: SOLVED ✓';
        el.classList.add('status-solved');
    } else {
        el.textContent = 'Status: Scrambled';
        el.classList.add('status-scrambled');
    }
    updateSelectionSummary(puzzle);
}

function updateHint(msg) {
    const el = document.getElementById('hint');
    if (el) el.textContent = msg;
}

function showTransientStatus(msg, ms = 2000) {
    if (statusClearTimer) clearTimeout(statusClearTimer);
    const prog = document.getElementById('solve-progress');
    if (prog) prog.textContent = msg;
    updateHint(msg);
    statusClearTimer = setTimeout(() => {
        statusClearTimer = null;
        if (prog) prog.textContent = '';
        updateHint(DEFAULT_HINT);
    }, ms);
}

document.addEventListener('DOMContentLoaded', init);
