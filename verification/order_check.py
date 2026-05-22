import time
exec(open('verify_hypercube.py').read().split('G = PermutationGroup')[0])
from sympy.combinatorics import PermutationGroup

G = PermutationGroup(generators)
t = time.time()
base, sgs = G.schreier_sims_random(consec_succ=15)
print('random SGS in %.1fs, base length %d, |SGS|=%d' % (time.time()-t, len(base), len(sgs)))

# Represent strong gens as plain arrays for a fast BFS.
n = len(stickers)
def to_array(perm):
    return perm.array_form + list(range(len(perm.array_form), n))

sgs_arr = [to_array(g) for g in sgs]

def fixes_prefix(arr, pts):
    return all(arr[p] == p for p in pts)

# product of basic-orbit lengths along the (randomized) base
order = 1
orbit_lengths = []
for i, b in enumerate(base):
    prefix = base[:i]
    gens_i = [a for a in sgs_arr if fixes_prefix(a, prefix)]
    # BFS orbit of b under gens_i
    seen = {b}
    frontier = [b]
    while frontier:
        nf = []
        for x in frontier:
            for a in gens_i:
                y = a[x]
                if y not in seen:
                    seen.add(y); nf.append(y)
        frontier = nf
    orbit_lengths.append(len(seen))
    order *= len(seen)

print('basic orbit lengths:', orbit_lengths)
print('ORDER:')
print(order)
print('approx %.6e' % float(order))

from math import factorial as f
closed = (f(24)*f(32)//2)*(f(16)//2)*(2**23)*((f(3)**31)*3)*((f(4)//2)**15*4)
print('closed-form Eq(5):')
print(closed)
print('MATCH:', order == closed)
print('digits:', len(str(order)), 'leading 19:', str(order)[:19])

# orbit sizes on pieces (sanity)
orbs = G.orbits()
piece_orbit_sizes = sorted(len(set(stickers[k][0] for k in o)) for o in orbs)
print('piece counts per sticker-orbit:', piece_orbit_sizes)
print('sticker-orbit sizes:', sorted(len(o) for o in orbs))
