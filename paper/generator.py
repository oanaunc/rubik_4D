"""
Depth-targeted game-instance generator (Section VI): accuracy, policy ablation,
diversity, and operational cost.

Reproduces:
  Table X    per-target accuracy (one-draw hit, MAE) for naive i.i.d. vs NII
  Table XI   policy ablation (iid / NII / NSF) averaged over d*=2..9
  Sec VI-B   diversity of accepted depth-7 NII instances
  Table XII  per-instance certification latency (mean + p95) by L

Accuracy/ablation are derived from the exact depth distributions in
results/scramble.json (run certify.py first).  Diversity and latency are measured
directly here using certify.exact_distance.
"""
import sys, time, random, json, os, statistics, collections
import certify as C
import model_4d as M

HERE = os.path.dirname(__file__); RES = os.path.join(HERE, "results")
os.makedirs(RES, exist_ok=True)


def accuracy_and_ablation():
    res = json.load(open(os.path.join(RES, "scramble.json")))
    def metrics(model, L, dstar):
        r = res[model][str(L)]; Ms = r["M"]; c = {int(k): v for k, v in r["counts"].items()}
        mae = sum(abs(k - dstar) * v for k, v in c.items()) / Ms
        hit = c.get(dstar, 0) / Ms
        return mae, hit
    Lmax = max(int(k) for k in res["iid"])
    table_x = []
    for d in range(2, min(Lmax, 9) + 1):
        nm, nh = metrics("iid", d, d); rm, rh = metrics("nii", d, d) if str(d) in res.get("nii", {}) else (None, None)
        table_x.append(dict(dstar=d, naive_mae=round(nm, 3), naive_hit=round(nh, 3),
                            nii_mae=None if rm is None else round(rm, 3),
                            nii_hit=None if rh is None else round(rh, 3),
                            draws=None if not rh else round(1 / rh, 3)))
    abl = {}
    drange = [d for d in range(2, min(Lmax, 9) + 1)]
    for model in ("iid", "nii", "nsf"):
        if model not in res: continue
        ds = [d for d in drange if str(d) in res[model]]
        hits = [metrics(model, d, d)[1] for d in ds]
        maes = [metrics(model, d, d)[0] for d in ds]
        abl[model] = dict(hit=round(statistics.mean(hits), 3), mae=round(statistics.mean(maes), 3),
                          draws=round(statistics.mean(1 / h for h in hits), 3))
    return table_x, abl


def diversity(target=7, n_accept=100000, quick=False, seed=77):
    if quick: n_accept = 5000
    tabs, ident = C.TABS, C.IDENT; G = C.G; inv = C.INV
    random.seed(seed); acc = 0; draws = 0
    mult = collections.Counter(); disp = []
    while acc < n_accept:
        s = ident; prev = None
        for _ in range(target):
            while True:
                i = random.randrange(G)
                if prev is None or i != inv[prev]: break
            s = s.translate(tabs[i]); prev = i
        draws += 1
        if C.exact_distance(s, target) == target:
            acc += 1; mult[s] += 1
            disp.append(sum(1 for k in range(M.N) if s[k] != k))
    return dict(target_depth=target, accepted=acc, draws=draws, accept_rate=round(acc / draws, 3),
                unique=len(mult), unique_frac=round(len(mult) / acc, 5),
                max_multiplicity=max(mult.values()),
                displaced_mean=round(statistics.mean(disp), 1),
                displaced_min=min(disp), displaced_max=max(disp))


def latency(quick=False, seed=7):
    random.seed(seed); out = {}
    sizes = {2: 2000, 3: 2000, 4: 2000, 5: 2000, 6: 2000, 7: 1000, 8: 400, 9: 30} if quick else \
            {2: 5000, 3: 5000, 4: 5000, 5: 5000, 6: 5000, 7: 3000, 8: 1500, 9: 120}
    for L in range(2, 10):
        states = []
        for _ in range(sizes[L]):
            s = C.IDENT
            for _ in range(L): s = s.translate(C.TABS[random.randrange(C.G)])
            states.append(s)
        ts = []
        for s in states:
            t1 = time.perf_counter(); C.exact_distance(s, L); ts.append((time.perf_counter() - t1) * 1e6)
        ts.sort(); out[L] = dict(mean_us=round(statistics.mean(ts), 1),
                                 p95_us=round(ts[int(0.95 * len(ts)) - 1], 1), n=sizes[L])
        print("L=%d mean=%.1f us p95=%.1f us" % (L, out[L]["mean_us"], out[L]["p95_us"]))
    return out


def main(quick=False):
    print("ball<=4:", len(C.BALL))
    out = {}
    if os.path.exists(os.path.join(RES, "scramble.json")):
        tx, abl = accuracy_and_ablation(); out["table_x"] = tx; out["ablation"] = abl
        print("ablation (avg d*=2..9):", abl)
    else:
        print("(run certify.py first for accuracy/ablation)")
    print("diversity (depth-7 NII):")
    out["diversity"] = diversity(quick=quick); print(" ", out["diversity"])
    print("latency (per-instance certification):")
    out["latency"] = latency(quick=quick)
    json.dump(out, open(os.path.join(RES, "generator.json"), "w"), indent=1)
    print("wrote results/generator.json")


if __name__ == "__main__":
    main(quick="--quick" in sys.argv)
