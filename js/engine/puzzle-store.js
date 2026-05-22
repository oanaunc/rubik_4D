// Persist scramble history & solutions (sessionStorage + optional file download).

const KEY_HISTORY = 'rubik4d_scramble_history';
const KEY_SOLUTION = 'rubik4d_solution';

/** Max twists tracked in memory + sessionStorage (no automatic trim — would break inverse solve). */
export const MAX_SCRAMBLE_HISTORY = 2000;

export function saveScrambleHistory(history) {
    try {
        sessionStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    } catch (e) {
        console.warn('Could not save scramble history', e);
    }
}

/** Rebuild cube position from solved by replaying recorded twists. */
export function replayHistoryOnPuzzle(puzzle, history) {
    puzzle.reset();
    for (const h of history) {
        puzzle.applyTwist(
            h.faceIdx,
            h.sliceMask,
            h.direction,
            false,
            h.plane ?? 0,
        );
    }
}

export function loadScrambleHistory() {
    try {
        const raw = sessionStorage.getItem(KEY_HISTORY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

export function clearScrambleHistory() {
    try {
        sessionStorage.removeItem(KEY_HISTORY);
    } catch { /* ignore */ }
}

export function saveSolution(moves, meta = {}) {
    const payload = {
        moves,
        savedAt: new Date().toISOString(),
        method: meta.method ?? 'unknown',
        moveCount: moves.length,
        log: meta.log ?? null,
    };
    try {
        sessionStorage.setItem(KEY_SOLUTION, JSON.stringify(payload));
    } catch (e) {
        console.warn('Could not save solution', e);
    }
    return payload;
}

export function loadSolution() {
    try {
        const raw = sessionStorage.getItem(KEY_SOLUTION);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function clearSolution() {
    try {
        sessionStorage.removeItem(KEY_SOLUTION);
    } catch { /* ignore */ }
}

/** Trigger download of solution JSON (works in browser). */
export function downloadSolutionFile(payload, filename = 'rubik4d-solution.json') {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
