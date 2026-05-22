"""
Standard 3x3x3 cube built with the SAME piece/sticker construction as model_4d.py,
used to validate the enumeration/dedup/metric code (Table II) and to corroborate the
scramble-bias decomposition (Section V-B).

Pieces are the nonzero vectors of {-1,0,1}^3 (26: 8 corners, 12 edges, 6 centres);
a sticker is a piece-axis incidence (54 stickers).  A face quarter-turn fixes one
axis at +-1 and rotates the other two coordinates 90 degrees (one rotation plane
per face, unlike the three planes per facet in 4D), giving 12 QTM generators.
"""
from itertools import product
from sympy.combinatorics import Permutation

AXES = [0, 1, 2]
pieces = [p for p in product((-1, 0, 1), repeat=3) if any(p)]
stickers, sticker_index = [], {}
for p in pieces:
    for i in AXES:
        if p[i] != 0:
            sticker_index[(p, i)] = len(stickers)
            stickers.append((p, i))
N = len(stickers)
assert N == 54, N
piece_index = {p: k for k, p in enumerate(pieces)}


def rotate_vector(p, b, c, direction):
    q = list(p)
    if direction == +1:
        q[b], q[c] = -p[c], p[b]
    else:
        q[b], q[c] = p[c], -p[b]
    return tuple(q)


def face_twist(a, s, b, c, direction):
    mapping = list(range(N))
    for (p, i), idx in sticker_index.items():
        if p[a] != s:
            continue
        p2 = rotate_vector(p, b, c, direction)
        unit = [0, 0, 0]; unit[i] = p[i]
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


gen_labels = []
for a in AXES:
    o = [x for x in AXES if x != a]
    b, c = o
    for s in (+1, -1):
        for d in (+1, -1):
            gen_labels.append((a, s, b, c, d))


def sticker_gens(): return [face_twist(*lab) for lab in gen_labels]
def piece_gens():   return [piece_perm(*lab) for lab in gen_labels]


def move_tables():
    tabs = []
    for g in sticker_gens():
        af = g.array_form + list(range(len(g.array_form), N))
        tabs.append(bytes(af[i] if i < N else i for i in range(256)))
    return tabs, bytes(range(N))


def inverse_index():
    G = len(gen_labels); inv = [None] * G
    for i, (a, s, b, c, d) in enumerate(gen_labels):
        for j, (a2, s2, b2, c2, d2) in enumerate(gen_labels):
            if (a2, s2, b2, c2, d2) == (a, s, b, c, -d):
                inv[i] = j
    return inv
