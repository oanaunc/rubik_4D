import { Hyperpuzzle, cloneSlots } from './hyperpuzzle.js';
import { applyMoves, applyMovesToSlots, move } from './moves.js';
import { parseMacroSequence, formatMove } from './notation.js';
import { THREE_C1 } from './macros.js';
import { isSolvedSlots } from './puzzle-state.js';
import { solveByReversing, solveByAlgorithm } from './solver.js';

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

// Twist inverse
const p = new Hyperpuzzle();
p.applyTwist(7, 2, 1, false, 1);
p.applyTwist(7, 2, -1, false, 1);
assert(p.isSolved(), 'twist inverse');

// Macro notation parse
const m = parseMacroSequence("RU' TU");
assert(m.length >= 2, 'parse sequence');

// Verbose solve-log labels
assert(
    formatMove({ face: 5, sliceMask: 1, plane: 1, dir: -1 }).includes('Back'),
    'formatMove verbose',
);
assert(formatMove({ face: 0, sliceMask: 1, plane: 0, dir: 1 }).endsWith('CCW'), 'dir +1 = CCW');

// Macro length
assert(THREE_C1.length > 0, '3c1 macro');

// History inverse (scramble track)
const q = new Hyperpuzzle();
const hist = [];
for (let i = 0; i < 12; i++) {
    const face = (i * 2) % 8;
    const plane = i % 3;
    q.applyTwist(face, 2, 1, false, plane);
    hist.push({ faceIdx: face, sliceMask: 2, direction: 1, plane });
}
const inv = solveByReversing(hist);
assert(inv?.length === hist.length);
for (const m of inv) q.applyTwist(m.face, m.sliceMask, m.dir, false, m.plane);
assert(q.isSolved(), 'reverse solve');
console.log('reverse solve moves', inv.length);

// 30-move app scramble → fast inverse path
const heavy = new Hyperpuzzle();
const scrambleHist = heavy.scramble(30);
const r30 = solveByAlgorithm(heavy, { dryRun: true, scrambleHistory: scrambleHist });
assert(r30.ok, '30-move scramble solve');
assert(r30.method === 'scramble-solution', 'uses scramble inverse');
assert(r30.moves.length === 30, '30 inverse moves');
const after = applyMovesToSlots(cloneSlots(heavy.slots), r30.moves);
assert(isSolvedSlots(after), '30-move verify on scrambled state');

// 5-move short scramble — macro attempt then inverse fallback
const light = new Hyperpuzzle();
const lightHist = light.scramble(5);
const r5 = solveByAlgorithm(light, { dryRun: true, scrambleHistory: lightHist });
assert(r5.ok, '5-move scramble solve');
assert(r5.method === 'scramble-solution', '5-move uses inverse fallback');
const after5 = applyMovesToSlots(cloneSlots(light.slots), r5.moves);
assert(isSolvedSlots(after5), '5-move verify');

console.log('solver.test.js OK');
