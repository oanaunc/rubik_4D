import time, random, sys, numpy as np
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
t0=time.perf_counter()
ball={ident:0}; fr=[ident]
for depth in range(1,R+1):
    nx=[]; has=ball.__contains__; put=ball.__setitem__
    for s in fr:
        for t in H:
            r=s.translate(t)
            if not has(r): put(r,depth); nx.append(r)
    fr=nx
print("B3",len(ball),"built %.1fs"%(time.perf_counter()-t0),flush=True)
VT=np.dtype((np.void,216))
ball_keys=np.frombuffer(b''.join(ball.keys()),dtype=np.uint8).reshape(-1,216)
ball_void=np.ascontiguousarray(ball_keys).view(VT).ravel()
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
def dist_np(arr,L):
    d0=ball.get(arr.tobytes())
    if d0 is not None: return d0
    r=L-R
    seen_void=np.ascontiguousarray(arr.reshape(1,216)).view(VT).ravel()
    frontier=arr.reshape(1,216); best=None
    for j in range(1,r+1):
        cand=frontier[:,MT].reshape(-1,216)
        cand_void=np.ascontiguousarray(cand).view(VT).ravel()
        cand_u=np.unique(cand_void)
        new=cand_u[~np.isin(cand_u,seen_void)]
        if new.size==0: break
        hit=new[np.isin(new,ball_void)]
        for k in range(hit.size):
            e=ball[hit[k].tobytes()]; c=j+e
            if best is None or c<best: best=c
        seen_void=np.concatenate([seen_void,new])
        frontier=new.view(np.uint8).reshape(-1,216)
    return best if best is not None else L
for L,n in ((4,3000),(5,2000)):
    random.seed(7); mism=0
    for _ in range(n):
        s=ident
        for _ in range(L): s=s.translate(H[random.randrange(G)])
        arr=np.frombuffer(s,dtype=np.uint8).copy()
        if dist_py(s,L)!=dist_np(arr,L): mism+=1
    print("L=%d n=%d mismatches=%d"%(L,n,mism),flush=True)
# timing of numpy at L=6
random.seed(9); n=400; t0=time.perf_counter(); sd=0
for _ in range(n):
    s=ident
    for _ in range(6): s=s.translate(H[random.randrange(G)])
    sd+=dist_np(np.frombuffer(s,dtype=np.uint8).copy(),6)
dt=time.perf_counter()-t0
print("L=6 numpy n=%d E[d]=%.3f  %.2fs  %.4f/s"%(n,sd/n,dt,dt/n),flush=True)
