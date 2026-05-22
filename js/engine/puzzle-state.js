// State metrics and solved checks for the 3×3×3×3 solver.

import { ORDER, slotIndex } from './hyperpuzzle.js';

const N = ORDER;

/** Fast hash for macro-phase dedup (not used for correctness-critical search). */
export function stateKey(slots) {
    let h = 2166136261;
    for (const s of slots) {
        for (let i = 0; i < 8; i++) {
            h ^= (s.faceColors[i] + 3) & 0xff;
            h = Math.imul(h, 16777619);
        }
    }
    return h >>> 0;
}

/** Collision-free key for BFS / IDA* (grid + sticker colors). */
export function stateKeySearch(slots) {
    const parts = [];
    for (const s of slots) {
        parts.push(s.ix, s.iy, s.iz, s.iw);
        for (let i = 0; i < 8; i++) parts.push(s.faceColors[i]);
    }
    return parts.join(',');
}

export function isSolvedSlots(slots) {
    for (const s of slots) {
        const g = [s.ix, s.iy, s.iz, s.iw];
        for (let axis = 0; axis < 8; axis++) {
            const d = axis >> 1;
            const outer = (axis & 1) === 0 ? N - 1 : 0;
            if (g[d] === outer && s.faceColors[axis] !== axis) return false;
        }
    }
    return true;
}

export function stickerCount(slot) {
    let n = 0;
    for (let i = 0; i < 8; i++) if (slot.faceColors[i] >= 0) n++;
    return n;
}

export function pieceType(slot) {
    const n = stickerCount(slot);
    if (n <= 1) return 'core';
    if (n === 2) return '2c';
    if (n === 3) return '3c';
    return '4c';
}

/** Stickers on outer faces that should match axis index. */
export function misplacedStickers(slots) {
    let n = 0;
    for (const s of slots) {
        const g = [s.ix, s.iy, s.iz, s.iw];
        for (let axis = 0; axis < 8; axis++) {
            const d = axis >> 1;
            const outer = (axis & 1) === 0 ? N - 1 : 0;
            if (g[d] === outer && s.faceColors[axis] >= 0 && s.faceColors[axis] !== axis) n++;
        }
    }
    return n;
}

export function misplacedByType(slots) {
    let c2 = 0, c3 = 0, c4 = 0;
    for (const s of slots) {
        const g = [s.ix, s.iy, s.iz, s.iw];
        let wrong = 0;
        for (let axis = 0; axis < 8; axis++) {
            const d = axis >> 1;
            const outer = (axis & 1) === 0 ? N - 1 : 0;
            if (g[d] === outer && s.faceColors[axis] >= 0 && s.faceColors[axis] !== axis) wrong++;
        }
        if (!wrong) continue;
        const t = pieceType(s);
        if (t === '2c') c2 += wrong;
        else if (t === '3c') c3 += wrong;
        else if (t === '4c') c4 += wrong;
    }
    return { c2, c3, c4, total: c2 + c3 + c4 };
}

/** Solved positions for 3-color pieces (orientation may be wrong). */
export function is3cPositionSolved(slots) {
    for (const s of slots) {
        if (pieceType(s) !== '3c') continue;
        const g = [s.ix, s.iy, s.iz, s.iw];
        const want = new Set();
        for (let axis = 0; axis < 8; axis++) {
            const d = axis >> 1;
            const outer = (axis & 1) === 0 ? N - 1 : 0;
            if (g[d] === outer) want.add(axis);
        }
        const have = new Set();
        for (let axis = 0; axis < 8; axis++) {
            if (s.faceColors[axis] >= 0) have.add(s.faceColors[axis]);
        }
        if (want.size !== have.size) return false;
        for (const a of want) if (!have.has(a)) return false;
    }
    return true;
}

export function heuristic(slots) {
    const m = misplacedByType(slots);
    return m.c4 * 4 + m.c3 * 2 + m.c2 + m.total * 0.1;
}

/** Canonical signatures at solved state indexed by grid coords. */
let _solvedSigs = null;

export function solvedSignatures() {
    if (_solvedSigs) return _solvedSigs;
    const sigs = new Map();
    for (let iw = 0; iw < N; iw++) {
        for (let iz = 0; iz < N; iz++) {
            for (let iy = 0; iy < N; iy++) {
                for (let ix = 0; ix < N; ix++) {
                    const fc = new Int8Array(8).fill(-1);
                    for (let axis = 0; axis < 8; axis++) {
                        const d = axis >> 1;
                        const outer = (axis & 1) === 0 ? N - 1 : 0;
                        const idx = [ix, iy, iz, iw][d];
                        if (idx === outer) fc[axis] = axis;
                    }
                    sigs.set(`${ix},${iy},${iz},${iw}`, [...fc].join(','));
                }
            }
        }
    }
    _solvedSigs = sigs;
    return sigs;
}

export function coordKey(s) {
    return `${s.ix},${s.iy},${s.iz},${s.iw}`;
}

/** Piece at grid cell has the color set that belongs at that cell (position + orientation). */
export function isPieceAtHome(slot) {
    const want = solvedSignatures().get(coordKey(slot));
    if (!want) return true;
    return [...slot.faceColors].join(',') === want;
}

export function piecesNotAtHome(slots) {
    let n = 0;
    for (const s of slots) {
        if (!isPieceAtHome(s)) n++;
    }
    return n;
}
