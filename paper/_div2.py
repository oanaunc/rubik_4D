import time, random, math, json, sys
import model_4d as M
TABS, IDENT = M.move_tables()
G=len(TABS); INV=M.inverse_index(); FACET=M.facet_index(); R=4
def build_ball(R=4):
    ball={IDENT:0}; fr=[IDENT]
    for depth in range(1,R+1):
        nx=[]; has=ball.__contains__; put=ball.__setitem__
        for s in fr:
            for t in TABS:
                r=s.translate(t)
                if not has(r): put(r,depth); nx.append(r)
        fr=nx
    return ball
BALL=build_ball(4)
def exact_distance(state,L):
    d0=BALL.get(state)
    if d0 is not None: return d0
    r=max(0,L-2-R)
    if r==0: return L
    seen={state}; fr=[state]; best=None
    for _j in range(1,r+1):
        nx=[]
        for s in fr:
            for t in TABS:
                rr=s.translate(t)
                if rr in seen: continue
                seen.add(rr); e=BALL.get(rr)
                if e is not None:
                    c=_j+e
                    if best is None or c<best: best=c
                else: nx.append(rr)
        fr=nx
    return best if (best is not None and best<L) else L
from collections import defaultdict, Counter
def ccount(p): return sum(1 for c in p if c!=0)
piece_stickers=defaultdict(list)
for idx,(p,axis) in enumerate(M.stickers): piece_stickers[p].append(idx)
orbit_pieces={2:[],3:[],4:[]}
for p,idxs in piece_stickers.items():
    o=ccount(p)
    if o in (2,3,4): orbit_pieces[o].append(idxs)
def sample_move(prev,model):
    while True:
        i=random.randrange(G)
        if prev is None or model=="iid": return i
        if model=="nii" and i==INV[prev]: continue
        if model=="nsf" and FACET[i]==FACET[prev]: continue
        return i
def run_div(model, target, n_accept, seed):
    random.seed(seed); accepted=0; draws=0; states=set(); dup=0
    d2=[];d3=[];d4=[];dt=[]; sigs=Counter()
    op2,op3,op4=orbit_pieces[2],orbit_pieces[3],orbit_pieces[4]
    while accepted<n_accept:
        s=IDENT; prev=None
        for _ in range(target):
            i=sample_move(prev,model); s=s.translate(TABS[i]); prev=i
        draws+=1
        if exact_distance(s,target)!=target: continue
        accepted+=1
        if s in states: dup+=1
        else: states.add(s)
        n2=sum(1 for idxs in op2 if any(s[i]!=i for i in idxs))
        n3=sum(1 for idxs in op3 if any(s[i]!=i for i in idxs))
        n4=sum(1 for idxs in op4 if any(s[i]!=i for i in idxs))
        d2.append(n2);d3.append(n3);d4.append(n4)
        dt.append(sum(1 for i in range(216) if s[i]!=i)); sigs[(n2,n3,n4)]+=1
    def st(a): return dict(mean=round(sum(a)/len(a),2),min=min(a),max=max(a))
    N=accepted; H=-sum((c/N)*math.log2(c/N) for c in sigs.values())
    return dict(model=model,accepted=accepted,draws=draws,accept_rate=round(accepted/draws,4),
        duplicates=dup,unique=len(states),disp2=st(d2),disp3=st(d3),disp4=st(d4),
        disp_total=st(dt),distinct_signatures=len(sigs),signature_entropy_bits=round(H,2),
        effective_support=round(2**H,1))
N=int(sys.argv[1]) if len(sys.argv)>1 else 10000
out={}
for model,seed in (("nii",7),("nsf",8),("iid",9)):
    t0=time.perf_counter(); out[model]=run_div(model,7,N,seed)
    out[model]["seconds"]=round(time.perf_counter()-t0,1)
    print(model, out[model]["seconds"],"s",flush=True)
json.dump(out, open('/tmp/diversity_result.json','w'), indent=1)
print(json.dumps(out,indent=1))
