// Hyperspeedcube-style — 3D cubie bodies + outward sticker caps per cell

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import {
    mat4transform, wDivisor, camera4dW, globalScale, hscLighting, HSC,
} from './math4d.js?v=21';
import {
    FACE_COLORS, visibleCells, CUBIE_HALF,
} from './hypercube.js?v=21';

const GS = globalScale();
const CAM_W = camera4dW();
const BODY_COLOR = new THREE.Color(0x14141c);
const HL_SCALE = 1.22;
const HL_ADD = 50 / 255;

const CORNER_SIGNS = [
    [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1],
    [-1,-1, 1], [1,-1, 1], [1,1, 1], [-1,1, 1],
];

const FACE_QUADS = [
    [0, 3, 7, 4], [1, 2, 6, 5],
    [0, 1, 5, 4], [3, 2, 6, 7],
    [0, 1, 2, 3], [4, 5, 6, 7],
];

const add4 = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2], a[3]+b[3]];
const mul4 = (v, s) => [v[0]*s, v[1]*s, v[2]*s, v[3]*s];

function scale4(v) {
    return [v[0]*GS, v[1]*GS, v[2]*GS, v[3]*GS];
}

function project4(corner4d, rot4d) {
    const r = mat4transform(scale4(corner4d), rot4d);
    const wd = wDivisor(r[3]);
    if (wd < 0.05) return null;
    return [r[0] / wd, r[1] / wd, r[2] / wd];
}

function cubieCorners4d(center, half, t0, t1, t2) {
    const corners = [];
    for (const [s0, s1, s2] of CORNER_SIGNS) {
        corners.push(add4(center, add4(
            mul4(t0, s0 * half),
            add4(mul4(t1, s1 * half), mul4(t2, s2 * half)),
        )));
    }
    return corners;
}

function quadArea2d(q) {
    return (q[1][0]-q[0][0])*(q[2][1]-q[0][1]) - (q[1][1]-q[0][1])*(q[2][0]-q[0][0]);
}

function normal3(q) {
    const a = q[0], b = q[1], c = q[2];
    const e1x = b[0]-a[0], e1y = b[1]-a[1], e1z = b[2]-a[2];
    const e2x = c[0]-a[0], e2y = c[1]-a[1], e2z = c[2]-a[2];
    return [
        e1y*e2z - e1z*e2y,
        e1z*e2x - e1x*e2z,
        e1x*e2y - e1y*e2x,
    ];
}

function colorFromIdx(idx, bright, highlight) {
    const hex = parseInt(FACE_COLORS[idx].replace('#', ''), 16);
    let r = ((hex >> 16) & 0xff) / 255 * bright;
    let g = ((hex >> 8) & 0xff) / 255 * bright;
    let b = (hex & 0xff) / 255 * bright;
    if (highlight) {
        r = Math.min(1, r * HL_SCALE + HL_ADD);
        g = Math.min(1, g * HL_SCALE + HL_ADD);
        b = Math.min(1, b * HL_SCALE + HL_ADD);
    }
    return new THREE.Color(r, g, b);
}

function pushFace(items, quad, color, avgZ, sticker) {
    let area = quadArea2d(quad);
    if (Math.abs(area) < 0.00012) return;
    if (area < 0) quad = [quad[0], quad[3], quad[2], quad[1]];
    items.push({ quad, color, avgZ, sticker });
}

export class Renderer4D {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1b1b1b);

        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        const aspect = w / h;
        const base = 1.55 / HSC.ZOOM;
        this._orthoBase = base;
        this.camera = new THREE.OrthographicCamera(
            -base * aspect, base * aspect, base, -base, 0.01, 100,
        );
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(w, h);
        container.appendChild(this.renderer.domElement);

        this._pool = [];
        this._active = 0;
        this._pickMap = new Map();
        this.raycaster = new THREE.Raycaster();
        window.addEventListener('resize', () => this._onResize());
    }

    updateScene(puzzle, selectedFace = -1) {
        const rot4d = puzzle.rot4d;
        const cells = visibleCells(rot4d, CAM_W);
        const items = [];

        for (const sticker of puzzle.stickers) {
            if (!cells.has(sticker.faceIdx)) continue;

            const [t0, t1, t2] = sticker.tangents;
            const highlight = selectedFace >= 0 && sticker.faceIdx === selectedFace;

            // --- 3D cubie body (6 faces in tangent space, all dark) ---
            const bodyPts = cubieCorners4d(sticker.cubieCenter4d, CUBIE_HALF, t0, t1, t2)
                .map(c => project4(c, rot4d));
            if (!bodyPts.some(p => !p)) {
                const bodyBright = 0.5;
                const dark = BODY_COLOR.clone().multiplyScalar(bodyBright);
                for (let fi = 0; fi < 6; fi++) {
                    const quad = FACE_QUADS[fi].map(i => bodyPts[i]);
                    const avgZ = (quad[0][2] + quad[1][2] + quad[2][2] + quad[3][2]) * 0.25;
                    pushFace(items, quad, dark, avgZ, null);
                }
            }

            // --- Outward sticker cap (hyperplane quad, colored) ---
            const capPts = sticker.corners4d.map(c => project4(c, rot4d));
            if (!capPts.some(p => !p)) {
                const quad = capPts;
                const n3 = normal3(quad);
                const bright = hscLighting(n3);
                const color = colorFromIdx(sticker.currentColorIdx, bright, highlight);
                const avgZ = (quad[0][2] + quad[1][2] + quad[2][2] + quad[3][2]) * 0.25;
                pushFace(items, [...quad], color, avgZ, sticker);
            }
        }

        items.sort((a, b) => a.avgZ - b.avgZ);

        this._pickMap.clear();
        let idx = 0;
        for (const item of items) {
            if (idx >= this._pool.length) {
                const entry = this._makeFaceObject();
                this._pool.push(entry);
                this.scene.add(entry.group);
            }
            const entry = this._pool[idx];
            entry.group.visible = true;
            this._updateFace(entry, item);
            if (item.sticker) this._pickMap.set(entry.mesh, item.sticker);
            idx++;
        }
        for (let i = idx; i < this._pool.length; i++) {
            this._pool[i].group.visible = false;
        }
        this._active = idx;
    }

    _makeFaceObject() {
        const geo = new THREE.BufferGeometry();
        const mat = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.FrontSide,
            depthWrite: true,
            depthTest: true,
        });
        const mesh = new THREE.Mesh(geo, mat);
        const edgeGeo = new THREE.BufferGeometry();
        const edges = new THREE.LineSegments(
            edgeGeo,
            new THREE.LineBasicMaterial({ color: 0x000000 }),
        );
        const group = new THREE.Group();
        group.add(mesh);
        group.add(edges);
        return { group, mesh, edges, edgeGeo };
    }

    _updateFace(entry, item) {
        const { quad, color } = item;
        const positions = [];
        const colors = [];
        const edgePositions = [];

        for (let k = 0; k < 4; k++) {
            positions.push(quad[k][0], quad[k][1], quad[k][2]);
            colors.push(color.r, color.g, color.b);
        }
        positions.push(quad[0][0], quad[0][1], quad[0][2]);
        colors.push(color.r, color.g, color.b);
        positions.push(quad[2][0], quad[2][1], quad[2][2]);
        colors.push(color.r, color.g, color.b);

        for (let k = 0; k < 4; k++) {
            const a = k, b = (k + 1) % 4;
            edgePositions.push(
                quad[a][0], quad[a][1], quad[a][2],
                quad[b][0], quad[b][1], quad[b][2],
            );
        }

        entry.mesh.geometry.setAttribute('position',
            new THREE.Float32BufferAttribute(positions, 3));
        entry.mesh.geometry.setAttribute('color',
            new THREE.Float32BufferAttribute(colors, 3));
        entry.mesh.geometry.computeBoundingSphere();
        entry.edgeGeo.setAttribute('position',
            new THREE.Float32BufferAttribute(edgePositions, 3));
        entry.edgeGeo.computeBoundingSphere();
    }

    pickSticker(ndcX, ndcY) {
        this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
        const meshes = this._pool.slice(0, this._active)
            .filter(e => e.group.visible)
            .map(e => e.mesh);
        for (const h of this.raycaster.intersectObjects(meshes)) {
            const s = this._pickMap.get(h.object);
            if (s) return s;
        }
        return null;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    get domElement() {
        return this.renderer.domElement;
    }

    _onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        const a = w / h;
        const s = this._orthoBase;
        this.camera.left = -s * a;
        this.camera.right = s * a;
        this.camera.top = s;
        this.camera.bottom = -s;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
}
