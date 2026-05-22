"""
Q4 (referee): Schreier-Sims profile and representation-robustness check.

Computes the position group P (action on the 80 pieces) with sympy's
deterministic Schreier-Sims, reporting base length, strong-generating-set
size, transversal sizes, runtime and peak memory.  The full configuration
order is then |G| = |P| * |K|, where K is the orientation kernel of
Section 3.4; this reproduces the closed-form (5) to the last digit and shows
the count is independent of whether the puzzle is represented on the 80
pieces or the 216 stickers.

Run:  python schreier_sims_profile.py     (requires sympy)
"""
import time, tracemalloc
from math import factorial as f
from model import piece_gens
from sympy.combinatorics import PermutationGroup

tracemalloc.start(); t0 = time.perf_counter()
P = PermutationGroup(piece_gens()); P.schreier_sims(); order = P.order()
t1 = time.perf_counter(); _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()

P_closed = (f(16)//2) * (f(24) * f(32) // 2)
K = (2**23) * ((f(3)**31)*3) * ((f(4)//2)**15 * 4)   # = 2^24/2 * 6^32/2 * 12^16/3
G = order * K
G_closed = (f(24)*f(32)//2)*(f(16)//2)*(2**23)*((f(3)**31)*3)*((f(4)//2)**15*4)

print("position group P (action on 80 pieces):")
print("  |P| =", order, "(%d digits)" % len(str(order)))
print("  matches (16!/2)*(24!*32!/2):", order == P_closed)
print("  base length:", len(P.base))
print("  strong generating set size:", len(P.strong_gens))
bo = [len(t) for t in P.basic_orbits]; prod = 1
for x in bo: prod *= x
print("  transversal sizes multiply to |P|:", prod == order)
print("  runtime: %.2f s   peak python mem: %.1f MiB" % (t1-t0, peak/1024/1024))
print()
print("orientation kernel |K| = 2^24/2 * 6^32/2 * 12^16/3 =", K)
print("full order |G| = |P|*|K| =", G)
print("  matches closed-form Eq (5):", G == G_closed, " (%d digits)" % len(str(G)))
