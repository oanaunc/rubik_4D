import sys, time, random, math, json, numpy as np
import model_4d as M
def htm_gens():
    tabs,ident=M.move_tables()
    def comp(t): return bytes(t[t[i]] for i in range(256))
    halves,seen=[],set()
    for t in tabs:
        h2=comp(t)
        if h2!=ident and h2 not in seen: seen.add(h2); halves.append(h2)
    return tabs+halves, ident
H,ident=htm_gens(); G=len(H); R=3
MT=np.array([[t[i] for i in range(216)] for t in H], dtype=np.uint8)
ball={ident:0}; fr=[ident]
for depth in range(1,R+1):
    nx=[]; has=ball.__contains__; put=ball.__setitem__
    for s in fr:
        for t in H:
            r=s.translate(t)
            if not has(r): put(r,depth); nx.append(r)
    fr=nx
VT=np.dtype((np.void,216))
keys=list(ball.keys()); depths=np.array([ball[k] for k in keys],dtype=np.int16)
bk=np.frombuffer(b''.join(keys),dtype=np.uint8).reshape(-1,216)
bv=np.ascontiguousarray(bk).view(VT).ravel()
order=np.argsort(bv); ball_void=bv[order]; depth_sorted=depths[order]
def dist_np(arr,L):
    d0=ball.get(arr.tobytes())
    if d0 is not None: return d0
    r=L-R
    seen_void=np.ascontiguousarray(arr.reshape(1,216)).view(VT).ravel()
    frontier=arr.reshape(1,216); best=None
    for j in range(1,r+1):
        cand=frontier[:,MT].reshape(-1,216)
        cv=np.ascontiguousarray(cand).view(VT).ravel()
        if j==r:
            idx=np.clip(np.searchsorted(ball_void,cv),0,len(ball_void)-1)
            m=ball_void[idx]==cv
            if m.any():
                c=(j+depth_sorted[idx][m]).min()
                if best is None or c<best: best=int(c)
            break
        cu=np.unique(cv)
        new=cu[~np.isin(cu,seen_void)]
        if new.size==0: break
        idx=np.clip(np.searchsorted(ball_void,new),0,len(ball_void)-1)
        m=ball_void[idx]==new
        if m.any():
            c=(j+depth_sorted[idx][m]).min()
            if best is None or c<best: best=int(c)
        seen_void=np.concatenate([seen_void,new])
        frontier=new.view(np.uint8).reshape(-1,216)
    return best if best is not None else L
# pure python reference
def dist_py(state,L):
    d0=ball.get(state)
    if d0 is not None: return d0
    r=L-R; seen={state}; frr=[state]; best=None
    for j in range(1,r+1):
        nx=[]
        for s in frr:
            for t in H:
                rr=s.translate(t)
                if rr in seen: continue
                seen.add(rr); e=ball.get(rr)
                if e is not None:
                    c=j+e
                    if best is None or c<best: best=c
                else: nx.append(rr)
        frr=nx
    return best if best is not None else L
if "--validate" in sys.argv:
    for L,n in ((5,800),(6,80)):
        random.seed(7); mism=0
        for _ in range(n):
            s=ident
            for _ in range(L): s=s.translate(H[random.randrange(G)])
            a=np.frombuffer(s,dtype=np.uint8).copy()
            if dist_py(s,L)!=dist_np(a,L): mism+=1
        print("validate L=%d n=%d mism=%d"%(L,n,mism),flush=True)
    sys.exit()
def wilson(p,n,z=1.96):
    if n==0: return [p,p]
    den=1+z*z/n; c=(p+z*z/(2*n))/den
    h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return [round(c-h,4),round(c+h,4)]
L=int(sys.argv[1]); Ms=int(sys.argv[2])
random.seed(1000+L); sd=sd2=0.0; red=0; t0=time.perf_counter()
for _ in range(Ms):
    s=ident
    for _ in range(L): s=s.translate(H[random.randrange(G)])
    d=dist_np(np.frombuffer(s,dtype=np.uint8).copy(),L); sd+=d; sd2+=d*d
    if d<L: red+=1
mean=sd/Ms; se=math.sqrt(max(0.,sd2/Ms-mean*mean)/Ms); p=red/Ms
out=dict(L=L,M=Ms,R=R,method="numpy",mean=round(mean,4),se=round(se,4),eff=round(mean/L,4),
    red=round(p,4),red_wilson=wilson(p,Ms),inverse_only=round(L-(L-1)/36,4),seconds=round(time.perf_counter()-t0,1))
json.dump(out,open("/tmp/htm_L%d.json"%L,"w"),indent=1); print(json.dumps(out),flush=True)
