// Solver: reverse-scramble vs macro phases (+ search fallback).

import { cloneSlots } from './hyperpuzzle.js';
import {
    allAtomicMoves,
    applyMoveToSlots,
    applyMoves,
    applyMovesToSlots,
    invertMoves,
    move,
} from './moves.js';
import { PHASE_MACROS, PHASE_DESCRIPTIONS, applyMacroToSlots } from './macros.js';
import { formatMove } from './notation.js';
import {
    stateKey,
    stateKeySearch,
    isSolvedSlots,
    misplacedStickers,
    misplacedByType,
    is3cPositionSolved,
    heuristic,
    pieceType,
    isPieceAtHome,
} from './puzzle-state.js';
import { buildSolvedSlots } from './solved-state.js';

const MAX_VISITED = 120_000;

/** Scrambles this short (or fewer) try macro phases + blind search before scramble inverse. */
export const SHORT_SCRAMBLE_MAX = 12;

function emitLog(opts, type, message, detail = '') {
    opts.onLog?.({ type, message, detail });
}

function historyToMove(h) {
    return {
        face: h.faceIdx,
        sliceMask: h.sliceMask,
        plane: h.plane ?? 0,
        dir: /** @type {1|-1} */ (h.direction),
    };
}

/** Replay recorded twists from solved; compare to current position. */
export function positionMatchesHistory(slots, history) {
    if (!history?.length) return false;
    let s = buildSolvedSlots();
    for (const h of history) {
        s = applyMoveToSlots(s, historyToMove(h));
    }
    return stateKeySearch(s) === stateKeySearch(slots);
}

function verifySolution(slots, moves) {
    if (!moves?.length) return isSolvedSlots(slots);
    const end = applyMovesToSlots(slots, moves);
    return isSolvedSlots(end);
}

function is3cFullySolved(slots) {
    for (const s of slots) {
        if (pieceType(s) === '3c' && !isPieceAtHome(s)) return false;
    }
    return true;
}

function is4cPositionSolved(slots) {
    for (const s of slots) {
        if (pieceType(s) !== '4c') continue;
        const g = [s.ix, s.iy, s.iz, s.iw];
        const want = new Set();
        for (let axis = 0; axis < 8; axis++) {
            const d = axis >> 1;
            const outer = (axis & 1) === 0 ? 2 : 0;
            if (g[d] === outer) want.add(axis);
        }
        const have = new Set();
        for (let axis = 0; axis < 8; axis++) {
            if (s.faceColors[axis] >= 0) have.add(s.faceColors[axis]);
        }
        for (const a of want) if (!have.has(a)) return false;
    }
    return true;
}

function is4cFullySolved(slots) {
    for (const s of slots) {
        if (pieceType(s) === '4c' && !isPieceAtHome(s)) return false;
    }
    return true;
}

function is2cOriented(slots) {
    for (const s of slots) {
        if (pieceType(s) !== '2c') continue;
        const g = [s.ix, s.iy, s.iz, s.iw];
        for (let axis = 0; axis < 8; axis++) {
            const d = axis >> 1;
            const outer = (axis & 1) === 0 ? 2 : 0;
            if (g[d] === outer && s.faceColors[axis] !== axis) return false;
        }
    }
    return true;
}

function phaseMet(slots, goal) {
    switch (goal) {
        case '3c-pos': return is3cPositionSolved(slots);
        case '3c-full': return is3cFullySolved(slots);
        case '4c-pos': return is4cPositionSolved(slots);
        case '4c-full': return is4cFullySolved(slots);
        case '2c-oll': return is2cOriented(slots);
        case 'solved': return isSolvedSlots(slots);
        default: return isSolvedSlots(slots);
    }
}

function phaseMetric(slots, goal) {
    const m = misplacedByType(slots);
    switch (goal) {
        case '3c-pos': return m.c3 + m.c4 * 10;
        case '3c-full': return m.c3 + m.c4 * 10;
        case '4c-pos': return m.c4 + m.c3;
        case '4c-full': return m.c4;
        case '2c-oll': return m.c2 + m.c3 + m.c4;
        default: return misplacedStickers(slots);
    }
}

function applySequence(slots, seq) {
    return applyMovesToSlots(slots, seq);
}

/** Short setups g / g' for conjugating macros (outer layer). */
function conjugateSetups() {
    const setups = [[]];
    for (let face = 0; face < 8; face++) {
        for (const plane of [0, 1]) {
            setups.push([move(face, 0, plane, 1)]);
            setups.push([move(face, 0, plane, -1)]);
        }
    }
    return setups;
}

const SETUPS = conjugateSetups();

function macroVariants(macroList, light = false) {
    const out = [];
    for (const macro of macroList) {
        out.push(macro);
        out.push(invertMoves(macro));
        if (light) continue;
        for (const setup of SETUPS) {
            if (!setup.length) continue;
            out.push([...setup, ...macro, ...invertMoves(setup)]);
        }
    }
    return out;
}

/** BFS in macro space for one phase. */
function bfsPhaseMacros(slots, goal, macroList, maxMacroDepth = 5, light = false) {
    if (phaseMet(slots, goal)) return [];
    const variants = macroVariants(macroList, light);
    const startK = stateKey(slots);
    const q = [{ slots, macros: [] }];
    const seen = new Set([startK]);

    while (q.length) {
        const { slots: cur, macros: path } = q.shift();
        if (path.length >= maxMacroDepth) continue;

        for (const variant of variants) {
            const next = applySequence(cur, variant);
            const k = stateKey(next);
            if (seen.has(k)) continue;
            seen.add(k);
            const path2 = path.concat([variant]);
            if (phaseMet(next, goal)) return path2.flat();
            q.push({ slots: next, macros: path2 });
        }
    }
    return null;
}

/** Greedy macro search with conjugates. */
function greedyPhaseMacros(slots, goal, macroList, maxSteps = 120, light = false) {
    const variants = macroVariants(macroList, light);
    const path = [];
    let cur = cloneSlots(slots);

    for (let step = 0; step < maxSteps; step++) {
        if (phaseMet(cur, goal)) return path;
        const base = phaseMetric(cur, goal);
        let best = null;

        for (const variant of variants) {
            const next = applySequence(cur, variant);
            const score = phaseMetric(next, goal);
            if (score < base && (!best || score < best.score)) {
                best = { next, variant, score };
            }
        }
        if (!best) break;
        cur = best.next;
        path.push(best.variant);
    }
    return phaseMet(cur, goal) ? path.flat() : null;
}

function runPhase(slots, phase, light = false) {
    if (phaseMet(slots, phase.goal)) return [];
    const bfsDepth = light ? 2 : 5;
    const greedySteps = light ? 25 : 120;
    let moves = bfsPhaseMacros(slots, phase.goal, phase.macros, bfsDepth, light);
    if (moves && verifySolution(slots, moves)) return moves;
    moves = greedyPhaseMacros(slots, phase.goal, phase.macros, greedySteps, light);
    if (moves && verifySolution(slots, moves)) return moves;
    return null;
}

function meetPath(front, back, k) {
    return front.get(k).moves.concat(invertMoves(back.get(k).moves));
}

function tryMeet(slots, front, back, k) {
    if (!front.has(k) || !back.has(k)) return null;
    const f = front.get(k);
    const b = back.get(k);
    if (stateKeySearch(f.slots) !== stateKeySearch(b.slots)) return null;
    const path = meetPath(front, back, k);
    return verifySolution(slots, path) ? path : null;
}

function expandLayer(frontier, moves, seen, maxNew = 200_000) {
    const next = new Map();
    let added = 0;
    for (const [, node] of frontier) {
        for (const m of moves) {
            const s2 = applyMoveToSlots(node.slots, m);
            const k2 = stateKey(s2);
            if (seen.has(k2)) continue;
            seen.add(k2);
            next.set(k2, { slots: s2, moves: node.moves.concat(m) });
            if (++added >= maxNew) return next;
        }
    }
    return next;
}

function bidirectionalSearch(slots, maxDepth = 9) {
    if (isSolvedSlots(slots)) return [];
    const moves = allAtomicMoves();
    const solved = buildSolvedSlots();
    const startK = stateKey(slots);
    const goalK = stateKey(solved);

    const seenF = new Set([startK]);
    const seenB = new Set([goalK]);
    let front = new Map([[startK, { slots, moves: [] }]]);
    let back = new Map([[goalK, { slots: solved, moves: [] }]]);

    for (let d = 0; d <= maxDepth; d++) {
        for (const [k] of front) {
            const path = tryMeet(slots, front, back, k);
            if (path) return path;
        }
        if (d === maxDepth) break;
        const cap = Math.floor(MAX_VISITED / (d + 2));
        if (front.size <= back.size) {
            front = expandLayer(front, moves, seenF, cap);
            for (const [k] of front) {
                const path = tryMeet(slots, front, back, k);
                if (path) return path;
            }
        } else {
            back = expandLayer(back, moves, seenB, cap);
            for (const [k] of back) {
                const path = tryMeet(slots, front, back, k);
                if (path) return path;
            }
        }
    }
    return null;
}

function beamSearch(slots, maxDepth = 20, beamWidth = 120) {
    if (isSolvedSlots(slots)) return [];
    const moves = allAtomicMoves();
    const seen = new Set([stateKey(slots)]);
    let frontier = [{ slots, path: [], h: heuristic(slots) }];

    for (let depth = 0; depth < maxDepth; depth++) {
        const next = [];
        for (const node of frontier) {
            if (isSolvedSlots(node.slots)) return node.path;
            for (const m of moves) {
                const s2 = applyMoveToSlots(node.slots, m);
                const k = stateKey(s2);
                if (seen.has(k)) continue;
                if (seen.size > 80_000) break;
                seen.add(k);
                next.push({ slots: s2, path: node.path.concat(m), h: heuristic(s2) });
            }
        }
        next.sort((a, b) => a.h - b.h);
        const bestH = next[0]?.h ?? Infinity;
        frontier = next.filter(n => n.h <= bestH + 6).slice(0, beamWidth);
        if (!frontier.length) break;
    }
    return null;
}

function idaStar(slots, maxBound = 160) {
    const moves = allAtomicMoves();

    function search(cur, g, bound, path) {
        const h = misplacedStickers(cur);
        const f = g + h;
        if (f > bound) return f;
        if (h === 0) return -1;

        let min = Infinity;
        const ordered = moves
            .map(m => {
                const next = applyMoveToSlots(cur, m);
                return { m, next, h: misplacedStickers(next) };
            })
            .sort((a, b) => a.h - b.h);

        for (const { m, next } of ordered) {
            path.push(m);
            const r = search(next, g + 1, bound, path);
            if (r === -1) return -1;
            if (r < min) min = r;
            path.pop();
        }
        return min;
    }

    let bound = misplacedStickers(slots);
    while (bound <= maxBound) {
        const path = [];
        const r = search(cloneSlots(slots), 0, bound, path);
        if (r === -1) return path;
        bound = r;
    }
    return null;
}

/** Undo recorded twists (not a blind solve). */
export function solveByReversing(history) {
    if (!history?.length) return null;
    return invertMoves([...history].map(historyToMove));
}

/**
 * Beginner macro phases + search. Does not use scramble history.
 * @param {import('./hyperpuzzle.js').Hyperpuzzle} puzzle
 */
export function solveByAlgorithm(puzzle, opts = {}) {
    const onProgress = opts.onProgress || (() => {});
    const startSlots = cloneSlots(puzzle.slots);
    let slots = cloneSlots(startSlots);
    const allMoves = [];
    const phaseLog = [];
    const history = opts.scrambleHistory ?? null;
    const historyOk = history?.length && positionMatchesHistory(startSlots, history);
    const scrambleLen = history?.length ?? 0;
    const shortScramble = scrambleLen > 0 && scrambleLen <= (opts.shortScrambleMax ?? SHORT_SCRAMBLE_MAX);
    const preferInverse = historyOk && !shortScramble && opts.preferInverse !== false;
    const tryHeavySearch = !shortScramble && !historyOk;

    if (isSolvedSlots(slots)) {
        return { ok: true, moves: [], phases: [], method: 'solved' };
    }

    if (historyOk) {
        emitLog(opts, 'info', 'Recorded scramble', `${history.length} twists built this position`);
        if (shortScramble) {
            emitLog(opts, 'info', 'Short scramble mode', 'Macro phases (light) then scramble inverse — blind 4D search is too heavy in-browser');
        }
    } else if (history?.length) {
        emitLog(opts, 'info', 'Scramble history mismatch', 'Extra manual moves — blind solve only');
    }

    const runMacroPhases = opts.tryMacroPhases === true
        || (opts.tryMacroPhases !== false && (!historyOk || shortScramble));

    if (preferInverse && !runMacroPhases) {
        emitLog(opts, 'info', 'Long scramble', 'Using inverse of recorded twists (fast)');
        const inv = solveByReversing(history);
        if (inv?.length && verifySolution(startSlots, inv)) {
            return { ok: true, moves: inv, phases: phaseLog, method: 'scramble-solution' };
        }
    }

    if (runMacroPhases) {
        emitLog(opts, 'info', 'Macro phases (beginner)', 'Sheet sequences — not full case recognition');
    }

    for (const phase of runMacroPhases ? PHASE_MACROS : []) {
        const desc = PHASE_DESCRIPTIONS[phase.name] ?? phase.goal;
        onProgress(`Method: ${phase.name}…`);
        emitLog(opts, 'phase', `Phase: ${phase.name}`, desc);

        if (phaseMet(slots, phase.goal)) {
            phaseLog.push({ name: phase.name, skipped: true });
            emitLog(opts, 'done', '  Already satisfied', 'Skipping this phase');
            continue;
        }

        emitLog(opts, 'info', '  Planning macros', 'BFS in macro space (depth 5), then greedy with setups');
        const phaseMoves = runPhase(slots, phase, shortScramble);
        if (!phaseMoves) {
            phaseLog.push({ name: phase.name, failed: true });
            onProgress(`Phase ${phase.name} stuck — searching…`);
            emitLog(opts, 'error', '  Phase stuck', 'Falling back to atomic search');
            break;
        }

        slots = applyMovesToSlots(slots, phaseMoves);
        allMoves.push(...phaseMoves);
        phaseLog.push({ name: phase.name, ok: true, length: phaseMoves.length });
        emitLog(opts, 'done', `  Phase complete`, `${phaseMoves.length} atomic twists planned`);

        if (isSolvedSlots(slots)) {
            if (!opts.dryRun) applyMoves(puzzle, allMoves, false);
            emitLog(opts, 'info', 'Solved after phases', `${allMoves.length} total moves`);
            return { ok: true, moves: allMoves, phases: phaseLog, method: 'macros' };
        }
    }

    if (!isSolvedSlots(slots) && tryHeavySearch) {
        onProgress('Finishing: bidirectional search…');
        emitLog(opts, 'search', 'Bidirectional search', 'Meet-in-the-middle (depth ≤12)');
        const finish = bidirectionalSearch(slots, 12);
        if (finish) {
            allMoves.push(...finish);
            slots = applyMovesToSlots(slots, finish);
            emitLog(opts, 'done', '  Search succeeded', `${finish.length} finishing moves`);
        } else {
            emitLog(opts, 'info', '  No meet found', 'Trying beam search');
        }
    }

    if (!isSolvedSlots(slots) && tryHeavySearch) {
        onProgress('Finishing: beam search…');
        emitLog(opts, 'search', 'Beam search', 'Heuristic beam, depth ≤20');
        const beam = beamSearch(slots, 20, 120);
        if (beam) {
            allMoves.push(...beam);
            slots = applyMovesToSlots(slots, beam);
            emitLog(opts, 'done', '  Beam succeeded', `${beam.length} finishing moves`);
        } else {
            emitLog(opts, 'info', '  Beam exhausted', 'Trying IDA*');
        }
    }

    if (!isSolvedSlots(slots) && tryHeavySearch) {
        onProgress('Finishing: IDA*…');
        emitLog(opts, 'search', 'IDA* search', 'Iterative deepening, bound ≤160');
        const ida = idaStar(slots, 160);
        if (ida) {
            allMoves.push(...ida);
            slots = applyMovesToSlots(slots, ida);
            emitLog(opts, 'done', '  IDA* succeeded', `${ida.length} finishing moves`);
        } else {
            emitLog(opts, 'error', '  IDA* gave up', 'Position may be too hard for this solver');
        }
    }

    if (!isSolvedSlots(slots) && historyOk) {
        onProgress('Blind solve stuck — using scramble inverse…');
        const inv = solveByReversing(history);
        if (inv?.length && verifySolution(startSlots, inv)) {
            emitLog(opts, 'done', 'Scramble inverse (fallback)', `${history.length} recorded twists`);
            return {
                ok: true,
                moves: inv,
                phases: phaseLog,
                method: 'scramble-solution',
            };
        }
        emitLog(opts, 'error', 'Scramble inverse failed', 'History does not match the cube');
    }

    const planned = applyMovesToSlots(cloneSlots(startSlots), allMoves);
    if (isSolvedSlots(planned)) {
        if (!opts.dryRun) applyMoves(puzzle, allMoves, false);
        emitLog(opts, 'info', 'Plan complete', `${allMoves.length} moves ready to execute`);
        return {
            ok: true,
            moves: allMoves,
            phases: phaseLog,
            method: phaseLog.some(p => p.ok) ? 'macros+search' : 'search',
        };
    }

    emitLog(opts, 'error', 'Solve failed', historyOk
        ? 'Macro phases and search could not finish; try Solve.'
        : 'No matching scramble history — scramble in-app or use Solve.');
    return {
        ok: false,
        moves: allMoves,
        phases: phaseLog,
        error: historyOk
            ? 'Could not solve this position. Try Solve.'
            : 'Blind solve failed. Scramble with the Scramble button, then use Solve.',
    };
}

export async function playMovesAnimated(puzzle, moves, opts = {}) {
    const delay = opts.delayMs ?? 25;
    const total = moves.length;
    for (let i = 0; i < total; i++) {
        const m = moves[i];
        const step = {
            index: i,
            total,
            move: m,
            label: formatMove(m),
        };
        opts.onStep?.(step);
        puzzle.applyTwist(m.face, m.sliceMask, m.dir, true, m.plane);
        await new Promise(r => setTimeout(r, delay));
        while (puzzle.twistAnim) {
            puzzle.tickAnim(performance.now());
            await new Promise(r => requestAnimationFrame(r));
        }
    }
    opts.onComplete?.();
}
