// Beginner-method macros (3⁴ algorithms sheet sequences).

import { parseMacroSequence } from './notation.js';
import { applyMovesToSlots, invertMoves } from './moves.js';

function seq(s) {
    return parseMacroSequence(s);
}

function inv(moves) {
    return invertMoves(moves);
}

// —— Three-color series ——
export const THREE_C1 = seq("TU' LU' TU RU TU' LU TU RU'");
export const THREE_C2 = seq("TFLD' LFKD' TFLD RFTD TFLD' LFKD TFLD RFTD'");
export const THREE_C3 = seq("TFL' LFK' TFL RFT TFL' LFK TFL RFT'");
export const THREE_C_SPECIAL = seq("TFL' LFT' TFL RFT TFL' LFT TFL RFT'");

// —— Four-color series (composed) ——
export const FOUR_C1 = [
    ...THREE_C1,
    ...seq("UK'"),
    ...inv(THREE_C1),
    ...seq('UK'),
];

export const FOUR_C2 = [
    ...THREE_C3,
    ...seq("TFRD'"),
    ...THREE_C3,
    ...seq('TFRD'),
    ...inv(THREE_C3),
    ...seq("TFRD'"),
    ...inv(THREE_C3),
    ...seq('TFRD'),
];

export const FOUR_C_SPECIAL = [
    ...THREE_C3,
    ...seq("UK'"),
    ...inv(THREE_C3),
    ...seq('UK'),
];

// —— 2-color OLL (4D) ——
export const OLL_F_R = seq("FU RU TU RU' TU' FU'");
export const OLL_F_U = seq("FU TU RU TU' RU' FU'");
export const OLL_LINE = seq("FU TU RU TU' RU' FU' TU'");
export const OLL_CROSS = seq("FU TU RU TU' RU' FU' FU RU TU RU' TU' FU'");

// —— 2-color PLL ——
export const U_PERM_CCW = seq("RU TU' RU TU RU TU RU TU' RU' TU' RU2");
export const U_PERM_CW = seq("RU2 TU RU TU RU' TU' RU' TU' RU'");
export const H_PERM = seq('TU2');
export const SUNE = seq("RU TU RU' TU RU TU2 RU'");

/** M2 U M2 U M' U2 M2 U2 M' U2 with M→2+RU */
export const M_SLICE_PLL = seq(
    "2+RU2 TU 2+RU2 TU 2+RU' TU2 2+RU2 TU2 2+RU' TU2",
);

export const ALL_MACROS = {
    THREE_C1,
    THREE_C2,
    THREE_C3,
    THREE_C_SPECIAL,
    FOUR_C1,
    FOUR_C2,
    FOUR_C_SPECIAL,
    OLL_F_R,
    OLL_F_U,
    OLL_LINE,
    OLL_CROSS,
    U_PERM_CCW,
    U_PERM_CW,
    H_PERM,
    SUNE,
    M_SLICE_PLL,
};

/** Human-readable phase blurbs for the solve log. */
export const PHASE_DESCRIPTIONS = {
    '3c-perm': 'Place 3-color cubies (permutation)',
    '3c-orient': 'Orient 3-color cubies',
    '4c-perm': 'Place 4-color cubies',
    '4c-orient': 'Orient 4-color cubies',
    '2c-orient': 'Orient 2-color faces (OLL-style)',
    '2c-perm': 'Permute 2-color faces (PLL-style)',
};

/** Phase-ordered macro groups for greedy / BFS search. */
export const PHASE_MACROS = [
    { name: '3c-perm', goal: '3c-pos', macros: [THREE_C1, THREE_C2] },
    { name: '3c-orient', goal: '3c-full', macros: [THREE_C3, THREE_C_SPECIAL] },
    { name: '4c-perm', goal: '4c-pos', macros: [FOUR_C1] },
    { name: '4c-orient', goal: '4c-full', macros: [FOUR_C2, FOUR_C_SPECIAL] },
    { name: '2c-orient', goal: '2c-oll', macros: [OLL_F_R, OLL_F_U, OLL_LINE, OLL_CROSS] },
    { name: '2c-perm', goal: 'solved', macros: [U_PERM_CCW, U_PERM_CW, H_PERM, SUNE, M_SLICE_PLL] },
];

export function applyMacroToSlots(slots, macro) {
    return applyMovesToSlots(slots, macro);
}
