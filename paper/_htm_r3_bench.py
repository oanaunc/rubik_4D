import time, random, json
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
ball={ident:0}; fr=[ident]
for depth in range(1,R+1):
    nx=[]; has=ball.__contains__; put=ball.__setitem__
    for s in fr:
        for t in H:
            r=s.translate(t)
            if not has(r): put(r,depth); nx.append(r)
    fr=nx
print("complete-key B3:",len(ball))
def dist(state,L):
    d0=ball.get(state)
    if d0 is not None: return d0
    r=L-R; seen={state}; fr=[state]; best=None
    for j in range(1,r+1):
        nx=[]
        for s in fr:
            for t in H:
                rr=s.translate(t)
                if rr in seen: continue
                seen.add(rr); e=ball.get(rr)
                if e is not None:
                    c=j+e
                    if best is None or c<best: best=c
                else: nx.append(rr)
        fr=nx
    return best if best is not None else L
for L in (5,6):
    random.seed(1); n=200 if L==6 else 1000
    t0=time.perf_counter(); sd=0
    for _ in range(n):
        s=ident
        for _ in range(L): s=s.translate(H[random.randrange(G)])
        sd+=dist(s,L)
    dt=time.perf_counter()-t0
    print("L=%d n=%d E[d]=%.3f  %.2fs  %.4fs/sample"%(L,n,sd/n,dt,dt/n))
