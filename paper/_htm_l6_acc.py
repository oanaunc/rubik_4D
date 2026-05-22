import sys, time, random, json, os, math, numpy as np
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
ACC="/tmp/htm_L6_acc.json"
acc=json.load(open(ACC)) if os.path.exists(ACC) else {"n":0,"sd":0.0,"sd2":0.0,"red":0,"seed":5000}
seed=acc["seed"]; random.seed(seed)
batch=int(sys.argv[1]) if len(sys.argv)>1 else 450
t0=time.perf_counter()
for _ in range(batch):
    s=ident
    for _ in range(6): s=s.translate(H[random.randrange(G)])
    d=dist_np(np.frombuffer(s,dtype=np.uint8).copy(),6)
    acc["n"]+=1; acc["sd"]+=d; acc["sd2"]+=d*d
    if d<6: acc["red"]+=1
acc["seed"]=seed+1
json.dump(acc,open(ACC,"w"))
n=acc["n"]; mean=acc["sd"]/n; var=max(0.,acc["sd2"]/n-mean*mean); se=math.sqrt(var/n); p=acc["red"]/n
z=1.96; den=1+z*z/n; c=(p+z*z/(2*n))/den; half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
print("n=%d  E[d]=%.4f±%.4f  eff=%.4f  P(d<6)=%.4f  Wilson[%.4f,%.4f]  (+%d in %.1fs)"%(
  n,mean,se,mean/6,p,c-half,c+half,batch,time.perf_counter()-t0),flush=True)
