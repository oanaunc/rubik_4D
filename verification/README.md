# Group-theoretic verification of the 3×3×3×3 hypercube

This directory contains the computational verification referenced in the paper
*The 3×3×3×3 Rubik's Hypercube: A Geometry-First Treatment* (Rinaldi & Chiru,
submitted to *Axioms*), Section 7 ("Computational Tools for the Hypercube Group").

The scripts build the puzzle from first principles in the concrete model of
Section 2 — the 80 movable pieces are the nonzero vectors in {−1, 0, 1}⁴ and the
216 stickers are piece–axis incidences — encode the 48 outer hyperface twists as
permutations of the stickers, and verify the group-theoretic claims of the paper.

## Files

- `hypercube34.g` — self-contained GAP script. Builds the generators and prints
  the group order (the 121-digit integer of Eq. (6), identical to the closed-form
  product Eq. (5)) and the sticker-orbit sizes.
- `verify_hypercube.py` — independent Python (sympy) implementation of the same
  construction, with the Schreier–Sims order computation.
- `order_check.py` — checks the computed order against the closed-form product.
- `parity_check.py` — verifies the coupled (2C/3C) parity law, the even-corner
  law, and the orientation-kernel factorisation 2²³·(6³¹·3)·(12¹⁵·4).
- `model.py` — shared sticker/piece permutation model imported by the scripts below.
- `schreier_sims_profile.py` — base length, strong-generating-set size, transversal
  sizes, runtime and memory for the position group (referee Q4).
- `parity_and_reduction.py` — per-generator cycle types and signs proving the parity
  laws (Q1), and the slice identity showing the 48 outer twists generate the group (Q3).
- `sphere_sizes.py` — breadth-first sphere sizes of the Cayley graph and branching
  ratios, the empirical God's-number probe (Q6).
- `RESULTS.md` — the computed results, with each value matched against the
  closed form.

## Reproducing

GAP:

```
gap hypercube34.g
```

Python (requires `sympy`):

```
pip install sympy
python verify_hypercube.py
python order_check.py
python parity_check.py
```

All scripts are self-contained and take no arguments.
