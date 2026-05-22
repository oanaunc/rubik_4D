import time, random, numpy as np
exec(open("_htm_recert2.py").read().split('if "--validate"')[0])
random.seed(50); n=600; t0=time.perf_counter(); sd=0
for _ in range(n):
    s=ident
    for _ in range(6): s=s.translate(H[random.randrange(G)])
    sd+=dist_np(np.frombuffer(s,dtype=np.uint8).copy(),6)
dt=time.perf_counter()-t0
print("numpy L=6 n=%d E[d]=%.4f %.1fs %.5f/s -> M in 38s = %d"%(n,sd/n,dt,dt/n,int(38/(dt/n))),flush=True)
