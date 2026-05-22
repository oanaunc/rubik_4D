"""
Decomposition of the i.i.d. scramble-bias deficit into a free-cancellation term
and a puzzle-relation remainder (Section V-B, Table V), with the ordinary-cube
corroboration.

The free-reduction expectation E[l_red | L] is computed EXACTLY (no Monte Carlo)
from the reduced-length birth-death chain over a free group with `gens` generators
(24 inverse pairs => down-probability 1/gens, up 1-1/gens, forced 0->1):

    p_{t+1}(0) = (1/g) p_t(1)
    p_{t+1}(1) = p_t(0) + (1/g) p_t(2)
    p_{t+1}(k) = (1-1/g) p_t(k-1) + (1/g) p_t(k+1)   (k>=2)
    E[l_red|L] = sum_k k p_L(k)

The total deficit L-E[d] uses certified depths from certify.py (results/scramble.json
for 4D); the cube row recomputes E[d] directly from a small cube ball.
"""
import json, os, random
from fractions import Fraction
import model_3d as M3

HERE = os.path.dirname(__file__); RES = os.path.join(HERE, "results")
os.makedirs(RES, exist_ok=True)


def E_lred_exact(L, gens):
    q = Fraction(1, gens); p = 1 - q
    v = {0: Fraction(1)}
    for _ in range(L):
        nv = {}
        for m, pr in v.items():
            if m == 0:
                nv[1] = nv.get(1, Fraction(0)) + pr
            else:
                nv[m - 1] = nv.get(m - 1, Fraction(0)) + pr * q
                nv[m + 1] = nv.get(m + 1, Fraction(0)) + pr * p
        v = nv
    return float(sum(Fraction(m) * pr for m, pr in v.items()))


def cube_bias(Lmax=7, M=200000, seed=11):
    """E[d], E[l_red], decomposition on the 3x3x3 cube (QTM, 12 gens)."""
    t3, id3 = M3.move_tables(); G = len(t3); inv = M3.inverse_index()
    ball = {hash(id3): 0}; fr = [id3]
    for depth in range(1, 6):                       # R=5 ball; L<=7 exact by lookup-or-parity
        nx = []; has = ball.__contains__; put = ball.__setitem__
        for s in fr:
            for t in t3:
                r = s.translate(t); h = hash(r)
                if not has(h): put(h, depth); nx.append(r)
        fr = nx
    def dist(state, L):
        d = ball.get(hash(state)); return d if d is not None else L
    def free_len(seq):
        st = []
        for i in seq:
            if st and st[-1] == inv[i]: st.pop()
            else: st.append(i)
        return len(st)
    random.seed(seed); rows = []
    for L in range(2, Lmax + 1):
        sd = sl = 0
        for _ in range(M):
            s = id3; seq = []
            for _ in range(L):
                i = random.randrange(G); seq.append(i); s = s.translate(t3[i])
            sd += dist(s, L); sl += free_len(seq)
        Ed = sd / M; El = E_lred_exact(L, G); tot = L - Ed; free = L - El
        rows.append(dict(L=L, Ed=round(Ed, 4), Elred=round(El, 4),
                         total=round(tot, 4), free=round(free, 4),
                         relations=round(El - Ed, 4), frac=round(free / tot, 3)))
    return rows


def main():
    # 4D decomposition: free term exact (48 gens); total from certified depths.
    out = {"free_exact_4d": {}, "decomposition_4d": [], "cube": []}
    for L in range(2, 10):
        out["free_exact_4d"][L] = round(E_lred_exact(L, 48), 6)
    sc = os.path.join(RES, "scramble.json")
    if os.path.exists(sc):
        res = json.load(open(sc))
        print("4D decomposition (free term exact, total from certified E[d]):")
        print(" L | total | free | relations | %free")
        for L in range(2, 10):
            if str(L) not in res.get("iid", {}):
                continue
            Ed = res["iid"][str(L)]["mean"]; El = E_lred_exact(L, 48)
            tot = L - Ed; free = L - El
            row = dict(L=L, total=round(tot, 4), free=round(free, 4),
                       relations=round(El - Ed, 4), frac=round(free / tot, 3) if tot else 0)
            out["decomposition_4d"].append(row)
            print("%2d | %.4f | %.4f | %.4f | %.0f%%" % (L, tot, free, El - Ed, 100 * row["frac"]))
    else:
        print("(run certify.py first to fill the 4D decomposition)")

    print("\n3x3x3 corroboration (QTM, 12 gens):")
    print(" L | total | free | relations | %free")
    out["cube"] = cube_bias()
    for r in out["cube"]:
        print("%2d | %.4f | %.4f | %.4f | %.0f%%" % (r["L"], r["total"], r["free"], r["relations"], 100 * r["frac"]))
    json.dump(out, open(os.path.join(RES, "decomposition.json"), "w"), indent=1)
    print("wrote results/decomposition.json")


if __name__ == "__main__":
    main()
