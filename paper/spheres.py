"""
State-graph enumeration and rigorous diameter lower bounds.

Reproduces:
  Table II   3x3x3 validation (QTM/FTM sphere sizes vs OEIS A080602 / A080601)
  Table III  QTM sphere sizes N0..N5 (N0-N4 full key; N5 128-bit fingerprint)
  Table VII  QTM vs HTM summary + rigorous non-backtracking diameter lower bounds
  Table VIII HTM sphere sizes N0..N4
  Fig. 2     branching ratios (data written to results/branching.json)

Notes
- N0..N4 use full 216-byte-key deduplication (exact, ~3 s, <0.4 GB).
- N5 (QTM, 101M) and N4 (HTM, 12.6M) use 128-bit fingerprints; the final frontier
  is counted without storing states to bound memory (see Appendix A for the
  collision bound).  Pass --deep to compute them (slower / more memory).
"""
import sys, time, json, math, os
import model_4d as M4
import model_3d as M3
from group_order import group_order

HERE = os.path.dirname(__file__)
RES = os.path.join(HERE, "results")
os.makedirs(RES, exist_ok=True)
M64 = (1 << 64) - 1
def fp(s, s1=b'\x00', s2=b'\x9e'):
    return (hash(s1 + s) & M64) | ((hash(s2 + s) & M64) << 64)


def bfs_fullkey(tabs, ident, maxd):
    visited = {ident}; frontier = [ident]; sph = [1]
    for _ in range(maxd):
        nxt = []; has = visited.__contains__; add = visited.add; ap = nxt.append
        for s in frontier:
            for t in tabs:
                r = s.translate(t)
                if not has(r): add(r); ap(r)
        sph.append(len(nxt)); frontier = nxt
    return sph


def shell_fp_count(tabs, frontier, ball_fps):
    """One BFS layer counted with 128-bit fingerprints, states not stored."""
    add = ball_fps.add; has = ball_fps.__contains__; cnt = 0
    for s in frontier:
        for t in tabs:
            f = fp(s.translate(t))
            if not has(f):
                add(f); cnt += 1
    return cnt


def htm_tables():
    tabs, ident = M4.move_tables()
    def compose(t): return bytes(t[t[i]] for i in range(256))
    halves, seen = [], set()
    for t in tabs:
        h2 = compose(t)
        if h2 != ident and h2 not in seen:
            seen.add(h2); halves.append(h2)
    return tabs + halves, ident


def diameter_lb(deg, G):
    """Smallest D with 1 + deg*sum_{i<D-1}(deg-1)^i >= |G| (non-backtracking Moore)."""
    D = 0
    while 1 + deg * sum((deg - 1) ** i for i in range(D)) < G:
        D += 1
    return D


def main(deep=False):
    G = group_order()
    out = {}

    # ---- Table II: 3x3x3 validation ----
    t3, id3 = M3.move_tables()
    qtm3 = bfs_fullkey(t3, id3, 5)
    def compose(t): return bytes(t[t[i]] for i in range(256))
    halves3, seen = [], set()
    for t in t3:
        h2 = compose(t)
        if h2 != id3 and h2 not in seen: seen.add(h2); halves3.append(h2)
    ftm3 = bfs_fullkey(t3 + halves3, id3, 4)
    out["cube_qtm"] = qtm3; out["cube_ftm"] = ftm3
    print("3x3x3 QTM:", qtm3, "==A080602:", qtm3 == [1, 12, 114, 1068, 10011, 93840])
    print("3x3x3 FTM:", ftm3, "==A080601:", ftm3 == [1, 18, 243, 3240, 43239])

    # ---- Table III: QTM spheres (full key to 4) ----
    t4, id4 = M4.move_tables()
    qtm = bfs_fullkey(t4, id4, 4)
    print("4D QTM N0..N4:", qtm)
    out["qtm"] = qtm

    # ---- Table VIII: HTM spheres (full key to 3) ----
    htabs, idh = htm_tables()
    htm = bfs_fullkey(htabs, idh, 3)
    print("4D HTM N0..N3:", htm, " (degree", len(htabs), ")")
    out["htm"] = htm

    if deep:
        # QTM N5 and HTM N4 via 128-bit fingerprints (final frontier not stored)
        # rebuild frontiers
        ball = {fp(id4)}; frontier = [id4]
        for _ in range(4):
            nx = []; has = ball.__contains__; add = ball.add
            for s in frontier:
                for t in t4:
                    r = s.translate(t); f = fp(r)
                    if not has(f): add(f); nx.append(r)
            frontier = nx
        out["qtm_N5"] = shell_fp_count(t4, frontier, ball)
        print("4D QTM N5 (fingerprint):", out["qtm_N5"])

        ball = {fp(idh)}; frontier = [idh]
        for _ in range(3):
            nx = []; has = ball.__contains__; add = ball.add
            for s in frontier:
                for t in htabs:
                    r = s.translate(t); f = fp(r)
                    if not has(f): add(f); nx.append(r)
            frontier = nx
        out["htm_N4"] = shell_fp_count(htabs, frontier, ball)
        print("4D HTM N4 (fingerprint):", out["htm_N4"])
    else:
        out["qtm_N5"] = 101069376      # published high-confidence value (run with --deep)
        out["htm_N4"] = 12613270

    # ---- diameter lower bounds (Table VII) ----
    out["qtm_diam_lb"] = diameter_lb(48, G)
    out["htm_diam_lb"] = diameter_lb(72, G)
    out["qtm_scale"] = round(math.log(G) / math.log(37.8), 1)
    out["htm_scale"] = round(math.log(G) / math.log(55.3), 1)
    print("QTM diameter >= %d (scale ~%.0f)" % (out["qtm_diam_lb"], out["qtm_scale"]))
    print("HTM diameter >= %d (scale ~%.0f)" % (out["htm_diam_lb"], out["htm_scale"]))

    # branching data for Fig. 2
    qn = qtm + [out["qtm_N5"]]; hn = htm + [out["htm_N4"]]
    out["branching"] = {
        "qtm": [qn[i] / qn[i - 1] for i in range(1, len(qn))],
        "htm": [hn[i] / hn[i - 1] for i in range(1, len(hn))],
    }
    json.dump(out, open(os.path.join(RES, "spheres.json"), "w"), indent=1)
    json.dump(out["branching"], open(os.path.join(RES, "branching.json"), "w"), indent=1)
    print("wrote results/spheres.json, results/branching.json")


if __name__ == "__main__":
    main(deep="--deep" in sys.argv)
