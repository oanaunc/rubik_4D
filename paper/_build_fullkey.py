import time, os, sys, json
import model_4d as M
TABS, IDENT = M.move_tables()

def vmhwm_mb():
    for line in open('/proc/self/status'):
        if line.startswith('VmHWM'):
            return int(line.split()[1])/1024.0
    return -1

def build_ball_fullkey(R=4):
    ball = {IDENT: 0}; frontier=[IDENT]
    for depth in range(1,R+1):
        nx=[]; has=ball.__contains__; put=ball.__setitem__
        for s in frontier:
            for t in TABS:
                r=s.translate(t)
                if not has(r): put(r,depth); nx.append(r)
        frontier=nx
        print("  depth",depth,"ball size",len(ball),"VmHWM %.1f MB"%vmhwm_mb(),flush=True)
    return ball

t0=time.perf_counter()
ball=build_ball_fullkey(4)
dt=time.perf_counter()-t0
peak=vmhwm_mb()
res=dict(ball_size=len(ball), build_seconds=round(dt,2), peak_VmHWM_MB=round(peak,1),
         peak_GB=round(peak/1024,3))
print(json.dumps(res,indent=1),flush=True)
json.dump(res, open('/tmp/fullkey_result.json','w'))
print("DONE",flush=True)
