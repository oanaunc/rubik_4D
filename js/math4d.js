// 4D vector and matrix math — Hyperspeedcube-compatible projection

export function vec4(x = 0, y = 0, z = 0, w = 0) { return [x, y, z, w]; }
export function vec4copy(v) { return [...v]; }

export function vec4add(a, b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2], a[3]+b[3]]; }
export function vec4sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2], a[3]-b[3]]; }
export function vec4scale(v, s) { return [v[0]*s, v[1]*s, v[2]*s, v[3]*s]; }
export function vec4dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3]; }
export function vec4norm(v) { return Math.sqrt(vec4dot(v, v)); }
export function vec4normalize(v) { const n = vec4norm(v); return n > 0 ? vec4scale(v, 1/n) : [...v]; }
export function vec4lerp(a, b, t) { return vec4add(vec4scale(a, 1-t), vec4scale(b, t)); }

// Hyperspeedcube view_4d → Normal preset
export const HSC = {
    FOV_4D: 60,
    FOV_3D: 0,
    FACET_SHRINK: 0.7,
    STICKER_SHRINK: 0.3,
    ZOOM: 0.75,
    W_CLIP: 0.1,
    LIGHT_YAW: -55,
    LIGHT_PITCH: 65,
    FACE_LIGHT: 1.0,
};

export function wFactor4d() {
    return Math.tan(HSC.FOV_4D * Math.PI / 180 / 2);
}

export function wFactor3d() {
    return Math.tan(HSC.FOV_3D * Math.PI / 180 / 2);
}

export function camera4dW() {
    return 1 + 1 / wFactor4d();
}

export function globalScale() {
    return 1 / (1 - HSC.FACET_SHRINK * 0.5) / (1 + 0);
}

export function wDivisor(w) {
    return 1 + (1 - w) * wFactor4d();
}

export function zDivisor(z) {
    const wf = wFactor3d();
    const s = Math.sign(HSC.FOV_3D) || 0;
    return s * wf + 1 - wf * z;
}

/** 4D → 3D (Hyperspeedcube camera.rs) */
export function project4to3(p4) {
    const wd = wDivisor(p4[3]);
    return [p4[0] / wd, p4[1] / wd, p4[2] / wd];
}

/** 3D → 2D screen (orthographic when fov_3d = 0) */
export function project3to2(p3) {
    const zd = zDivisor(p3[2]);
    return [p3[0] / zd, p3[1] / zd];
}

export function mat4identity() {
    return [
        [1,0,0,0],
        [0,1,0,0],
        [0,0,1,0],
        [0,0,0,1],
    ];
}

export function mat4mul(a, b) {
    const r = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
            for (let k = 0; k < 4; k++)
                r[i][j] += a[i][k] * b[k][j];
    return r;
}

export function mat4transform(v, m) {
    const r = [0,0,0,0];
    for (let j = 0; j < 4; j++)
        for (let i = 0; i < 4; i++)
            r[j] += v[i] * m[i][j];
    return r;
}

export function mat4transpose(m) {
    return [
        [m[0][0], m[1][0], m[2][0], m[3][0]],
        [m[0][1], m[1][1], m[2][1], m[3][1]],
        [m[0][2], m[1][2], m[2][2], m[3][2]],
        [m[0][3], m[1][3], m[2][3], m[3][3]],
    ];
}

export function mat4rotPlane(i, j, angle) {
    const m = mat4identity();
    const c = Math.cos(angle), s = Math.sin(angle);
    m[i][i] = c;  m[i][j] = s;
    m[j][i] = -s;  m[j][j] = c;
    return m;
}

export function mat4orthogonalize(m) {
    const rows = m.map(r => [...r]);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < i; j++) {
            const dot = vec4dot(rows[i], rows[j]);
            rows[i] = vec4sub(rows[i], vec4scale(rows[j], dot));
        }
        rows[i] = vec4normalize(rows[i]);
    }
    return rows;
}

/** Directional light (yaw/pitch from Hyperspeedcube defaults). */
export function hscLightDirection() {
    const yaw = HSC.LIGHT_YAW * Math.PI / 180;
    const pitch = HSC.LIGHT_PITCH * Math.PI / 180;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x = sy * cp;
    const y = -sp;
    const z = cy * cp;
    const l = Math.hypot(x, y, z);
    return [x/l, y/l, z/l];
}

export function hscLighting(normal3) {
    const L = hscLightDirection();
    const dot = normal3[0]*L[0] + normal3[1]*L[1] + normal3[2]*L[2];
    const lit = dot * 0.5 + 0.5;
    return (1 - HSC.FACE_LIGHT) + lit * HSC.FACE_LIGHT;
}
