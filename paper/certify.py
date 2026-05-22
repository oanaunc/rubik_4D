"""
Certified-ball exact-distance certification (Propositions 2 and 3) and the
scramble-length-vs-state-depth bias study.

Reproduces:
  Table IV  i.i.d. scramble L vs exact depth d (E[d], efficiency, P(d<L), Wilson)
  Table VI  scramble-model comparison at L=7 (iid / NII / NSF)
  Figs 4-6  data (results/scramble.json)

Method (Proposition 2, bipartite QTM): build the certified radius-4 ball B4 as a
hash->depth dictionary.  For a length-L scramble x: if x in B4 return its depth;
else search radius r = max(0, L-6) and return min over ball intersections of
dist(x,y)+d(y), or L if none (parity fallback).  Verified exact for L<=9.

Usage:
  python3 certify.py                 # default sample plan (paper sizes; minutes)
  python3 certify.py --quick         # small samples for a fast smoke test
"""
import sys, time, random, math, json, os
import model_4d as M

HERE = os.path.dirname(__file__); RES = os.path.join(HERE, "results")
os.makedirs(RES, exist_ok=True)
TABS, IDENT = M.move_tables()
G = len(TABS); INV = M.inverse_index(); FACET = M.facet_index()
D = 4


def build_ball(R=4):
    ball = {hash(IDENT): 0}; frontier = [IDENT]
    for depth in range(1, R + 1):
        nx = []; has = ball.__contains__; put = ball.__setitem__
        for s in frontier:
            for t in TABS:
                r = s.translate(t); h = hash(r)
                if not has(h): put(h, depth); nx.append(r)
        frontier = nx
    return ball

BALL = build_ball(D)


def exact_distance(state, L):
    """Proposition 2: exact state depth of a length-L scramble (bipartite QTM)."""
    h = hash(state); d0 = BALL.get(h)
    if d0 is not None:
        return d0
    r = max(0, L - 2 - D)            # = max(0, L-6)
    if r == 0:
        return L
    seen = {h}; frontier = [state]; best = None
    for _j in range(1, r + 1):
        nx = []
        for s in frontier:
            for t in TABS:
                rr = s.translate(t); hh = hash(rr)
                if hh in seen:
                    continue
                seen.add(hh); e = BALL.get(hh)
                if e is not None:
                    c = _j + e
                    if best is None or c < best: best = c
                else:
                    nx.append(rr)
        frontier = nx
    return best if (best is not None and best < L) else L


def sample_move(prev, model):
    while True:
        i = random.randrange(G)
        if prev is None or model == "iid":
            return i
        if model == "nii" and i == INV[prev]:
            continue
        if model == "nsf" and FACET[i] == FACET[prev]:
            continue
        return i


def wilson(p, n, z=1.96):
    if n == 0:
        return [p, p]
    den = 1 + z * z / n; c = (p + z * z / (2 * n)) / den
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return [round(c - half, 5), round(c + half, 5)]


def run(model, L, M_samples, seed):
    random.seed(seed); sd = sd2 = 0.0; red = 0; dd = {}
    for _ in range(M_samples):
        s = IDENT; prev = None
        for _ in range(L):
            i = sample_move(prev, model); s = s.translate(TABS[i]); prev = i
        d = exact_distance(s, L); sd += d; sd2 += d * d
        if d < L: red += 1
        dd[d] = dd.get(d, 0) + 1
    mean = sd / M_samples
    se = math.sqrt(max(0.0, sd2 / M_samples - mean * mean) / M_samples)
    p = red / M_samples
    return dict(model=model, L=L, M=M_samples, mean=round(mean, 4), se=round(se, 4),
                eff=round(mean / L, 4), red=round(p, 5), red_wilson=wilson(p, M_samples),
                counts={str(k): dd[k] for k in sorted(dd)})


def main(quick=False):
    print("ball<=4:", len(BALL))
    if quick:
        plan = [("iid", L, 20000) for L in range(1, 8)] + \
               [("iid", 8, 4000), ("iid", 9, 400)] + \
               [(m, L, 20000) for L in range(2, 8) for m in ("nii", "nsf")]
    else:
        plan = [("iid", L, 200000) for L in range(1, 8)] + \
               [("iid", 8, 30000), ("iid", 9, 2200)] + \
               [(m, L, 100000) for L in range(2, 8) for m in ("nii", "nsf")] + \
               [(m, L, 12000) for L in (8,) for m in ("nii", "nsf")] + \
               [(m, L, 1200) for L in (9,) for m in ("nii", "nsf")]
    res = {}
    for model, L, Ms in plan:
        t0 = time.perf_counter()
        r = run(model, L, Ms, 20260608 + L * 7 + (hash(model) % 97))
        fo = L - (L - 1) / 24
        print("%-4s L=%d M=%-6d E[d]=%.4f eff=%.4f P(d<L)=%.5f 1st=%.4f (%.1fs)"
              % (model, L, Ms, r["mean"], r["eff"], r["red"], fo, time.perf_counter() - t0))
        res.setdefault(model, {})[str(L)] = r
    json.dump(res, open(os.path.join(RES, "scramble.json"), "w"), indent=1)
    print("wrote results/scramble.json")


if __name__ == "__main__":
    main(quick="--quick" in sys.argv)
