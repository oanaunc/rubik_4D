import sys, time, random, json, os, math
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
def dist(state,L):
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
ACC="/tmp/htm_L6_acc.json"
acc=json.load(open(ACC)) if os.path.exists(ACC) else {"n":0,"sd":0.0,"sd2":0.0,"red":0,"seed":5000}
random.seed(acc["seed"])
batch=int(sys.argv[1]) if len(sys.argv)>1 else 200
t0=time.perf_counter()
for _ in range(batch):
    s=ident
    for _ in range(6): s=s.translate(H[random.randrange(G)])
    d=dist(s,6)
    acc["n"]+=1; acc["sd"]+=d; acc["sd2"]+=d*d
    if d<6: acc["red"]+=1
    if time.perf_counter()-t0>38: break   # write what we have before timeout
acc["seed"]+=1
json.dump(acc,open(ACC,"w"))
n=acc["n"]; mean=acc["sd"]/n; var=max(0.,acc["sd2"]/n-mean*mean); se=math.sqrt(var/n); p=acc["red"]/n
z=1.96; den=1+z*z/n; c=(p+z*z/(2*n))/den; half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
print("n=%d E[d]=%.4f±%.4f eff=%.4f P(d<6)=%.4f Wilson[%.4f,%.4f] (%.1fs)"%(
  n,mean,se,mean/6,p,c-half,c+half,time.perf_counter()-t0),flush=True)
