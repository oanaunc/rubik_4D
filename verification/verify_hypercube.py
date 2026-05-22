"""
First-principles verification of the 3x3x3x3 (3^4) Rubik hypercube configuration group.

Model (matches Section 2 of the paper):
  * A piece is a vector p in {-1,0,1}^4, p != 0.  There are 3^4 - 1 = 80 movable pieces.
  * The number of nonzero ("extreme") coordinates of p is its colour count:
        4 nonzero -> 16 corners (4C)      [C(4,4)*2^4 = 16]
        3 nonzero -> 32 edges   (3C)      [C(4,3)*2^3 = 32]
        2 nonzero -> 24 faces   (2C)      [C(4,2)*2^2 = 24]
        1 nonzero ->  8 centres (1C)      [C(4,1)*2^1 =  8]
  * A sticker is a pair (piece p, exposed axis i) with p_i != 0; it faces the
    facet (axis i, sign p_i).  Total stickers = 16*4 + 32*3 + 24*2 + 8*1 = 216.

A face twist of the facet with normal (axis a, sign s) rigidly rotates the 27
cells with coordinate p_a = s by +/-90 degrees in one of the three coordinate
planes spanned by the OTHER three axes.  Such a rotation fixes all eight
cell-centres (the reference frame), exactly as the paper stipulates.

We build the 48 outer face twists (8 facets x 3 planes x 2 directions) as
permutations of the 216 stickers and compute the order, orbits, and parities
of the generated group with sympy's Schreier-Sims implementation.
"""
from itertools import product
from sympy.combinatorics import Permutation, PermutationGroup

AXES = [0, 1, 2, 3]  # X, Y, Z, W

# ---- enumerate pieces and stickers ---------------------------------------
pieces = [p for p in product((-1, 0, 1), repeat=4) if any(p)]
assert len(pieces) == 80

stickers = []           # list of (piece, axis)
sticker_index = {}
for p in pieces:
    for i in AXES:
        if p[i] != 0:
            sticker_index[(p, i)] = len(stickers)
            stickers.append((p, i))
assert len(stickers) == 216, len(stickers)

# colour-count census
from collections import Counter
census = Counter(sum(1 for c in p if c != 0) for p in pieces)
print("Piece census by colour count:", dict(sorted(census.items())))

# ---- rotation of a coordinate vector in plane (b,c) by +90 deg -----------
def rotate_vector(p, b, c, direction):
    """Rotate the (b,c) components by +/-90 degrees. direction = +1 or -1.
       +90: e_b -> e_c, e_c -> -e_b."""
    q = list(p)
    if direction == +1:
        q[b], q[c] = -p[c], p[b]
    else:
        q[b], q[c] = p[c], -p[b]
    return tuple(q)

# ---- build one face-twist permutation on stickers ------------------------
def face_twist(a, s, b, c, direction):
    """Facet normal (axis a, sign s); rotate plane (b,c) by direction."""
    mapping = list(range(len(stickers)))
    for (p, i), idx in sticker_index.items():
        if p[a] != s:          # piece not on this facet -> fixed
            continue
        p2 = rotate_vector(p, b, c, direction)
        # the exposed axis i is carried by the same rotation
        if i == a:
            i2 = a
        elif i == b:
            i2 = c if direction == +1 else c   # axis label of image of e_b/e_c
        # generic: recompute image axis from a unit vector
        # (robust handling below)
        # We instead compute image of the unit sticker direction.
        unit = [0, 0, 0, 0]
        unit[i] = p[i]
        unit_rot = rotate_vector(tuple(unit), b, c, direction)
        # the nonzero coordinate of unit_rot gives (axis, sign)
        i2 = next(k for k in AXES if unit_rot[k] != 0)
        mapping[idx] = sticker_index[(p2, i2)]
    return Permutation(mapping, size=len(stickers))

# the three coordinate planes among the 3 axes != a
def other_planes(a):
    others = [x for x in AXES if x != a]
    b1, b2, b3 = others
    return [(b1, b2), (b1, b3), (b2, b3)]

generators = []
for a in AXES:
    for s in (+1, -1):
        for (b, c) in other_planes(a):
            for d in (+1, -1):
                generators.append(face_twist(a, s, b, c, d))

print("Number of outer face-twist generators:", len(generators))

G = PermutationGroup(generators)
order = G.order()
print("\n|G| computed by Schreier-Sims:")
print(order)
print("approx = %.4e" % float(order))

# ---- closed-form order from Eq (5) ---------------------------------------
from math import factorial as f
closed = (f(24) * f(32) // 2) * (f(16) // 2) * (2**23) * ((f(3)**31) * 3) * ((f(4)//2)**15 * 4)
print("\nClosed-form Eq (5):")
print(closed)
print("approx = %.4e" % float(closed))
print("MATCH:", order == closed)
print("digits:", len(str(order)))
print("leading:", str(order)[:19])

# ---- orbit sizes ----------------------------------------------------------
# group stickers by piece, then look at orbits of pieces under G's action.
# We recover the piece-orbit sizes from the sticker orbits.
orbits = G.orbits()
print("\nSticker-orbit sizes:", sorted(len(o) for o in orbits))

# map each sticker orbit back to the set of pieces it touches
piece_orbit_sizes = []
for o in orbits:
    pcs = set(stickers[k][0] for k in o)
    piece_orbit_sizes.append(len(pcs))
print("Distinct piece counts per sticker-orbit:", sorted(piece_orbit_sizes))
