"""
Q6 (referee): breadth-first sphere sizes of the 3^4 Cayley graph in the
outer-twist quarter-turn metric (the 48 frame-preserving quarter-turns).

Prints N_0..N_4 (number of distinct configurations at each radius) and the
branching ratios N_k/N_{k-1}.  States are byte-strings of the 216-sticker
image; composition uses bytes.translate (C speed).  Visited set stores hashes
to bound memory; depth 4 is counted without materialising its states.

Result (deterministic):
    N = [1, 48, 1864, 70752, 2675260]   ratios = [48, 38.8, 38.0, 37.8]
A constant-ratio extrapolation gives log|G|/log(37.8) ~ 76 quarter-turns.

Run:  python sphere_sizes.py        (requires sympy; ~2 s, <300 MB)
"""
import time
from model import sticker_gens, N

tabs = []
for g in sticker_gens():
    af = g.array_form + list(range(len(g.array_form), N))
    tabs.append(bytes(af[i] if i < N else i for i in range(256)))

ident = bytes(range(N))
t0 = time.perf_counter()
visited = {hash(ident)}; frontier = [ident]; spheres = [1]; MAXD = 4
for depth in range(1, MAXD + 1):
    add = visited.add
    if depth < MAXD:
        nxt = []; ap = nxt.append
        for s in frontier:
            for tbl in tabs:
                r = s.translate(tbl); h = hash(r)
                if h not in visited: add(h); ap(r)
        spheres.append(len(nxt)); frontier = nxt
    else:
        cnt = 0
        for s in frontier:
            for tbl in tabs:
                h = hash(s.translate(tbl))
                if h not in visited: add(h); cnt += 1
        spheres.append(cnt)
    print("  N_%d = %d   (t=%.1fs)" % (depth, spheres[-1], time.perf_counter() - t0))

ratios = [round(spheres[i] / spheres[i-1], 3) for i in range(1, len(spheres))]
print("spheres:", spheres)
print("branching ratios:", ratios)
