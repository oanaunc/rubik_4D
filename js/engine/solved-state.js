import { ORDER } from './hyperpuzzle.js';

const N = ORDER;

/** Solved slot array (shared by solver). */
export function buildSolvedSlots() {
    const slots = [];
    for (let iw = 0; iw < N; iw++) {
        for (let iz = 0; iz < N; iz++) {
            for (let iy = 0; iy < N; iy++) {
                for (let ix = 0; ix < N; ix++) {
                    const faceColors = new Int8Array(8).fill(-1);
                    for (let axis = 0; axis < 8; axis++) {
                        const d = axis >> 1;
                        const outer = (axis & 1) === 0 ? N - 1 : 0;
                        if ([ix, iy, iz, iw][d] === outer) faceColors[axis] = axis;
                    }
                    slots.push({ ix, iy, iz, iw, faceColors });
                }
            }
        }
    }
    return slots;
}
