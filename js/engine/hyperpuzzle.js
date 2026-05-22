// 3×3×3×3 — ft_hypercube(3) grid model (HSC cut depths ±⅓)

import {
    mat4identity, mat4mul, mat4rotPlane, mat4orthogonalize, mat4transform,
    LAYER_COORDS, HALF,
} from './projection.js';

export const ORDER = 3;
const N = ORDER;
const LAYER_SPAN = LAYER_COORDS[2] - LAYER_COORDS[0];
export const PIECE_HALF = (LAYER_SPAN / N / 2) * (1 - 0.04);

export const AXES = [
    [1, 0, 0, 0], [-1, 0, 0, 0], [0, 1, 0, 0], [0, -1, 0, 0],
    [0, 0, 1, 0], [0, 0, -1, 0], [0, 0, 0, 1], [0, 0, 0, -1],
];

const CELLS = [
    { dim: 0, outer: 2 }, { dim: 0, outer: 0 },
    { dim: 1, outer: 2 }, { dim: 1, outer: 0 },
    { dim: 2, outer: 2 }, { dim: 2, outer: 0 },
    { dim: 3, outer: 2 }, { dim: 3, outer: 0 },
];

function gridToCoord(i) {
    return LAYER_COORDS[i];
}

function coords(ix, iy, iz, iw) {
    return [gridToCoord(ix), gridToCoord(iy), gridToCoord(iz), gridToCoord(iw)];
}

function boundaryFaceColor(ix, iy, iz, iw, axis) {
    const idx = [ix, iy, iz, iw];
    const a = axis >> 1;
    const sign = (axis & 1) === 0 ? 1 : -1;
    if (sign > 0 && idx[a] === N - 1) return axis;
    if (sign < 0 && idx[a] === 0) return axis;
    return -1;
}

function rotateFaceColors(fc, dimA, dimB, dir) {
    const pa = 2 * dimA, ma = 2 * dimA + 1;
    const pb = 2 * dimB, mb = 2 * dimB + 1;
    const t = new Int8Array(fc);
    if (dir > 0) {
        fc[pa] = t[mb]; fc[ma] = t[pb]; fc[pb] = t[pa]; fc[mb] = t[ma];
    } else {
        fc[pa] = t[pb]; fc[ma] = t[mb]; fc[pb] = t[ma]; fc[mb] = t[pa];
    }
}

function rotGrid(g, dimA, dimB, dir) {
    const c = [...g];
    const a = c[dimA], b = c[dimB];
    if (dir > 0) {
        c[dimA] = N - 1 - b;
        c[dimB] = a;
    } else {
        c[dimA] = b;
        c[dimB] = N - 1 - a;
    }
    return c;
}

function slotIndex(ix, iy, iz, iw) {
    return ix + N * (iy + N * (iz + N * iw));
}

function indexToGrid(i) {
    const iw = Math.floor(i / (N * N * N));
    const rem = i % (N * N * N);
    const iz = Math.floor(rem / (N * N));
    const rem2 = rem % (N * N);
    const iy = Math.floor(rem2 / N);
    const ix = rem2 % N;
    return [ix, iy, iz, iw];
}

function buildSlots() {
    const slots = new Array(N ** 4);
    for (let i = 0; i < slots.length; i++) {
        const [ix, iy, iz, iw] = indexToGrid(i);
        const faceColors = new Int8Array(8);
        faceColors.fill(-1);
        for (let axis = 0; axis < 8; axis++) {
            const c = boundaryFaceColor(ix, iy, iz, iw, axis);
            if (c >= 0) faceColors[axis] = c;
        }
        slots[i] = { ix, iy, iz, iw, faceColors };
    }
    return slots;
}

function layerOfSlot(slot, faceAxis) {
    const a = faceAxis >> 1;
    return N - 1 - [slot.ix, slot.iy, slot.iz, slot.iw][a];
}

export class Hyperpuzzle {
    constructor() {
        this.slots = buildSlots();
        this.rot4d = mat4identity();
        this._orthoCounter = 0;
        this.twistAnim = null;
    }

    applyViewRotation(plane, angle) {
        const delta = mat4rotPlane(plane[0], plane[1], angle);
        this.rot4d = mat4mul(delta, this.rot4d);
        if (++this._orthoCounter >= 24) {
            this.rot4d = mat4orthogonalize(this.rot4d);
            this._orthoCounter = 0;
        }
    }

    gripSlots(faceAxis, sliceMask) {
        return this.slots.filter(s => (sliceMask >> layerOfSlot(s, faceAxis)) & 1);
    }

    /** In-facet rotation plane for ft_hypercubic (0→[0,1], 1→[0,2], 2→[1,2]). */
    twistPlaneDims(faceAxis, planeIdx = 0) {
        const dimN = faceAxis >> 1;
        const inDims = [0, 1, 2, 3].filter(d => d !== dimN);
        const planes = [[0, 1], [0, 2], [1, 2]];
        const [bi, ci] = planes[((planeIdx % 3) + 3) % 3];
        return [inDims[bi], inDims[ci]];
    }

    applyTwist(faceAxis, sliceMask, direction, animate = true, planeIdx = 0) {
        if (this.twistAnim) return;
        const grip = this.gripSlots(faceAxis, sliceMask);
        if (!grip.length) return;

        const [dimB, dimC] = this.twistPlaneDims(faceAxis, planeIdx);

        const run = () => {
            const nextColors = this.slots.map(s => new Int8Array(s.faceColors));
            for (const s of grip) {
                const ng = rotGrid([s.ix, s.iy, s.iz, s.iw], dimB, dimC, direction);
                const fc = new Int8Array(s.faceColors);
                rotateFaceColors(fc, dimB, dimC, direction);
                nextColors[slotIndex(ng[0], ng[1], ng[2], ng[3])] = fc;
            }
            for (let i = 0; i < this.slots.length; i++) {
                this.slots[i].faceColors = nextColors[i];
            }
        };

        if (animate) {
            this.twistAnim = {
                dimB, dimC, direction, grip, planeIdx,
                t0: performance.now(),
                duration: 240,
                onDone: run,
            };
        } else {
            run();
        }
    }

    tickAnim(now) {
        if (!this.twistAnim) return;
        const a = this.twistAnim;
        const t = Math.min(1, (now - a.t0) / a.duration);
        const angle = a.direction * (Math.PI / 2) * (1 - (1 - t) ** 3);
        const partial = mat4rotPlane(a.dimB, a.dimC, angle);
        for (const s of a.grip) {
            const base = coords(s.ix, s.iy, s.iz, s.iw);
            s._animCenter = mat4transform(base, partial);
        }
        if (t >= 1) {
            for (const s of a.grip) delete s._animCenter;
            a.onDone();
            this.twistAnim = null;
        }
    }

    slotCenter(s) {
        return s._animCenter || coords(s.ix, s.iy, s.iz, s.iw);
    }

    cubiesForCell(cellIdx) {
        const { dim, outer } = CELLS[cellIdx];
        const out = [];
        const g = [0, 0, 0, 0];
        g[dim] = outer;
        const dims = [0, 1, 2, 3].filter(d => d !== dim);
        for (let a = 0; a < N; a++) {
            for (let b = 0; b < N; b++) {
                for (let c = 0; c < N; c++) {
                    g[dims[0]] = a;
                    g[dims[1]] = b;
                    g[dims[2]] = c;
                    out.push({
                        slot: this.slots[slotIndex(g[0], g[1], g[2], g[3])],
                        local: [a, b, c],
                    });
                }
            }
        }
        return out;
    }

    /** Facets facing the 4D camera (shader backface test). */
    visibleCells(rot4d, camW) {
        const vis = new Set();
        for (let axis = 0; axis < 8; axis++) {
            const n = mat4transform(AXES[axis], rot4d);
            const p = mat4transform([
                AXES[axis][0] * HALF,
                AXES[axis][1] * HALF,
                AXES[axis][2] * HALF,
                AXES[axis][3] * HALF,
            ], rot4d);
            const ray = [p[0], p[1], p[2], p[3] - camW];
            const dot = n[0] * ray[0] + n[1] * ray[1] + n[2] * ray[2] + n[3] * ray[3];
            if (dot > 0) vis.add(axis);
        }
        return vis;
    }

    /** @returns {Array<{faceIdx:number,sliceMask:number,direction:1|-1,plane:number}>} */
    scramble(n = 30) {
        const history = [];
        for (let i = 0; i < n; i++) {
            const face = (Math.random() * 8) | 0;
            const layer = (Math.random() * N) | 0;
            const plane = (Math.random() * 3) | 0;
            const direction = Math.random() < 0.5 ? 1 : -1;
            this.applyTwist(face, 1 << layer, direction, false, plane);
            history.push({ faceIdx: face, sliceMask: 1 << layer, direction, plane });
        }
        return history;
    }

    reset() {
        this.twistAnim = null;
        this.slots = buildSlots();
    }

    isSolved() {
        return this.slots.every(s => {
            for (let axis = 0; axis < 8; axis++) {
                if (s.faceColors[axis] >= 0 && s.faceColors[axis] !== axis) return false;
            }
            return true;
        });
    }
}

/** Facet indices 0..7 where this slot lies on the outer shell. */
export function facetsForSlot(slot) {
    const g = [slot.ix, slot.iy, slot.iz, slot.iw];
    const out = [];
    for (let ci = 0; ci < 8; ci++) {
        const dim = ci >> 1;
        const outer = (ci & 1) === 0 ? N - 1 : 0;
        if (g[dim] === outer) out.push(ci);
    }
    return out;
}

export function slotKey(slot) {
    return slot.ix | (slot.iy << 2) | (slot.iz << 4) | (slot.iw << 6);
}

/** Deep copy for solver search (no animation state). */
export function cloneSlots(slots) {
    return slots.map(s => ({
        ix: s.ix,
        iy: s.iy,
        iz: s.iz,
        iw: s.iw,
        faceColors: new Int8Array(s.faceColors),
    }));
}

export function clonePuzzle(puzzle) {
    const p = new Hyperpuzzle();
    p.slots = cloneSlots(puzzle.slots);
    p.rot4d = puzzle.rot4d;
    return p;
}

export { CELLS, slotIndex, rotGrid, rotateFaceColors };
