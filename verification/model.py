"""Shared sticker/piece model for the 3^4 hypercube (imported by the stage scripts)."""
from itertools import product
from sympy.combinatorics import Permutation, PermutationGroup

AXES = [0, 1, 2, 3]
pieces = [p for p in product((-1, 0, 1), repeat=4) if any(p)]
stickers = []
sticker_index = {}
for p in pieces:
    for i in AXES:
        if p[i] != 0:
            sticker_index[(p, i)] = len(stickers)
            stickers.append((p, i))
N = len(stickers)
assert N == 216

def ccount(p): return sum(1 for c in p if c != 0)
orbit_of_sticker = [ccount(stickers[k][0]) for k in range(N)]
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
