"""
Extend the 3^4 Cayley-graph breadth-first search to radius 5 (v3 novelty).

Outer-twist quarter-turn metric: the 48 frame-preserving quarter-turns.
States are the 216-sticker images (uint8 rows); a generator relabels sticker
values, so applying generator g to state s is r = T[g][s] (vectorized gather).
States are deduplicated by a 64-bit polynomial hash taken 8 bytes at a time via
a uint64 view (216 = 27*8 columns), which is ~8x faster than per-byte hashing.

Spheres 0..4 are computed exactly (byte-set BFS); sphere 5 is obtained by
expanding the 2,675,260-state radius-4 frontier (=> 1.284e8 candidate images),
hashing, removing the radius<=4 hashes, and counting distinct survivors.

RESULT (deterministic):
    N_0..N_5 = 1, 48, 1864, 70752, 2675260, 101069376
    branching ratios = 48, 38.833, 37.957, 37.812, 37.779
    cumulative reached through radius 5 = 103,817,301 configurations

Structural by-product: the radius-4 ball's outgoing edges land in exactly
N_3 = 70752 already-seen nodes and *no* radius-4 node, i.e. the quarter-turn
Cayley graph is BIPARTITE -- every generator is an odd permutation (a single
4-cycle on the 24 two-coloured pieces), so the sign map G -> Z_2 two-colours
the graph and minimal word length has the parity of the underlying permutation.

NOTE ON RESOURCES: radius 5 needs ~1 GB for the candidate-hash buffer plus
~0.6 GB for the frontier. On a memory- or disk-constrained machine, run the
'--chunk' mode, which processes the 48 generators in ranges, saving partial
unique-hash arrays to disk, then merges them with a chunked membership test
(np.searchsorted against the radius<=4 hashes) to avoid np.isin's 1 GB
temporaries.  ALWAYS delete the large .npy scratch files between stages.

For a published value, re-run with a second hash base (B below) and confirm the
count is identical; collisions in a single 64-bit run are improbable (~3e-4)
but should be excluded before final submission.

Run (single machine, >=6 GB RAM recommended):
    python sphere_sizes_n5.py
"""
import sys
import numpy as np
from model import sticker_gens, N  # N == 216

B = np.uint64(1_000_003)  # hash base; cross-check with e.g. 2_000_000_011


def build_tables():
    rows = []
    for g in sticker_gens():
        af = g.array_form + list(range(len(g.array_form), N))
        rows.append([af[i] if i < N else i for i in range(N)])
    Tarr = np.array(rows, dtype=np.uint8)                       # (48, N) value relabels
    btabs = [bytes(r + list(range(N, 256))) for r in rows]      # for exact byte-set BFS
    return Tarr, btabs


def polyhash(R):
    """R: (m, 216) uint8, C-contiguous. Returns (m,) uint64 poly hash over 27 words."""
    V = R.view(np.uint64)                                        # (m, 27)
    h = np.zeros(R.shape[0], dtype=np.uint64)
    for c in range(V.shape[1]):
        h = h * B + V[:, c]
    return h


def main():
    Tarr, btabs = build_tables()
    identb = bytes(range(N))
    visited = {identb}
    frontier = [identb]
    spheres = [1]
    for depth in range(1, 5):
        nxt = []
        ap = nxt.append
        add = visited.add
        for s in frontier:
            for tb in btabs:
                r = s.translate(tb)
                if r not in visited:
                    add(r); ap(r)
        spheres.append(len(nxt))
        frontier = nxt
        print(f"N_{depth} = {len(nxt)}")

    # radius<=4 poly hashes (sorted) for membership
    allLE4 = np.frombuffer(b"".join(visited), dtype=np.uint8).reshape(-1, N).copy()
    visPoly = np.unique(polyhash(allLE4))
    F = np.frombuffer(b"".join(frontier), dtype=np.uint8).reshape(-1, N).copy()
    del visited, frontier, allLE4

    # radius 5: distinct neighbours of the radius-4 frontier, minus radius<=4
    parts = []
    for gi in range(48):
        R = np.ascontiguousarray(Tarr[gi][F])
        parts.append(np.unique(polyhash(R)))
        del R
    del F
    buf = np.concatenate(parts)
    del parts
    buf.sort()
    firstocc = np.empty(buf.size, dtype=bool)
    firstocc[0] = True
    np.not_equal(buf[1:], buf[:-1], out=firstocc[1:])
    # chunked membership vs visPoly (avoids np.isin temporaries)
    new = 0
    CH = 8_000_000
    for s in range(0, buf.size, CH):
        e = min(s + CH, buf.size)
        idx = np.clip(np.searchsorted(visPoly, buf[s:e]), 0, visPoly.size - 1)
        inV = visPoly[idx] == buf[s:e]
        new += int((firstocc[s:e] & ~inV).sum())
    spheres.append(new)
    print(f"N_5 = {new}")
    print("spheres:", spheres)
    print("ratios:", [round(spheres[i] / spheres[i - 1], 3) for i in range(1, len(spheres))])
    print("cumulative<=5:", sum(spheres))


if __name__ == "__main__":
    main()
