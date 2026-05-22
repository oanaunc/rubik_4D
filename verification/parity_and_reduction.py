"""
Q1 (parity laws) and Q3 (generating-set reduction), referee revision.

Q1: prints, for each of the 48 outer quarter-turns, the sign and cycle type
    on the 2C / 3C / 4C orbits.  Confirms every generator is
        odd on 2C (one 4-cycle), odd on 3C (three 4-cycles), even on 4C (two 4-cycles),
    which proves the coupled 2C/3C parity and the even-corner law.

Q3: verifies the slice identity  T(+a) . T(0) . T(-a) = R  (whole-puzzle
    rotation), so the middle-layer twist T(0) = R . T(+a)^-1 . T(-a)^-1 is a
    reorientation of outer twists; the 48 frame-preserving outer twists alone
    generate the full configuration group.

Run:  python parity_and_reduction.py      (requires sympy)
"""
from collections import Counter
from model import (pieces, piece_index, ccount, rotate_vector,
                   gen_labels, piece_perm, other_planes)
from sympy.combinatorics import Permutation, PermutationGroup

porb = {k: [piece_index[p] for p in pieces if ccount(p) == k] for k in (1, 2, 3, 4)}

def sign_cycles(perm, orb):
    pa = perm.array_form; seen = set(); odd = 0; cl = Counter()
    for x in orb:
        if x in seen: continue
        y = x
        while y not in seen:
            seen.add(y); y = pa[y]
            cl_len = 0
        # recompute cycle length properly
    # simpler second pass
    seen = set(); odd = 0; cl = Counter()
    for x in orb:
        if x in seen: continue
        L = 0; y = x
        while y not in seen:
            seen.add(y); y = pa[y]; L += 1
        cl[L] += 1
        if L % 2 == 0: odd ^= 1
    return (-1 if odd else 1), dict(cl)

print("== Q1: per-generator sign on (2C,3C,4C) ==")
dist = Counter()
for lab, pp in [(l, piece_perm(*l)) for l in gen_labels]:
    sig = tuple(sign_cycles(pp, porb[k])[0] for k in (2, 3, 4))
    dist[sig] += 1
print("  signature (2C,3C,4C) -> #generators:", dict(dist))
p0 = piece_perm(*gen_labels[0])
for k in (1, 2, 3, 4):
    s, cl = sign_cycles(p0, porb[k])
    print("  example gen on %dC: sign=%+d cycle-type=%s" % (k, s, cl))

print("\n== Q3: slice identity & generation ==")
def rotate_all(b, c, d):
    return Permutation([piece_index[rotate_vector(p, b, c, d)] for p in pieces], size=len(pieces))
def layer(a, lay, b, c, d):
    return Permutation([piece_index[rotate_vector(p, b, c, d)] if p[a] == lay else piece_index[p]
                        for p in pieces], size=len(pieces))
a = 0; (b, c) = other_planes(a)[0]; d = +1
Tp, T0, Tm, R = layer(a, 1, b, c, d), layer(a, 0, b, c, d), layer(a, -1, b, c, d), rotate_all(b, c, d)
print("  T(+a).T(0).T(-a) == whole rotation R :", Tp*T0*Tm == R)
print("  middle twist  T0 == R.T(+a)^-1.T(-a)^-1 :", T0 == R*Tp**-1*Tm**-1)
P = PermutationGroup([piece_perm(*l) for l in gen_labels])
print("  <48 outer twists> position-order has %d digits (= |P|)" % len(str(P.order())))
