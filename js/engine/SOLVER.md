# 3×3×3×3 solver

## UI

| Button | What it does |
|--------|----------------|
| **Solve** | Reverses the recorded scramble twists (fast, reliable for in-app scrambles). |

## Internal method solve (`solveByAlgorithm`)

Used by tests and optional programmatic calls — not exposed in the UI.

1. **Macro phases** — `macros.js` sequences from the 3⁴ algorithms sheet; BFS/greedy per phase with conjugation setups.
2. **Bidirectional search** — If a phase stalls.
3. **Beam search** — Heuristic on misplaced stickers.
4. **IDA\*** — Last resort.
5. **Scramble inverse** — Fallback when history matches the cube.

## Notation

Sticker macros use letters `R L U D F B T K` → axes `0–7` (`T` = +W, `K` = −W). Parsed in `notation.js` (`parseMacroSequence`), sequences in `macros.js`.

## Limits

Arbitrary positions **not** reached through the app may need long search or fail (state space is huge). Use **Scramble** then **Solve** for reliable demos; manual play is tracked in `moveHistory`.

Future: optional `usePhases` tuning, NdSolve port, or Web Worker search.
