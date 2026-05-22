import model_4d as M
tabs, ident = M.move_tables()
def compose(t): return bytes(t[t[i]] for i in range(256))
halves, seen = [], set()
for t in tabs:
    h2 = compose(t)
    if h2 != ident and h2 not in seen:
        seen.add(h2); halves.append(h2)
H = tabs + halves
typ = ['q']*len(tabs) + ['h']*len(halves)  # 48 quarter, 24 half
G=len(H)
depth1={ident.translate(H[i]):i for i in range(G)}
from collections import Counter
brk=Counter()
for i in range(G):
    a=ident.translate(H[i])
    for j in range(G):
        prod=a.translate(H[j])
        if prod==ident: d=0
        elif prod in depth1: d=1
        else: d=2
        brk[(typ[i],typ[j],d)]+=1
for k in sorted(brk):
    print(k, brk[k])
