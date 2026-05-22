# Verification results (computed)

- Pieces: 80 (census {1C:8, 2C:24, 3C:32, 4C:16}); stickers: 216.
- Generators: 48 outer hyperface twists (8 facets x 3 planes x 2 directions); fix all 8 cell-centres.
- |G| (Schreier-Sims, sympy) = closed-form Eq (5):
  1756772880709135843168526079081025059614484630149557651477156021733236798970168550600274887650082354207129600000000000000
  (121 digits, leading 1756772880709135843, approx 1.756773e120). MATCH = True.
- Sticker orbits: sizes {64 (16 corners x4), 96 (32 edges x3), 48 (24 faces x2)} + 8 fixed singletons (centres).
- Parity: every generator induces EQUAL parity on 2C and 3C orbits (coupled parity); every generator is EVEN on the 16 corners.
- Position group |P| = (16!/2)*(24!*32!/2) = 853958999428346670146637167842740671369017657685146022707200000000000000. MATCH = True.
- Orientation kernel K = |G|/|P| = 2^23 * (6^31*3) * (12^15*4). MATCH = True.
    - faces  : 2^24 -> 2^23  (reduction /2; sum of flips = 0 mod 2)
    - edges  : 6^32 -> 6^31*3 (reduction /2; product of S3-signs = 0)
    - corners: 12^16 -> 12^15*4 (reduction /3; total twist = 0 mod 3 via A4 -> Z3)
- Corner orientation group: order 12, realised as rotations of the 4-sticker frame => subgroup of S4; the unique order-12 subgroup of S4 is A4 (Z12 does not embed in S4). So orientation group = A4, not Z12.

## Added for the v2 revision (referee response)

Q4 - Schreier-Sims profile (`schreier_sims_profile.py`), position group on 80 pieces:
- base length = 67; strong generating set size = 184; transversal sizes multiply to |P|. MATCH = True.
- runtime ~12 s, peak < 3 MiB (sympy, deterministic). |G| = |P|*|K| reproduces Eq (5) to the last digit.
- Notation now written in quotient form: |K| = 2^24/2 * 6^32/2 * 12^16/3.

Q1 - parity laws via cycle structure (`parity_and_reduction.py`):
- ALL 48 generators have signature (sign 2C, sign 3C, sign 4C) = (-1, -1, +1).
- A single quarter-turn = one 4-cycle on 2C, three 4-cycles on 3C, two 4-cycles on 4C (rest fixed).
  4-cycle = odd => odd on 2C and 3C (coupled parity), even on 4C (even-corner law).

Q3 - generating-set reduction (`parity_and_reduction.py`):
- slice identity T(+a).T(0).T(-a) = R (whole-puzzle rotation). VERIFIED = True.
- middle twist T(0) = R.T(+a)^-1.T(-a)^-1 ; the 48 frame-preserving outer twists alone generate G.

Q6 - Cayley-graph sphere sizes, outer-twist quarter-turn metric (`sphere_sizes.py`):
- N = [1, 48, 1864, 70752, 2675260];  branching ratios = [48, 38.8, 38.0, 37.8].
- constant-ratio extrapolation: log|G|/log(37.8) ~ 76 qt; refined counting floor log|G|/log(48) ~ 71 qt.
  (First reported sphere sizes for the 3^4 Cayley graph; a lower-bound-flavoured estimate only.)
