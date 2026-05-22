import sys, time, random, numpy as np
exec(open("_htm_recert2.py").read().split('if "--validate"')[0])
random.seed(7); mism=0; n=40
for _ in range(n):
    s=ident
    for _ in range(6): s=s.translate(H[random.randrange(G)])
    a=np.frombuffer(s,dtype=np.uint8).copy()
    if dist_py(s,6)!=dist_np(a,6): mism+=1
print("L=6 validate n=%d mism=%d"%(n,mism),flush=True)
random.seed(50); n=2000; t0=time.perf_counter(); sd=0
for _ in range(n):
    s=ident
    for _ in range(6): s=s.translate(H[random.randrange(G)])
    sd+=dist_np(np.frombuffer(s,dtype=np.uint8).copy(),6)
dt=time.perf_counter()-t0
print("numpy L=6 n=%d E[d]=%.4f %.1fs %.5f/s"%(n,sd/n,dt,dt/n),flush=True)
