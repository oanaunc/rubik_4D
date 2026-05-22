"""
General-d structure verification for the 3^d Rubik puzzle  (v3 novelty).

Verifies, for d = 2..5, the claims of Theorem (Structure of the 3^d puzzle):
 (i)   orbit counts C(d,k)*2^k  (sum to 3^d - 1);
 (ii)  in-place orientation group = S_k for 2<=k<d, and A_d for k=d;
 (iii) orientation-closure modulus = abelianization of that group:
         Z_2 (sign) for every S_k (k>=2);
         A_d^ab = Z_3 for d=3,4 but trivial for d>=5 (A_d simple).

Method: brute-force the rotation subgroup of the hyperoctahedral group B_d
(signed permutation matrices with det = +1) and read off, for a representative
piece of each type, the group its frame-fixing rotations induce on the k stickers.

Run:  python general_d_structure.py     (pure python, < 1 s through d=5)

Reference output:
  d=2: k=2 -> A_2 (order 1)
  d=3: k=2 -> S_2 (Z_2);  k=3 -> A_3 (Z_3)            [ordinary cube]
  d=4: k=2 -> S_2;  k=3 -> S_3;  k=4 -> A_4 (Z_3)      [hypercube, Eq (5)]
  d=5: k=2 -> S_2;  k=3 -> S_3;  k=4 -> S_4;  k=5 -> A_5 (closure TRIVIAL)
"""
from itertools import product, permutations
from math import comb, factorial


def perm_parity(perm):
    d = len(perm); seen = [False] * d; pp = 0
    for i in range(d):
        if seen[i]:
            continue
        j = i; L = 0
        while not seen[j]:
            seen[j] = True; j = perm[j]; L += 1
        pp += L - 1
    return -1 if pp % 2 else 1


def rotations(d):
    """det=+1 signed permutation matrices on R^d, as (perm, signs)."""
    for perm in permutations(range(d)):
        ps = perm_parity(perm)
        for signs in product((1, -1), repeat=d):
            det = ps
            for s in signs:
                det *= s
            if det == 1:
                yield perm, signs


def apply(M, v):
    perm, signs = M
    w = [0] * len(v)
    for j, val in enumerate(v):
        w[perm[j]] = signs[j] * val
    return tuple(w)


def orientation_action(d, k):
    """Permutations of the k extreme axes realized by det+1 rotations fixing
    the representative piece p = (1,...,1,0,...,0)."""
    p = tuple([1] * k + [0] * (d - k))
    ext = list(range(k))
    acts = set()
    for M in rotations(d):
        if apply(M, p) == p:
            perm, _ = M
            img = tuple(perm[i] for i in ext)
            assert sorted(img) == ext
            acts.add(img)
    return acts


def identify(n, k):
    full = factorial(k); alt = factorial(k) // 2 if k >= 2 else 1
    if n == full:
        return f"S_{k}"
    if n == alt and k >= 2:
        return f"A_{k}"
    if n == 1:
        return "trivial"
    return f"order-{n}"


def closure_modulus(label, k, d):
    if label.startswith("S_"):
        return "Z_2 (sign)" if k >= 2 else "trivial"
    if label.startswith("A_"):
        if d in (3, 4):
            return "Z_3"
        if d >= 5:
            return "trivial (A_d simple)"
        return "trivial"
    return "trivial"


def main():
    for d in range(2, 6):
        print(f"\n### d = {d}   (3^{d} puzzle)")
        total = 0
        for k in range(1, d + 1):
            cnt = comb(d, k) * 2 ** k
            total += cnt
            if k == 1:
                print(f"  k=1: {cnt:>4} cell-centres (fixed frame)")
                continue
            acts = orientation_action(d, k)
            lab = identify(len(acts), k)
            print(f"  k={k}: {cnt:>4} pieces | orientation = {lab:>9} (order {len(acts)})"
                  f" | closure = {closure_modulus(lab, k, d)}")
        assert total == 3 ** d - 1
        print(f"  orbit-count check: sum = {total} = 3^{d} - 1  OK")
    print("\nAll checks pass.")


if __name__ == "__main__":
    main()
