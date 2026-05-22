"""
Configuration-group order |G| of the 3^4 hypercube (Section III-A, Table I).

  |G| = (24!*32!/2)(16!/2) * 2^23 * (3!)^31 * 3 * (4!/2)^15 * 4  ~= 1.76e120

This matches Velleman (1992) and Green; an independent GAP Schreier-Sims check is in
verification/.  Writes the exact 121-digit integer to results/group_order.txt.
"""
import math, os

def group_order():
    return ((math.factorial(24) * math.factorial(32) // 2)
            * (math.factorial(16) // 2)
            * (2 ** 23)
            * ((math.factorial(3) ** 31) * 3)
            * ((math.factorial(4) // 2) ** 15 * 4))

if __name__ == "__main__":
    G = group_order()
    print("|G| =", G)
    print("digits:", len(str(G)), " log10:", round(math.log10(G), 3))
    os.makedirs(os.path.join(os.path.dirname(__file__), "results"), exist_ok=True)
    with open(os.path.join(os.path.dirname(__file__), "results", "group_order.txt"), "w") as f:
        f.write(str(G) + "\n")
    print("wrote results/group_order.txt")
