# Paper code — Structural State-Depth Calibration in the 4D Rubik's Cube

Reproducible code for the IEEE Transactions on Games submission *"Structural
State-Depth Calibration in the Four-Dimensional Rubik's Cube: Exact Distances,
Scramble Bias, and Move Metrics."*

Everything here is plain CPython; the only heavy dependency is `sympy` (used once to
build the move permutations). The web simulator in the repository root is the game
environment shown in Fig. 1; this folder is the measurement-and-calibration pipeline.

## Requirements

```bash
pip install sympy matplotlib numpy pillow
```

Tested on CPython 3.10, SymPy 1.14, on a 4-core x86-64 machine with 3.8 GB RAM
(Ubuntu 22.04). The radius-4 ball builds in ≈3 s using under 0.4 GB.

## Quick check (a few minutes)

```bash
python3 spheres.py            # sphere sizes, 3x3x3 validation, diameter bounds
python3 certify.py --quick    # scramble bias (small samples)
python3 free_reduction.py     # exact free-reduction decomposition + cube corroboration
python3 htm_scramble.py --quick
python3 generator.py --quick  # accuracy, diversity, latency
python3 figures.py            # regenerate figures/ from results/
python3 group_order.py        # write the exact 121-digit |G|
```

Drop `--quick` (and add `--deep` to `spheres.py`) to reproduce the paper's full
sample sizes and the fingerprinted N₅ / HTM N₄ counts; that takes longer and, for
the deep shells, more memory.

## What reproduces what

| Paper item | Script | Output |
|---|---|---|
| Table I — group-order orbit factors | `group_order.py` | `results/group_order.txt` (exact 121-digit \|G\|) |
| Table II — 3×3×3 validation (OEIS A080602/A080601) | `spheres.py` | `results/spheres.json` |
| Table III — QTM sphere sizes N₀–N₅ | `spheres.py` (`--deep` for N₅) | `results/spheres.json` |
| Table IV — i.i.d. scramble length vs exact depth | `certify.py` | `results/scramble.json` |
| Table V — free-reduction / relation decomposition | `free_reduction.py` | `results/decomposition.json` |
| Table VI — scramble-model comparison (iid/NII/NSF) | `certify.py` | `results/scramble.json` |
| Table VII — QTM vs HTM + diameter lower bounds | `spheres.py` | `results/spheres.json` |
| Table VIII — HTM sphere sizes N₀–N₄ | `spheres.py` (`--deep` for N₄) | `results/spheres.json` |
| Table IX — HTM i.i.d. scramble bias | `htm_scramble.py` | `results/htm_scramble.json` |
| Table X — per-target generator accuracy | `generator.py` | `results/generator.json` |
| Table XI — policy ablation (iid/NII/NSF) | `generator.py` | `results/generator.json` |
| Table XII — per-instance certification latency | `generator.py` | `results/generator.json` |
| Sec VI-B — generator diversity (depth-7 NII) | `generator.py` | `results/generator.json` |
| Fig. 1 — solved vs. scrambled cube | `make_fig1.py` | `figures/fig1_pair.png` |
| Fig. 2 — branching ratios | `figures.py` | `figures/fig2_branching.png` |
| Fig. 3 — Proposition 2 schematic | `figures.py` | `figures/fig_prop2.png` |
| Fig. 4 — E[d\|L] vs first-order law | `figures.py` | `figures/fig3_scramble.png` |
| Fig. 5 — exact depth distribution | `figures.py` | `figures/fig4_distribution.png` |
| Fig. 6 — scramble efficiency by policy | `figures.py` | `figures/fig5_scramblers.png` |

## Files

```
model_4d.py        3^4 sticker/piece model, 48 QTM generators, byte move-tables
model_3d.py        ordinary 3x3x3 model (validation + bias corroboration)
group_order.py     exact |G| (Table I); writes results/group_order.txt
spheres.py         QTM/HTM enumeration, 3x3x3 validation, diameter bounds (Tables II,III,VII,VIII; Fig.2)
certify.py         Propositions 2/3 certified-ball distances; scramble bias (Tables IV,VI; Figs 4-6)
free_reduction.py  exact reduced-length recurrence + deficit decomposition (Table V; cube corroboration)
htm_scramble.py    HTM i.i.d. scramble bias via Proposition 3 (Table IX)
generator.py       depth-targeted generator: accuracy, ablation, diversity, latency (Tables X-XII)
figures.py         regenerate Figs 2-6 + Prop-2 schematic from results/
make_fig1.py        assemble the solved|scrambled Fig.1 from two simulator screenshots
results/           generated JSON/CSV outputs and the exact 121-digit |G|
figures/           generated figures used in the paper
```

## Method notes

- **Certified ball.** `certify.py` builds the radius-4 ball `B₄` (2 747 925 states)
  by full 216-byte-key deduplication, then keeps it as a 64-bit-hash → depth dict
  for O(1) distance lookups (the cardinalities are exact independent of hashing).
- **Proposition 2 / 3.** Exact depth of a length-`L` scramble: lookup if inside the
  ball, else search radius `r = max(0, L−R−2)` (QTM, parity-tightened) or `r = L−R`
  (HTM, no parity) and minimise `dist(x,y)+d(y)` over ball intersections.
- **Free reduction (Table V).** `E[ℓ_red|L]` is computed exactly from the
  reduced-length birth–death recurrence, not by Monte Carlo; the first-order law
  `L−(L−1)/24` is its leading approximation, not its exact value.
- **N₅ / HTM N₄.** Deep shells are 128-bit-fingerprint counts (collision bound in the
  paper's Appendix A); the final BFS level is counted without storing states to bound
  memory. No exact-distance result depends on a fingerprinted count.
