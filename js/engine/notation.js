// MC4D sticker notation → atomic moves (HSC axis indices 0–7).

import { move } from './moves.js';

/** MC4D cell letter → our face axis (R L U D F B O I). */
export const STICKER_FACE_LETTER = {
    R: 0, L: 1, U: 2, D: 3, F: 4, B: 5, T: 6, K: 7,
};

const LETTERS = 'RLUDFBTK';

export function faceFromLetter(ch) {
    const f = STICKER_FACE_LETTER[ch];
    if (f === undefined) throw new Error(`Unknown face letter: ${ch}`);
    return f;
}

/** Plane on `face` that rotates the in-face axes of both partner faces. */
export function planeForPartners(face, partnerFaces) {
    const dimN = face >> 1;
    const need = new Set(partnerFaces.map(f => f >> 1));
    const inDims = [0, 1, 2, 3].filter(d => d !== dimN);
    const planes = [[0, 1], [0, 2], [1, 2]];
    for (let p = 0; p < 3; p++) {
        const [bi, ci] = planes[p];
        if (need.has(inDims[bi]) && need.has(inDims[ci])) return p;
    }
    const dimP = partnerFaces[0] >> 1;
    for (let p = 0; p < 3; p++) {
        const [bi, ci] = planes[p];
        if (inDims[bi] === dimP || inDims[ci] === dimP) return p;
    }
    return 0;
}

/**
 * Sticker move: twist on first cell, layer/plane from piece type.
 * MC4D: left-click = CCW = dir +1 in our UI.
 */
export function stickerMove(token) {
    let rest = token.trim();
    let layer = 0;
    const sliceM = rest.match(/^(\d+)\+/);
    if (sliceM) {
        layer = Math.min(2, Math.max(0, parseInt(sliceM[1], 10) - 1));
        rest = rest.slice(sliceM[0].length);
    }

    let dir = 1;
    if (rest.endsWith('2')) {
        const base = rest.slice(0, -1);
        return [
            stickerMove(base),
            stickerMove(base),
        ];
    }
    if (rest.endsWith("'") || rest.endsWith('′')) {
        dir = -1;
        rest = rest.slice(0, -1);
    }

    if (rest.length < 2) throw new Error(`Bad move token: ${token}`);

    const face0 = faceFromLetter(rest[0]);
    const partners = [...rest.slice(1)].map(c => faceFromLetter(c));
    const plane = planeForPartners(face0, partners);
  return [move(face0, layer, plane, dir)];
}

/** Parse "TU' LU RU2" into atomic moves. */
export function parseMacroSequence(seq) {
    const tokens = seq.trim().split(/\s+/).filter(Boolean);
    const out = [];
    for (const tok of tokens) {
        out.push(...stickerMove(tok));
    }
    return out;
}

/** HSC keyboard name from I vantage: IR, IU, IF, … */
export function hscMove(name, layer = 0, dir = 1) {
    const face = faceFromLetter(name[0]);
    const plane = planeForPartners(face, [...name.slice(1)].map(c => faceFromLetter(c)));
    return move(face, layer, plane, dir);
}

/** Human-readable labels for solve log (matches Twist Layer UI). */
const FACE_LABELS = ['Right', 'Left', 'Up', 'Down', 'Front', 'Back', 'Out (+W)', 'In (−W)'];
const LAYER_LABELS = ['outer', 'middle', 'inner'];
const PLANE_LABELS = ['plane A (shallow)', 'plane B (wide)', 'plane C (deep)'];

/**
 * Verbose twist label for the solve log, e.g.
 * `Back · outer · plane B (wide) · CCW`.
 * (Older compact form was `B0b'`: face letter, layer index, plane letter, prime.)
 */
export function formatMove(m) {
    const face = m.face ?? m.faceIdx;
    const layer = Math.log2(m.sliceMask) | 0;
    const plane = m.plane ?? 0;
    const dir = (m.dir ?? m.direction) > 0 ? 'CCW' : 'CW';
    return `${FACE_LABELS[face]} · ${LAYER_LABELS[layer]} · ${PLANE_LABELS[plane]} · ${dir}`;
}

/** Format a recorded twist from scramble / undo history. */
export function formatHistoryMove(h) {
    return formatMove({
        faceIdx: h.faceIdx,
        sliceMask: h.sliceMask,
        plane: h.plane ?? 0,
        direction: h.direction,
    });
}
