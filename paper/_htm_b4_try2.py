import time, json
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
H,ident=htm_gens()
ball={ident:0}; fr=[ident]
for depth in range(1,4):  # build complete-key B3 only
    nx=[]; has=ball.__contains__; put=ball.__setitem__
    for s in fr:
        for t in H:
            r=s.translate(t)
            if not has(r): put(r,depth); nx.append(r)
    fr=nx
print("complete-key B3 size",len(ball),"VmHWM %.0f MB"%vmhwm())
# now try to extend to depth 4 in place, monitoring
t0=time.perf_counter(); cnt4=0; has=ball.__contains__; put=ball.__setitem__
for n,s in enumerate(fr):
    for t in H:
        r=s.translate(t)
        if not has(r): put(r,4); cnt4+=1
    if n % 40000==0:
        print("  proc %d/%d  ball=%d  VmHWM %.0f MB  %.1fs"%(n,len(fr),len(ball),vmhwm(),time.perf_counter()-t0),flush=True)
print("DONE depth4 size",len(ball),"VmHWM %.0f MB  %.1fs"%(vmhwm(),time.perf_counter()-t0))
