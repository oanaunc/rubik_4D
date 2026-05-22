// 4D Hypercube {4,3,3} — Hyperspeedcube surface geometry
//
// Each 4D cell has 27 outward stickers (3×3×3 on its hyperplane).
// Cell rims at oblique view come from neighboring cells' outward shells.
// Total 216 surface stickers (8 × 27).

import {
    mat4transform, mat4identity, mat4mul, mat4rotPlane, mat4orthogonalize, vec4dot,
    globalScale, HSC,
} from './math4d.js?v=21';

const GS = globalScale();
function scale4(v) {
    return [v[0]*GS, v[1]*GS, v[2]*GS, v[3]*GS];
}

export const FACE_COLORS = [
    '#cc3333', '#ff9922', '#ffffff', '#ffff00',
    '#88ee66', '#33aaff', '#ff66ff', '#8822cc',
];
export const FACE_NAMES = ['+X R', '−X L', '+Y U', '−Y D', '+Z F', '−Z B', '+W O', '−W I'];

export const FACE_NORMALS = [
    [ 1, 0, 0, 0], [-1, 0, 0, 0],
    [ 0, 1, 0, 0], [ 0,-1, 0, 0],
    [ 0, 0, 1, 0], [ 0, 0,-1, 0],
    [ 0, 0, 0, 1], [ 0, 0, 0,-1],
];

const FACE_TANGENTS = [
    [[0,1,0,0],[0,0,1,0],[0,0,0,1]],
    [[0,1,0,0],[0,0,1,0],[0,0,0,1]],
    [[1,0,0,0],[0,0,1,0],[0,0,0,1]],
    [[1,0,0,0],[0,0,1,0],[0,0,0,1]],
    [[1,0,0,0],[0,1,0,0],[0,0,0,1]],
    [[1,0,0,0],[0,1,0,0],[0,0,0,1]],
    [[1,0,0,0],[0,1,0,0],[0,0,1,0]],
    [[1,0,0,0],[0,1,0,0],[0,0,1,0]],
];

export const ORDER = 3;
export const FACE_SHRINK    = HSC.FACET_SHRINK;
export const STICKER_SHRINK = HSC.STICKER_SHRINK;

const CUBE_HALF    = 1.0;
const STEP         = (2 * CUBE_HALF) / ORDER;
const STICKER_HALF = STEP / 2;
export const CUBIE_HALF = STICKER_HALF * STICKER_SHRINK;

const add4  = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2], a[3]+b[3]];
const mul4  = (v, s) => [v[0]*s, v[1]*s, v[2]*s, v[3]*s];
const lerp4 = (a, b, t) => add4(mul4(a, 1-t), mul4(b, t));

function shrinkQuad(naturalCorners, sfCenter, tileCenter) {
    const afterFace = naturalCorners.map(c => lerp4(c, sfCenter, 1 - FACE_SHRINK));
    const tc = lerp4(tileCenter, sfCenter, 1 - FACE_SHRINK);
    return afterFace.map(c => lerp4(c, tc, 1 - STICKER_SHRINK));
}

function pushSticker(stickers, data) {
    stickers.push({ ...data, id: stickers.length });
}

export function generateStickers() {
    const stickers = [];

    for (let faceIdx = 0; faceIdx < 8; faceIdx++) {
        const normal = FACE_NORMALS[faceIdx];
        const [t0, t1, t2] = FACE_TANGENTS[faceIdx];
        const cellCenter = mul4(normal, CUBE_HALF);

        // --- Outward hyperplane: 3×3×3 shell stickers (puzzle surface) ---
        for (let gi = 0; gi < ORDER; gi++) {
            for (let gj = 0; gj < ORDER; gj++) {
                for (let gk = 0; gk < ORDER; gk++) {
                    const cubieCenter = add4(cellCenter, add4(
                        mul4(t0, (gi - 1) * STEP),
                        add4(mul4(t1, (gj - 1) * STEP), mul4(t2, (gk - 1) * STEP)),
                    ));
                    const sfCenter = add4(cubieCenter, mul4(normal, CUBE_HALF));
                    const sh = STICKER_HALF;
                    const naturalCorners = [
                        add4(sfCenter, add4(mul4(t0, -sh), mul4(t1, -sh))),
                        add4(sfCenter, add4(mul4(t0,  sh), mul4(t1, -sh))),
                        add4(sfCenter, add4(mul4(t0,  sh), mul4(t1,  sh))),
                        add4(sfCenter, add4(mul4(t0, -sh), mul4(t1,  sh))),
                    ];
                        pushSticker(stickers, {
                            faceIdx,
                            gi, gj, gk,
                            currentColorIdx: faceIdx,
                            corners4d: shrinkQuad(naturalCorners, sfCenter, sfCenter),
                            center4d: [...sfCenter],
                            cubieCenter4d: [...cubieCenter],
                            surfaceNormal4d: [...normal],
                            cellNormal4d: [...normal],
                            tangents: [t0, t1, t2],
                        });
                }
            }
        }

    }
    return stickers;
}

/** Which 4D cells are drawn (HSC dot cull + facet-centered heuristic). */
export function visibleCells(rot4d, cameraW) {
    const vis = new Set();
    for (let faceIdx = 0; faceIdx < 8; faceIdx++) {
        const n = mat4transform(FACE_NORMALS[faceIdx], rot4d);
        const p = mat4transform(scale4(mul4(FACE_NORMALS[faceIdx], CUBE_HALF)), rot4d);
        const ray = [p[0], p[1], p[2], p[3] - cameraW];
        const dot = n[0]*ray[0] + n[1]*ray[1] + n[2]*ray[2] + n[3]*ray[3];
        if (dot > 0 || n[3] > -0.35) vis.add(faceIdx);
    }
    return vis;
}

export class Hypercube4D {
    constructor() {
        this.stickers = generateStickers();
        this.rot4d = mat4identity();
        this._orthoCounter = 0;
    }

    applyViewRotation(plane, angle) {
        const delta = mat4rotPlane(plane[0], plane[1], angle);
        this.rot4d = mat4mul(delta, this.rot4d);
        if (++this._orthoCounter >= 30) {
            this.rot4d = mat4orthogonalize(this.rot4d);
            this._orthoCounter = 0;
        }
    }

    applyTwist(faceIdx, sliceMask, direction) {
        const cellNormal = FACE_NORMALS[faceIdx];
        const [t1, t2] = FACE_TANGENTS[faceIdx];
        const axis1 = t1.findIndex(x => x !== 0);
        const axis2 = t2.findIndex(x => x !== 0);
        if (axis1 < 0 || axis2 < 0) return;

        const twistMat = mat4rotPlane(axis1, axis2, direction * Math.PI / 2);
        const eps = STEP * 0.15;

        const affected = this.stickers.filter(s => {
            const dot = vec4dot(s.center4d, cellNormal);
            const raw = (dot / CUBE_HALF + 1) / (2 / ORDER);
            const layer = ORDER - 1 - Math.round(Math.max(0, Math.min(ORDER - 1, raw)));
            return (sliceMask >> layer) & 1;
        });

        const moves = affected.map(s => ({
            src: s,
            newCenter: mat4transform(s.center4d, twistMat),
            newNormal: mat4transform(s.cellNormal4d, twistMat),
        }));

        const epsN = 0.5;
        for (const { src, newCenter, newNormal } of moves) {
            const dest = this.stickers.find(s =>
                Math.abs(s.center4d[0] - newCenter[0]) < eps &&
                Math.abs(s.center4d[1] - newCenter[1]) < eps &&
                Math.abs(s.center4d[2] - newCenter[2]) < eps &&
                Math.abs(s.center4d[3] - newCenter[3]) < eps &&
                Math.abs(s.cellNormal4d[0] - newNormal[0]) < epsN &&
                Math.abs(s.cellNormal4d[1] - newNormal[1]) < epsN &&
                Math.abs(s.cellNormal4d[2] - newNormal[2]) < epsN &&
                Math.abs(s.cellNormal4d[3] - newNormal[3]) < epsN
            );
            if (dest) dest.currentColorIdx = src.currentColorIdx;
        }
    }

    scramble(n = 25) {
        for (let i = 0; i < n; i++) {
            this.applyTwist(
                Math.floor(Math.random() * 8),
                1 << Math.floor(Math.random() * ORDER),
                Math.random() < 0.5 ? 1 : -1,
            );
        }
    }

    reset() {
        for (const s of this.stickers) s.currentColorIdx = s.faceIdx;
    }

    isSolved() {
        return this.stickers.every(s => s.currentColorIdx === s.faceIdx);
    }
}
