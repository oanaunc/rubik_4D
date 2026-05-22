"""
Half-turn-metric (HTM) i.i.d. scramble bias (Section V-D, Table IX), certified by
Proposition 3 (no parity invariant: search radius r = L - R).

HTM = 48 quarter-turns + 24 half-turns (72 generators).  Each quarter-turn has a
distinct inverse; each half-turn is its own inverse, so the immediate-inverse
probability is 1/72 and the inverse-only baseline is L - (L-1)/36.  Measured E[d]
falls BELOW this baseline because two equal quarter-turns compose to one half-turn
(a depth-1 relation the inverse-only count ignores).

The R=4 HTM ball (12.6M states) is held as a 64-bit-hash -> depth dict; the final
BFS level is added without storing states to bound memory.
"""
import sys, time, random, json, os
import model_4d as M

HERE = os.path.dirname(__file__); RES = os.path.join(HERE, "results")
os.makedirs(RES, exist_ok=True)


def htm_gens():
    tabs, ident = M.move_tables()
    def compose(t): return bytes(t[t[i]] for i in range(256))
    halves, seen = [], set()
    for t in tabs:
        h2 = compose(t)
        if h2 != ident and h2 not in seen:
            seen.add(h2); halves.append(h2)
    return tabs + halves, ident


def build_htm_ball(H, ident, R=4):
    ball = {hash(ident): 0}; fr = [ident]
    for depth in range(1, R + 1):
        has = ball.__contains__; put = ball.__setitem__
        if depth < R:
            nx = []
            for s in fr:
                for t in H:
                    r = s.translate(t); h = hash(r)
                    if not has(h): put(h, depth); nx.append(r)
            fr = nx
        else:                                  # final level: count into dict, don't store
            for s in fr:
                for t in H:
                    h = hash(s.translate(t))
                    if not has(h): put(h, depth)
    return ball


def main(quick=False):
    H, ident = htm_gens(); G = len(H); R = 4
    print("HTM generators:", G)
    t0 = time.perf_counter()
    ball = build_htm_ball(H, ident, R)
    print("HTM ball<=%d: %d states (%.1fs)" % (R, len(ball), time.perf_counter() - t0))

    def dist_htm(state, L):                    # Proposition 3
        h = hash(state); d0 = ball.get(h)
        if d0 is not None:
            return d0
        r = L - R; seen = {h}; fr = [state]; best = None
        for j in range(1, r + 1):
            nx = []
            for s in fr:
                for t in H:
                    rr = s.translate(t); hh = hash(rr)
                    if hh in seen: continue
                    seen.add(hh); e = ball.get(hh)
                    if e is not None:
                        c = j + e
                        if best is None or c < best: best = c
                    else:
                        nx.append(rr)
            fr = nx
        return best if best is not None else L

    random.seed(101); out = []
    sizes = {2: 5000, 3: 5000, 4: 4000, 5: 3000, 6: 1500} if quick else \
            {2: 200000, 3: 150000, 4: 80000, 5: 30000, 6: 6000}
    for L in (2, 3, 4, 5, 6):
        Ms = sizes[L]; sd = 0; red = 0; t1 = time.perf_counter()
        for _ in range(Ms):
            s = ident
            for _ in range(L): s = s.translate(H[random.randrange(G)])
            d = dist_htm(s, L); sd += d
            if d < L: red += 1
        mean = sd / Ms; fo = L - (L - 1) / 36
        out.append(dict(L=L, M=Ms, mean=round(mean, 4), eff=round(mean / L, 4),
                        red=round(red / Ms, 4), inverse_only=round(fo, 4)))
        print("HTM L=%d M=%d E[d]=%.4f eff=%.4f P(d<L)=%.4f baseline=%.4f (%.1fs)"
              % (L, Ms, mean, mean / L, red / Ms, fo, time.perf_counter() - t1))
    json.dump(out, open(os.path.join(RES, "htm_scramble.json"), "w"), indent=1)
    print("wrote results/htm_scramble.json")


if __name__ == "__main__":
    main(quick="--quick" in sys.argv)
