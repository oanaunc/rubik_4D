"""
Sticker/piece model for the 3^4 hypercube (the four-dimensional Rubik's cube).

Pieces are the nonzero vectors of {-1,0,1}^4 (80 of them: 16 four-colour corners,
32 three-colour, 24 two-colour, 8 one-colour cell-centres).  A *sticker* is a
piece-axis incidence, giving 216 stickers.  A legal move is a quarter-turn of one
outer cubical facet: it fixes one coordinate at +-1 and rotates two of the other
three by 90 degrees.  There are 48 such frame-preserving generators (8 facets x 3
in-facet rotation planes x 2 directions).

Used by every script in paper/.  See paper/README.md for the table/figure map.
"""
from itertools import product
from sympy.combinatorics import Permutation

AXES = [0, 1, 2, 3]
pieces = [p for p in product((-1, 0, 1), repeat=4) if any(p)]
stickers, sticker_index = [], {}
for p in pieces:
    for i in AXES:
        if p[i] != 0:
            sticker_index[(p, i)] = len(stickers)
            stickers.append((p, i))
N = len(stickers)
assert N == 216, N
piece_index = {p: k for k, p in enumerate(pieces)}


def rotate_vector(p, b, c, direction):
    q = list(p)
    if direction == +1:
        q[b], q[c] = -p[c], p[b]
    else:
        q[b], q[c] = p[c], -p[b]
    return tuple(q)


def face_twist(a, s, b, c, direction):
    """Sticker permutation of the quarter-turn (facet axis a at sign s, plane (b,c))."""
    mapping = list(range(N))
    for (p, i), idx in sticker_index.items():
        if p[a] != s:
            continue
        p2 = rotate_vector(p, b, c, direction)
        unit = [0, 0, 0, 0]; unit[i] = p[i]
        ur = rotate_vector(tuple(unit), b, c, direction)
        i2 = next(k for k in AXES if ur[k] != 0)
        mapping[idx] = sticker_index[(p2, i2)]
    return Permutation(mapping, size=N)


def piece_perm(a, s, b, c, direction):
    m = list(range(len(pieces)))
    for p, k in piece_index.items():
        if p[a] != s:
            continue
        m[k] = piece_index[rotate_vector(p, b, c, direction)]
    return Permutation(m, size=len(pieces))


def other_planes(a):
    o = [x for x in AXES if x != a]
    return [(o[0], o[1]), (o[0], o[2]), (o[1], o[2])]


gen_labels = []
for a in AXES:
    for s in (+1, -1):
        for (b, c) in other_planes(a):
            for d in (+1, -1):
                gen_labels.append((a, s, b, c, d))


def sticker_gens(): return [face_twist(*lab) for lab in gen_labels]
def piece_gens():   return [piece_perm(*lab) for lab in gen_labels]


def move_tables():
    """48 byte-translation tables (for str.translate) and the solved key."""
    tabs = []
    for g in sticker_gens():
        af = g.array_form + list(range(len(g.array_form), N))
        tabs.append(bytes(af[i] if i < N else i for i in range(256)))
    return tabs, bytes(range(N))


def inverse_index():
    """inv[i] = index of the generator inverse to generator i."""
    G = len(gen_labels); inv = [None] * G
    for i, (a, s, b, c, d) in enumerate(gen_labels):
        for j, (a2, s2, b2, c2, d2) in enumerate(gen_labels):
            if (a2, s2, b2, c2, d2) == (a, s, b, c, -d):
                inv[i] = j
    return inv


def facet_index():
    """facet[i] = (axis, sign) outer facet of generator i."""
    return [(a, s) for (a, s, b, c, d) in gen_labels]
