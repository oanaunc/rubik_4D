"""
Regenerate the data figures (Figs 2-6) and the Proposition-2 schematic (Fig 3) into
figures/.  Reads results/branching.json and results/scramble.json (run spheres.py
and certify.py first).  Fig. 1 is a pair of simulator screenshots assembled by
make_fig1.py and is committed as figures/fig1_pair.png.
"""
import json, os, math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = os.path.dirname(__file__); RES = os.path.join(HERE, "results"); FIG = os.path.join(HERE, "figures")
os.makedirs(FIG, exist_ok=True)
plt.rcParams.update({"font.size": 13, "font.family": "DejaVu Serif"})
BLUE, RED, GREEN, GOLD = "#1f4e9c", "#b22222", "#2e8b3d", "#d4a017"


def fig2_branching():
    qN = [1, 48, 1864, 70752, 2675260, 101069376]
    hN = [1, 72, 4108, 228168, 12613270]
    qr = [qN[i] / qN[i - 1] for i in range(1, len(qN))]
    hr = [hN[i] / hN[i - 1] for i in range(1, len(hN))]
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(range(1, len(qr) + 1), qr, "-o", color=BLUE, label="QTM (48 gens)", lw=2, ms=7)
    ax.plot(range(1, len(hr) + 1), hr, "--s", color=RED, label="HTM (72 gens)", lw=2, ms=7)
    ax.axhline(37.8, ls=":", color=BLUE, lw=1); ax.axhline(55.3, ls=":", color=RED, lw=1)
    ax.set_xlabel("shell depth $d$"); ax.set_ylabel(r"branching $N_d/N_{d-1}$")
    ax.set_xticks(range(1, 6)); ax.legend(frameon=False); fig.tight_layout()
    fig.savefig(os.path.join(FIG, "fig2_branching.png"), dpi=200); plt.close(fig)


def _load_scramble():
    return json.load(open(os.path.join(RES, "scramble.json")))


def fig4_scramble(res):
    Ls = sorted(int(k) for k in res["iid"]); Ed = [res["iid"][str(L)]["mean"] for L in Ls]
    se = [res["iid"][str(L)]["se"] for L in Ls]; law = [L - (L - 1) / 24 for L in Ls]
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(Ls, Ls, "--", color="#999", label="$d=L$", lw=1.6)
    ax.plot(Ls, law, ":", color=GREEN, label=r"$L-\frac{L-1}{24}$ (first-order)", lw=2)
    ax.errorbar(Ls, Ed, yerr=se, fmt="-o", color=BLUE, label=r"$\mathbb{E}[d\,|\,L]$ (exact)", lw=2, ms=6, capsize=3)
    ax.set_xlabel("scramble length $L$"); ax.set_ylabel("true distance $d$")
    ax.set_xticks(Ls); ax.legend(frameon=False, loc="upper left"); fig.tight_layout()
    fig.savefig(os.path.join(FIG, "fig3_scramble.png"), dpi=200); plt.close(fig)


def fig5_distribution(res):
    Ls = sorted(int(k) for k in res["iid"]); maxd = max(Ls)
    mat = np.full((maxd + 1, maxd + 1), np.nan)
    for L in Ls:
        r = res["iid"][str(L)]; Ms = r["M"]
        for k, v in r["counts"].items():
            mat[int(k), L] = v / Ms
    fig, ax = plt.subplots(figsize=(6.2, 4.6))
    im = ax.imshow(mat, origin="lower", cmap=plt.cm.YlGnBu, vmin=0, vmax=1, aspect="auto")
    for L in Ls:
        for k in range(0, maxd + 1):
            v = mat[k, L]
            if not np.isnan(v):
                ax.text(L, k, "%.3f" % v if v >= 0.001 else "<.001", ha="center", va="center",
                        fontsize=7.5, color="white" if v > 0.5 else "#333")
    ax.set_xlabel("scramble length $L$"); ax.set_ylabel("true distance $d$")
    ax.set_xticks(Ls); ax.set_yticks(range(0, maxd + 1))
    ax.set_xlim(0.5, maxd + 0.5); ax.set_ylim(-0.5, maxd + 0.5)
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04); fig.tight_layout()
    fig.savefig(os.path.join(FIG, "fig4_distribution.png"), dpi=200); plt.close(fig)


def fig6_scramblers(res):
    models = [m for m in ("iid", "nii", "nsf") if m in res]
    Ls = [L for L in range(2, 10) if all(str(L) in res[m] for m in models)]
    def eff(m): return [res[m][str(L)]["eff"] for L in Ls]
    fig, ax = plt.subplots(figsize=(6, 4))
    if "nsf" in models: ax.plot(Ls, eff("nsf"), "-^", color=GREEN, label="no same facet", lw=2, ms=7)
    if "nii" in models: ax.plot(Ls, eff("nii"), "-s", color=GOLD, label="no immediate inverse", lw=2, ms=7)
    ax.plot(Ls, eff("iid"), "-o", color=RED, label="i.i.d. uniform", lw=2, ms=7)
    ax.set_xlabel("scramble length $L$"); ax.set_ylabel(r"efficiency $\mathbb{E}[d]/L$")
    ax.set_xticks(Ls); ax.legend(frameon=False, loc="lower left"); fig.tight_layout()
    fig.savefig(os.path.join(FIG, "fig5_scramblers.png"), dpi=200); plt.close(fig)


def fig3_prop2_schematic():
    from matplotlib.patches import Circle
    fig, ax = plt.subplots(figsize=(7.4, 4.2))
    e = np.array([0.0, 0.0]); R = 1.5
    ax.add_patch(Circle(e, R, facecolor="#dbe7f6", edgecolor=BLUE, lw=2))
    ax.plot(*e, "o", color=BLUE, ms=11)
    ax.annotate("solved $e$", e, textcoords="offset points", xytext=(-6, -22), ha="center", color=BLUE, fontsize=12)
    ax.text(0, R * 0.62, "certified ball $B_R$\n(exact $d(y)$ stored)", ha="center", color=BLUE, fontsize=11)
    x = np.array([5.0, 0.35]); r = 1.65
    ax.add_patch(Circle(x, r, facecolor="none", edgecolor=RED, lw=2, ls="--"))
    ax.plot(*x, "s", color=RED, ms=11)
    ax.annotate("scramble $x$  (word length $L$)", x, textcoords="offset points", xytext=(8, 16), ha="left", color=RED, fontsize=12)
    ax.text(x[0] + r * 0.15, x[1] - r * 0.78, "search radius $r=L-R-2$", ha="center", color=RED, fontsize=11)
    y = np.array([1.42, 0.18]); ax.plot(*y, "o", color=GREEN, ms=10)
    ax.annotate("$y\\in B_R$", y, textcoords="offset points", xytext=(2, 12), ha="center", color=GREEN, fontsize=12)
    ax.plot([x[0], y[0]], [x[1], y[1]], color=GREEN, lw=2.2)
    ax.plot([y[0], e[0]], [y[1], e[1]], color=GREEN, lw=2.2, ls=(0, (2, 1.5)))
    ax.text((x[0] + y[0]) / 2 + 0.1, (x[1] + y[1]) / 2 + 0.28, "$\\mathrm{dist}(x,y)\\leq r$", color=GREEN, fontsize=11, ha="center")
    ax.text((y[0] + e[0]) / 2, (y[1] + e[1]) / 2 - 0.34, "$d(y)$ exact", color=GREEN, fontsize=11, ha="center")
    ax.text(3.3, -1.62, "$d(x)=\\min\\{\\,\\min_{y}[\\mathrm{dist}(x,y)+d(y)],\\ L\\,\\}$", ha="center", fontsize=13,
            bbox=dict(boxstyle="round,pad=0.4", fc="#f4f4f4", ec="#999"))
    ax.text(3.3, 1.98, "If no $y\\in B_R$ is met within $r$ shells, bipartiteness forces $d(x)=L$.",
            ha="center", fontsize=10.5, color="#777", style="italic")
    ax.set_xlim(-2, 7.6); ax.set_ylim(-2.2, 2.6); ax.set_aspect("equal"); ax.axis("off")
    fig.savefig(os.path.join(FIG, "fig_prop2.png"), dpi=200, bbox_inches="tight"); plt.close(fig)


if __name__ == "__main__":
    fig2_branching(); fig3_prop2_schematic()
    if os.path.exists(os.path.join(RES, "scramble.json")):
        res = _load_scramble()
        fig4_scramble(res); fig5_distribution(res); fig6_scramblers(res)
    print("wrote figures/ (fig2_branching, fig_prop2, fig3_scramble, fig4_distribution, fig5_scramblers)")
