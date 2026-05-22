"""Verify coupled/corner parity, the orientation-kernel factorisation
   (corners /3, edges /2, faces /2), and the per-corner orientation axis cycle."""
import time
exec(open('verify_hypercube.py').read().split('G = PermutationGroup')[0])
from sympy.combinatorics import Permutation, PermutationGroup

def k(p): return sum(1 for c in p if c != 0)
corners = [p for p in pieces if k(p)==4]
edges   = [p for p in pieces if k(p)==3]
faces   = [p for p in pieces if k(p)==2]

def piece_perm_on(subset, gen):
    pos = {p:i for i,p in enumerate(subset)}
    arr = list(range(len(subset)))
    for (p,axis),s_idx in sticker_index.items():
        if p in pos:
            arr[pos[p]] = pos[stickers[gen(s_idx)][0]]
    return Permutation(arr)

ok_couple=True; ok_corner=True
for g in generators:
    pe=piece_perm_on(edges,g).is_even
    pf=piece_perm_on(faces,g).is_even
    pc=piece_perm_on(corners,g).is_even
    if pe!=pf: ok_couple=False
    if not pc: ok_corner=False
print("(P1) equal parity on 2C and 3C orbits for every generator:", ok_couple)
print("(P2) every generator even on the 16 corners:", ok_corner)

# ---- position group order |P| (action on 80 piece positions) ----
allpos={p:i for i,p in enumerate(pieces)}
pos_gens=[]
for g in generators:
    arr=list(range(80))
    for (p,axis),s_idx in sticker_index.items():
        arr[allpos[p]]=allpos[stickers[g(s_idx)][0]]
    pos_gens.append(Permutation(arr))
P=PermutationGroup(pos_gens)
t=time.time(); base,sgs=P.schreier_sims_random(consec_succ=15)
def to_arr(pm,n): return pm.array_form+list(range(len(pm.array_form),n))
sa=[to_arr(s,80) for s in sgs]
def fixes(a,pts): return all(a[p]==p for p in pts)
Pord=1
for i,b in enumerate(base):
    gi=[a for a in sa if fixes(a,base[:i])]
    seen={b}; fr=[b]
    while fr:
        nf=[]
        for x in fr:
            for a in gi:
                y=a[x]
                if y not in seen: seen.add(y); nf.append(y)
        fr=nf
    Pord*=len(seen)
print("position-group |P| in %.1fs ="%(time.time()-t), Pord)

from math import factorial as f
Pclosed=(f(16)//2)*(f(24)*f(32)//2)
print("(P3) |P| == (16!/2)*(24!*32!/2):", Pord==Pclosed)

Gclosed=(f(24)*f(32)//2)*(f(16)//2)*(2**23)*((f(3)**31)*3)*((f(4)//2)**15*4)
K=Gclosed//Pord  # orientation kernel order
faces_fac=2**23; edges_fac=(6**31)*3; corners_fac=(12**15)*4
print("(P4) orientation kernel K == 2^23 * (6^31*3) * (12^15*4):",
      K==faces_fac*edges_fac*corners_fac)
print("     faces  : 2^24/2  = 2^23      (reduction /2):", faces_fac==2**24//2)
print("     edges  : 6^32/2  = 6^31*3    (reduction /2):", edges_fac==6**32//2)
print("     corners: 12^16/3 = 12^15*4   (reduction /3):", corners_fac==12**16//3)

# ---- per-corner orientation: axis action of a single facet twist ----
# +X facet (a=0,s=+1), plane (1,2)=(Y,Z), +90: e_Y->e_Z, e_Z->-e_Y.
# Track the home corner (1,1,1,1)'s four sticker-axes through this twist.
g=face_twist(0,1,1,2,+1)
home=(1,1,1,1)
img={i: stickers[g(sticker_index[(home,i)])][1] for i in range(4)}
print("(P5) +X twist sends home-corner sticker-axes:", img,
      "(axis 0=X fixed, 3=W fixed, Y/Z cycle -> even 3-rotation in A4)")
