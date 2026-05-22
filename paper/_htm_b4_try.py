import time, sys, json
import model_4d as M
def vmhwm():
    for l in open('/proc/self/status'):
        if l.startswith('VmHWM'): return int(l.split()[1])/1024.0
def htm_gens():
    tabs,ident=M.move_tables()
    def comp(t): return bytes(t[t[i]] for i in range(256))
    halves,seen=[],set()
    for t in tabs:
        h2=comp(t)
        if h2!=ident and h2 not in seen: seen.add(h2); halves.append(h2)
    return tabs+halves, ident
H,ident=htm_gens(); print("gens",len(H))
t0=time.perf_counter()
ball={ident:0}; fr=[ident]
for depth in range(1,5):
    has=ball.__contains__; put=ball.__setitem__
    if depth<4:
        nx=[]
        for s in fr:
            for t in H:
                r=s.translate(t)
                if not has(r): put(r,depth); nx.append(r)
        fr=nx
    else:
        for s in fr:
            for t in H:
                r=s.translate(t)
                if not has(r): put(r,depth)
    print("depth",depth,"size",len(ball),"VmHWM %.0f MB"%vmhwm(),flush=True)
dt=time.perf_counter()-t0
print(json.dumps(dict(size=len(ball),seconds=round(dt,1),peak_GB=round(vmhwm()/1024,3))))
