import model_4d as M
from collections import Counter
# two-colour pieces = ccount 2
def cc(p): return sum(1 for c in p if c!=0)
twoC=[p for p in M.pieces if cc(p)==2]
idx2={p:i for i,p in enumerate(twoC)}
# pick a generator: facet axis a=0 sign s=+1, plane (b,c)=(1,2), dir +1
lab=(0,+1,1,2,+1)
gp=M.piece_perm(*lab)  # permutation on all pieces (len 80)
# restrict to two-colour pieces, find cycle structure
# map piece index in full -> vector
fullpieces=M.pieces
# build permutation on twoC by following
moved={}
for p in twoC:
    k=M.piece_index[p]
    img=fullpieces[gp(k)]
    if img!=p:
        moved[p]=img
print("generator",lab)
print("num two-colour pieces moved:",len(moved))
# trace cycles among moved
seen=set(); cycles=[]
for p in moved:
    if p in seen: continue
    cyc=[p]; seen.add(p); q=moved[p]
    while q!=p:
        cyc.append(q); seen.add(q); q=moved[q]
    cycles.append(cyc)
for c in cycles:
    print("cycle len",len(c),":",c)
# cycle type over all 24
ct=Counter()
allseen=set(); 
def perm_on_twoC(p):
    return fullpieces[gp(M.piece_index[p])]
seen2=set()
for p in twoC:
    if p in seen2: continue
    l=0; q=p
    while q not in seen2:
        seen2.add(q); q=perm_on_twoC(q); l+=1
    ct[l]+=1
print("cycle type (len:count):",dict(ct))
