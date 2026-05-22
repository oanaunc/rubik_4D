import time, random, numpy as np
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
# move-table as index arrays (72,216): applying move = state[MT[m]]
MT=np.array([[t[i] for i in range(216)] for t in H], dtype=np.uint8)
identarr=np.frombuffer(ident,dtype=np.uint8).copy()
# complete-key B3
ball={ident:0}; fr=[ident]
for depth in range(1,R+1):
    nx=[]; has=ball.__contains__; put=ball.__setitem__
    for s in fr:
        for t in H:
            r=s.translate(t)
            if not has(r): put(r,depth); nx.append(r)
    fr=nx
print("B3",len(ball))
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
    key=arr.tobytes()
    d0=ball.get(key)
    if d0 is not None: return d0
    r=L-R
    seen_void=np.ascontiguousarray(arr.reshape(1,216)).view(VT).ravel()
    frontier=arr.reshape(1,216)
    best=None
    for j in range(1,r+1):
        cand=frontier[:,MT].reshape(-1,216)              # (k*72,216)
        cand_void=np.ascontiguousarray(cand).view(VT).ravel()
        cand_u=np.unique(cand_void)
        new=cand_u[~np.isin(cand_u,seen_void)]
        if new.size==0: break
        hit=new[np.isin(new,ball_void)]
        for h in hit.tobytes() and []:
            pass
        if hit.size:
            for k in range(hit.size):
                e=ball[hit[k].tobytes()]; c=j+e
                if best is None or c<best: best=c
        seen_void=np.concatenate([seen_void,new])
        frontier=new.view(np.uint8).reshape(-1,216)
    return best if best is not None else L

# validate on identical samples
random.seed(123)
mism=0; n=70; L=6
t_py=t_np=0
for _ in range(n):
    s=ident
    for _ in range(L): s=s.translate(H[random.randrange(G)])
    arr=np.frombuffer(s,dtype=np.uint8).copy()
    t0=time.perf_counter(); dp=dist_py(s,L); t_py+=time.perf_counter()-t0
    t0=time.perf_counter(); dn=dist_np(arr,L); t_np+=time.perf_counter()-t0
    if dp!=dn: mism+=1; print("MISMATCH",dp,dn)
print("L=6 n=%d mismatches=%d  py %.2fs (%.4f/s)  np %.2fs (%.4f/s)"%(n,mism,t_py,t_py/n,t_np,t_np/n))
