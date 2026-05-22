// Hyperspeedcube camera / projection — matches hyperdraw/src/camera.rs + shader.wgsl

export const HSC = {
    FOV_4D: 60,
    FOV_3D: 0,
    FACET_SHRINK: 0.7,
    STICKER_SHRINK: 0.3,
    PIECE_EXPLODE: 0,
    ZOOM: 0.75,
    W_CLIP: 0.1,
    LIGHT_YAW: -55,
    LIGHT_PITCH: 65,
    FACE_LIGHT: 1.0,
    NDIM: 4,
};

export const FACE_COLORS = [
    '#cc3333', '#ff9922', '#ffffff', '#ffff00',
    '#88ee66', '#33aaff', '#ff66ff', '#8822cc',
];
export const FACE_NAMES = ['+X R', '−X L', '+Y U', '−Y D', '+Z F', '−Z B', '+W O', '−W I'];

export const HALF = 1.0;
export const LAYER_COORDS = [-1 / 3, 0, 1 / 3];

const DEG = Math.PI / 180;

export function wFactor4d() {
    return Math.tan(HSC.FOV_4D * DEG / 2);
}

export function wFactor3d() {
    return Math.tan(HSC.FOV_3D * DEG / 2);
}

export function camera4dW() {
    return 1 + 1 / wFactor4d();
}

/** camera.rs global_scale */
export function camGlobalScale() {
    return 1 / (1 - HSC.FACET_SHRINK * 0.5) / (1 + HSC.PIECE_EXPLODE);
}

/** Layer coords ±⅓ live in [-1,1]^4 shell — scale to HSC primordial coords */
export const LAYER_TO_HSC = 1 / LAYER_COORDS[2];

export function meshGlobalScale() {
    return Math.sqrt(HSC.NDIM / (HALF * HALF * HSC.NDIM));
}

export function totalScale() {
    return camGlobalScale() * meshGlobalScale() * LAYER_TO_HSC;
}

export function facetScale() {
    return 1 - HSC.FACET_SHRINK;
}

export function wDivisor(w) {
    return 1 + (1 - w) * wFactor4d();
}

export function zDivisor(z) {
    return 1 + (Math.sign(HSC.FOV_3D) - z) * wFactor3d();
}

export function mat4identity() {
    return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
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

export function mat4rotPlane(i, j, angle) {
    const m = mat4identity();
    const c = Math.cos(angle), s = Math.sin(angle);
    m[i][i] = c;  m[i][j] = s;
    m[j][i] = -s;  m[j][j] = c;
    return m;
}

export function mat4orthogonalize(m) {
    const rows = m.map(r => [...r]);
    const dot = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
    const sub = (a, b, s) => [a[0]-b[0]*s,a[1]-b[1]*s,a[2]-b[2]*s,a[3]-b[3]*s];
    const norm = v => {
        const n = Math.sqrt(dot(v,v));
        return n > 1e-12 ? [v[0]/n,v[1]/n,v[2]/n,v[3]/n] : [...v];
    };
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < i; j++)
            rows[i] = sub(rows[i], rows[j], dot(rows[i], rows[j]));
        rows[i] = norm(rows[i]);
    }
    return rows;
}

const add4 = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2], a[3]+b[3]];
const sub4 = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2], a[3]-b[3]];
const mul4s = (v, s) => [v[0]*s, v[1]*s, v[2]*s, v[3]*s];

export function scalePuzzle4(p) {
    const s = totalScale();
    return mul4s(p, s);
}

/** shader: facet shrink about surface centroid */
export function applyFacetShrink(p, centroid, scale) {
    const d = sub4(p, centroid);
    return add4(centroid, mul4s(d, scale));
}

/** shader: sticker shrink along shrink vector (toward piece center) */
export function applyStickerShrink(p, pieceCenter, amount) {
    const shrink = sub4(pieceCenter, p);
    return add4(p, mul4s(shrink, amount));
}

/** Full HSC transform: scale → rotate → 4D project → 3D project */
export function projectToScreen(p4, rot4d) {
    let p = scalePuzzle4(p4);
    p = mat4transform(p, rot4d);
    const wd = wDivisor(p[3]);
    if (wd < HSC.W_CLIP) return null;
    const x3 = p[0] / wd, y3 = p[1] / wd, z3 = p[2] / wd;
    const zd = zDivisor(z3);
    return [x3 / zd, y3 / zd, z3];
}

/** shader 4D backface cull */
export function cull4dFace(normal4, point4, rot4d, camW) {
    const n = mat4transform(normal4, rot4d);
    const pt = mat4transform(scalePuzzle4(point4), rot4d);
    const ray = [pt[0], pt[1], pt[2], pt[3] - camW];
    const dot = n[0]*ray[0] + n[1]*ray[1] + n[2]*ray[2] + n[3]*ray[3];
    return dot > 0;
}

/** Outer hyperface pole in layer coords (±⅓), matches ft_cube cut_depths */
export function facetCentroid(cellIdx) {
    const dim = cellIdx >> 1;
    const sign = (cellIdx & 1) === 0 ? 1 : -1;
    const c = [0, 0, 0, 0];
    c[dim] = sign * LAYER_COORDS[2];
    return c;
}

export function hscLightDirection() {
    const yaw = HSC.LIGHT_YAW * DEG, pitch = HSC.LIGHT_PITCH * DEG;
    const x = Math.sin(yaw) * Math.cos(pitch);
    const y = -Math.sin(pitch);
    const z = Math.cos(yaw) * Math.cos(pitch);
    const l = Math.hypot(x, y, z);
    return [x/l, y/l, z/l];
}

export function hscLighting(normal3) {
    const L = hscLightDirection();
    const dot = normal3[0]*L[0] + normal3[1]*L[1] + normal3[2]*L[2];
    const lit = dot * 0.5 + 0.5;
    return (1 - HSC.FACE_LIGHT) + lit * HSC.FACE_LIGHT;
}

/** ft_cube.hps Facet-centered vantage (45° XZ + 35° YZ only) */
export function buildFacetCenteredView() {
    const rXZ = mat4rotPlane(0, 2, Math.PI / 4);
    const rYZ = mat4rotPlane(1, 2, Math.atan(1 / Math.sqrt(2)));
    return mat4mul(rXZ, rYZ);
}
