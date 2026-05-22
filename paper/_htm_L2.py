import model_4d as M

def htm_gens():
    tabs, ident = M.move_tables()
    def compose(t): return bytes(t[t[i]] for i in range(256))
    halves, seen = [], set()
    for t in tabs:
        h2 = compose(t)
        if h2 != ident and h2 not in seen:
            seen.add(h2); halves.append(h2)
    return tabs + halves, ident

H, ident = htm_gens()
G = len(H)
print("HTM generators:", G)

# depth-1 set = the G generators applied to solved (the single-move states)
depth1 = {}
for i,t in enumerate(H):
    s = ident.translate(t)
    depth1[s] = i
print("distinct depth-1 states:", len(depth1))

# enumerate all G*G ordered pairs
from collections import Counter
cnt = Counter()
d0_pairs=[]; d1_pairs=[]
for i in range(G):
    a = ident.translate(H[i])
    for j in range(G):
        prod = a.translate(H[j])
        if prod == ident:
            cnt[0]+=1
        elif prod in depth1:
            cnt[1]+=1
        else:
            cnt[2]+=1
total = G*G
print("total ordered pairs:", total)
for d in (0,1,2):
    print("depth %d: %d  (%.4f)" % (d, cnt[d], cnt[d]/total))
Ed = sum(d*c for d,c in cnt.items())/total
print("E[d] exact L=2 =", round(Ed,4))
print("P(d<2) exact =", round((cnt[0]+cnt[1])/total,4))
print("efficiency =", round(Ed/2,4))
print("inverse-only baseline L-(L-1)/36 =", round(2-1/36,4))
