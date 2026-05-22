// Atomic facet twists — matches Hyperpuzzle.applyTwist (no animation).

import {
    ORDER,
    cloneSlots,
    slotIndex,
    rotGrid,
    rotateFaceColors,
} from './hyperpuzzle.js';

const N = ORDER;

/** @typedef {{ face: number, sliceMask: number, plane: number, dir: 1|-1 }} AtomicMove */

export function moveKey(m) {
    return `${m.face}:${m.sliceMask}:${m.plane}:${m.dir}`;
}

export function move(face, layer, plane, dir) {
    return { face, sliceMask: 1 << layer, plane, dir: dir > 0 ? 1 : -1 };
}

export function invertMove(m) {
    return { ...m, dir: /** @type {1|-1} */ (-m.dir) };
}

export function layerOfCoord(coord, faceAxis) {
    const d = faceAxis >> 1;
    return N - 1 - coord[d];
}

export function gripIndices(slots, faceAxis, sliceMask) {
    const out = [];
    for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const layer = layerOfCoord([s.ix, s.iy, s.iz, s.iw], faceAxis);
        if ((sliceMask >> layer) & 1) out.push(i);
    }
    return out;
}

export function twistPlaneDims(faceAxis, planeIdx = 0) {
    const dimN = faceAxis >> 1;
    const inDims = [0, 1, 2, 3].filter(d => d !== dimN);
    const planes = [[0, 1], [0, 2], [1, 2]];
    const [bi, ci] = planes[((planeIdx % 3) + 3) % 3];
    return [inDims[bi], inDims[ci]];
}

export function applyMoveToSlots(slots, m) {
    const next = cloneSlots(slots);
    const gripIdx = gripIndices(slots, m.face, m.sliceMask);
    const [dimB, dimC] = twistPlaneDims(m.face, m.plane);
    for (const i of gripIdx) {
        const s = slots[i];
        const ng = rotGrid([s.ix, s.iy, s.iz, s.iw], dimB, dimC, m.dir);
        const fc = new Int8Array(s.faceColors);
        rotateFaceColors(fc, dimB, dimC, m.dir);
        const to = slotIndex(ng[0], ng[1], ng[2], ng[3]);
        next[to].faceColors = fc;
    }
    return next;
}

export function applyMove(puzzle, m, animate = false) {
    puzzle.applyTwist(m.face, m.sliceMask, m.dir, animate, m.plane);
}

export function applyMoves(puzzle, moves, animate = false) {
    for (const m of moves) applyMove(puzzle, m, animate);
}

export function applyMovesToSlots(slots, moves) {
    let s = slots;
    for (const m of moves) s = applyMoveToSlots(s, m);
    return s;
}

/** All non-empty facet twists (≤144). */
export function allAtomicMoves() {
    const out = [];
    for (let face = 0; face < 8; face++) {
        for (let layer = 0; layer < N; layer++) {
            for (let plane = 0; plane < 3; plane++) {
                for (const dir of [1, -1]) {
                    out.push(move(face, layer, plane, dir));
                }
            }
        }
    }
    return out;
}

export function invertMoves(moves) {
    return [...moves].reverse().map(invertMove);
}

export function expandMacro(moves) {
    return moves.flatMap(m => (m.dir === 2 ? [move(m.face, Math.log2(m.sliceMask)|0, m.plane, 1), move(m.face, Math.log2(m.sliceMask)|0, m.plane, 1)] : [m]));
}
