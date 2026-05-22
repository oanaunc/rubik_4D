// HSC-style cubies + thick outlines (default.yaml: internals #444, hover outline 2px white)

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import {
    camera4dW, HSC,
    facetScale, facetCentroid, applyFacetShrink, applyStickerShrink,
    projectToScreen, camGlobalScale,
} from './projection.js?v=76';
import { PIECE_HALF, slotKey } from './hyperpuzzle.js?v=76';

const CAM_W = camera4dW();
const FS = facetScale();
const PIECE_GAP = 0.03;
/** Gap between neighbors = ratio × cubie edge (0.5 → half a cubie, like center cluster) */
const CUBIE_GAP_RATIO = 0.5;
/** Push outer facet islands away from hub (positions only) */
const CLUSTER_SPREAD = 2.35;
/** Grid scale for every 3×3×3 — same as center cluster */
const GRID_SCALE = 1.55;
/** Spread layer centers along the depth axis (perspective spacing + matching cubie size). */
const DEPTH_LAYER_SPREAD = 1.45;
const HUB_NEIGHBOR_KEYS = ['2,1,1', '1,2,1', '1,1,2'];
const HL = 1.28;

const OUTLINE_COLOR = 0x000000;
const HOVER_OUTLINE = 0xffffff;
const SELECT_OUTLINE = 0xffffff;
/** Layered scales — multiple shells read as a thicker black rim. */
const OUTLINE_EDGE_SCALES = [1.0, 1.004, 1.008, 1.012, 1.016, 1.02, 1.024, 1.028, 1.032];
const HOVER_EDGE_SCALES = [1.04, 1.05, 1.06, 1.07];
const SELECT_EDGE_SCALES = [1.05, 1.065, 1.08, 1.095];
const FACE_COLORS = [
    0xcc3333, 0xff9922, 0xffffff, 0xffff00,
    0x88ee66, 0x33aaff, 0xff66ff, 0x8822cc,
];

function transformCorner(p4, cellIdx, pieceCenter, h) {
    const fc = facetCentroid(cellIdx);
    const pc = applyFacetShrink(pieceCenter, fc, FS);
    let p = applyFacetShrink(p4, fc, FS);
    const dim = cellIdx >> 1;
    const outwardPos = (cellIdx & 1) === 0;
    const onOutward = outwardPos
        ? p4[dim] > pieceCenter[dim] + h * 0.25
        : p4[dim] < pieceCenter[dim] - h * 0.25;
    if (onOutward) {
        p = applyStickerShrink(p, pc, HSC.STICKER_SHRINK);
    }
    return p;
}

function toV3(p4, rot4d) {
    const p = projectToScreen(p4, rot4d);
    return p ? new THREE.Vector3(p[0], p[1], p[2]) : null;
}

function stickerHex(axisIdx, hi) {
    let c = FACE_COLORS[axisIdx];
    if (hi) {
        const r = ((c >> 16) & 255) / 255;
        const g = ((c >> 8) & 255) / 255;
        const b = (c & 255) / 255;
        c = (Math.min(255, Math.round(r * HL * 255 + 30)) << 16)
            | (Math.min(255, Math.round(g * HL * 255 + 30)) << 8)
            | Math.min(255, Math.round(b * HL * 255 + 30));
    }
    return c;
}

function orthoBasis(ex, ey, ez) {
    const x = ex.clone().normalize();
    let z = new THREE.Vector3().crossVectors(x, ey);
    if (z.lengthSq() < 1e-8) z = new THREE.Vector3().crossVectors(x, ez);
    z.normalize();
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    return new THREE.Matrix4().makeBasis(x, y, z);
}

/**
 * HSC facet view: each cell in the 3×3×3 grid is one solid color —
 * the sticker on that facet (face_color FromSticker for the outward face).
 */
function cubieColor(slot, facetAxis, selectedFace, isSelected) {
    const sticker = slot.faceColors[facetAxis];
    if (sticker < 0) return 0x222222;
    const hi = (selectedFace >= 0 && facetAxis === selectedFace) || isSelected;
    return stickerHex(sticker, hi);
}

/**
 * Scale each 3×3×3 about its own facet center (equal gaps within a color).
 * Hub scaling fans outer clusters apart; translation only moves the whole island.
 */
function layoutScreenPoint(p4, cellIdx, rot4d, facetOffset) {
    const p = toV3(p4, rot4d);
    if (!p) return null;
    const fc = toV3(facetCentroid(cellIdx), rot4d);
    const q = fc
        ? fc.clone().add(p.clone().sub(fc).multiplyScalar(GRID_SCALE))
        : p.clone().multiplyScalar(GRID_SCALE);
    return facetOffset ? q.add(facetOffset) : q;
}

function buildFacetOffsets(visible, rot4d) {
    const offsets = new Map();
    offsets.set(7, null);
    for (const cellIdx of visible) {
        if (cellIdx === 7) continue;
        const fc = toV3(facetCentroid(cellIdx), rot4d);
        if (!fc) continue;
        offsets.set(cellIdx, fc.clone().multiplyScalar(CLUSTER_SPREAD - 1));
    }
    return offsets;
}

function slotLayoutCenter(center4, cellIdx, rot4d, h, facetOffset) {
    return layoutScreenPoint(
        transformCorner(center4, cellIdx, center4, h),
        cellIdx,
        rot4d,
        facetOffset,
    );
}

function collectFacetSlotPositions(puzzle, cellIdx, rot4d, h, facetOffset) {
    const slots = new Map();
    for (const { slot, local } of puzzle.cubiesForCell(cellIdx)) {
        const pos = slotLayoutCenter(puzzle.slotCenter(slot), cellIdx, rot4d, h, facetOffset);
        if (pos) slots.set(`${local[0]},${local[1]},${local[2]}`, pos);
    }
    return slots;
}

function slotKey3(a, b, c) {
    return `${a},${b},${c}`;
}

function neighborPitch(slots, a, b, c, da, db, dc) {
    const p = slots.get(slotKey3(a, b, c));
    const n = slots.get(slotKey3(a + da, b + db, c + dc));
    if (!p || !n) return null;
    return p.distanceTo(n);
}

/** Orthonormal axes along the facet's projected local grid. */
function facetTangentBasis(slots) {
    const hub = slots.get('1,1,1');
    if (!hub) return null;
    const p0 = slots.get('2,1,1');
    const p1 = slots.get('1,2,1');
    const p2 = slots.get('1,1,2');
    if (!p0 || !p1 || !p2) return null;

    const u0 = p0.clone().sub(hub);
    if (u0.lengthSq() < 1e-10) return null;
    u0.normalize();

    const u1 = p1.clone().sub(hub);
    u1.addScaledVector(u0, -u1.dot(u0));
    if (u1.lengthSq() < 1e-10) return null;
    u1.normalize();

    const u2 = p2.clone().sub(hub);
    u2.addScaledVector(u0, -u2.dot(u0));
    u2.addScaledVector(u1, -u2.dot(u1));
    if (u2.lengthSq() < 1e-10) return null;
    u2.normalize();

    return { u0, u1, u2 };
}

/** Hub pitches for edge/corner cubies missing a neighbor. */
function hubAxisSides(slots) {
    const hub = slots.get('1,1,1');
    if (!hub) return null;
    const gap = 1 + CUBIE_GAP_RATIO;
    const side = key => {
        const p = slots.get(key);
        return p ? hub.distanceTo(p) / gap : null;
    };
    return [side('2,1,1'), side('1,2,1'), side('1,1,2')];
}

/** Per-axis cubie size from projected neighbor spacing (perspective stretch). */
function axisSides(slots, local, hubSides) {
    const [a, b, c] = local;
    const gap = 1 + CUBIE_GAP_RATIO;
    const side = (da, db, dc, hubIdx) => {
        const fwd = neighborPitch(slots, a, b, c, da, db, dc);
        const back = neighborPitch(slots, a, b, c, -da, -db, -dc);
        if (fwd && back) return (fwd + back) / 2 / gap;
        if (fwd) return fwd / gap;
        if (back) return back / gap;
        return hubSides ? hubSides[hubIdx] : null;
    };
    return [side(1, 0, 0, 0), side(0, 1, 0, 1), side(0, 0, 1, 2)];
}

function offset4(p, dim, delta) {
    const q = [p[0], p[1], p[2], p[3]];
    q[dim] += delta;
    return q;
}

/** Projected hyperface normal — which grid axis reads as “into” the puzzle. */
function facetDepthDirection(center4, cellIdx, rot4d, h, facetOffset) {
    const dim = cellIdx >> 1;
    const off = facetOffset ?? null;
    const vPlus = layoutScreenPoint(
        transformCorner(offset4(center4, dim, h), cellIdx, center4, h),
        cellIdx, rot4d, off,
    );
    const vMinus = layoutScreenPoint(
        transformCorner(offset4(center4, dim, -h), cellIdx, center4, h),
        cellIdx, rot4d, off,
    );
    if (!vPlus || !vMinus) return null;
    const depth = vPlus.clone().sub(vMinus);
    if (depth.lengthSq() < 1e-10) return null;
    return depth.normalize();
}

function depthTangentIndex(u0, u1, u2, uDepth, hubSides) {
    const axes = [u0, u1, u2];
    let best = 0;
    let bestDot = Math.abs(axes[0].dot(uDepth));
    for (let i = 1; i < 3; i++) {
        const d = Math.abs(axes[i].dot(uDepth));
        if (d > bestDot) {
            bestDot = d;
            best = i;
        }
    }
    if (bestDot >= 0.25) return best;
    if (!hubSides) return 2;
    return hubSides.indexOf(Math.min(hubSides[0], hubSides[1], hubSides[2]));
}

/** Push layer 0/1/2 apart along depth in perspective (centers, not just cubie thickness). */
function spreadSlotsAlongDepth(slots, u0, u1, u2, depthIdx, stretch) {
    if (stretch <= 1) return;
    const hub = slots.get('1,1,1');
    const neighbor = slots.get(HUB_NEIGHBOR_KEYS[depthIdx]);
    if (!hub || !neighbor) return;
    const ud = [u0, u1, u2][depthIdx];
    const pitch = hub.distanceTo(neighbor);
    const extraPerLayer = pitch * (stretch - 1);

    for (const [key, pos] of slots) {
        const [a, b, c] = key.split(',').map(Number);
        const layer = [a, b, c][depthIdx] - 1;
        if (layer === 0) continue;
        pos.addScaledVector(ud, layer * extraPerLayer);
    }
}

function buildCubieMatrixPerspective(mid, u0, u1, u2, sides) {
    const [sx, sy, sz] = sides;
    if (!sx || !sy || !sz || sx < 1e-5 || sy < 1e-5 || sz < 1e-5) return null;

    const quat = new THREE.Quaternion().setFromRotationMatrix(orthoBasis(u0, u1, u2));
    const scale = new THREE.Vector3(sx, sy, sz);
    const matrix = new THREE.Matrix4().compose(mid, quat, scale);
    return { matrix, mid };
}

function scaledMatrix(matrix, scaleMul) {
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    matrix.decompose(pos, quat, scl);
    return new THREE.Matrix4().compose(pos, quat, scl.clone().multiplyScalar(scaleMul));
}

/** Layered edge lines (drawn after cubie faces). */
function makeEdgeShells(edgeGeo, matrix, color, scales) {
    return scales.map(scaleMul => {
        const lines = new THREE.LineSegments(
            edgeGeo,
            new THREE.LineBasicMaterial({
                color,
                depthTest: true,
                depthWrite: false,
            }),
        );
        lines.matrixAutoUpdate = false;
        lines.matrix.copy(scaleMul === 1 ? matrix : scaledMatrix(matrix, scaleMul));
        lines.frustumCulled = false;
        return lines;
    });
}

export class PuzzleRenderer {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1b1b1b);

        const base = (1.42 * camGlobalScale()) / HSC.ZOOM;
        this._viewBase = base;
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        container.appendChild(this.renderer.domElement);

        this._cubies = [];
        this._boxGeo = new THREE.BoxGeometry(1, 1, 1);
        this._edgeGeo = new THREE.EdgesGeometry(this._boxGeo);
        this._hoverSlotKey = -1;

        this._resizeObserver = new ResizeObserver(() => this._resize());
        this._resizeObserver.observe(container);
        window.addEventListener('resize', () => this._resize());
        this._resize();
    }

    _clearCubies() {
        for (const c of this._cubies) {
            this.scene.remove(c.mesh);
            for (const ln of c.edgeLines) {
                this.scene.remove(ln);
                ln.material.dispose();
            }
            for (const ln of c.selLines) {
                this.scene.remove(ln);
                ln.material.dispose();
            }
            c.mesh.material.dispose();
        }
        this._cubies = [];
    }

    _applyView() {
        const w = this.container.clientWidth || 800;
        const h = this.container.clientHeight || 600;
        const aspect = w / h;
        const base = this._viewBase;
        this.camera.left = -base * aspect;
        this.camera.right = base * aspect;
        this.camera.top = base;
        this.camera.bottom = -base;
        this.camera.updateProjectionMatrix();
    }

    setHoverSlot(slot) {
        this._hoverSlotKey = slot ? slotKey(slot) : -1;
    }

    update(puzzle, selectedFace = -1, selectedSlot = null) {
        puzzle.tickAnim(performance.now());
        this._clearCubies();
        const rot4d = puzzle.rot4d;
        const visible = puzzle.visibleCells(rot4d, CAM_W);
        const h = PIECE_HALF * (1 - PIECE_GAP);
        const selKey = selectedSlot ? slotKey(selectedSlot) : -1;
        const facetOffsets = buildFacetOffsets(visible, rot4d);
        const facetLayout = new Map();
        for (const cellIdx of visible) {
            const facetOffset = facetOffsets.get(cellIdx) ?? null;
            const slots = collectFacetSlotPositions(
                puzzle, cellIdx, rot4d, h, facetOffset,
            );
            let basis = facetTangentBasis(slots);
            if (!basis) continue;
            let hubSides = hubAxisSides(slots);
            const hubCubie = puzzle.cubiesForCell(cellIdx).find(
                ({ local }) => local[0] === 1 && local[1] === 1 && local[2] === 1,
            );
            const uDepth = hubCubie
                ? facetDepthDirection(
                    puzzle.slotCenter(hubCubie.slot), cellIdx, rot4d, h, facetOffset,
                )
                : null;
            // Center (purple) is face-on — depth spread only elongates one axis.
            if (cellIdx !== 7) {
                const depthIdx = uDepth
                    ? depthTangentIndex(basis.u0, basis.u1, basis.u2, uDepth, hubSides)
                    : 2;
                spreadSlotsAlongDepth(
                    slots, basis.u0, basis.u1, basis.u2, depthIdx, DEPTH_LAYER_SPREAD,
                );
                basis = facetTangentBasis(slots) || basis;
                hubSides = hubAxisSides(slots) || hubSides;
            }
            facetLayout.set(cellIdx, {
                slots,
                hubSides,
                ...basis,
            });
        }
        if (!facetLayout.size) return;

        for (const cellIdx of visible) {
            const layout = facetLayout.get(cellIdx);
            if (!layout) continue;
            const { slots, hubSides, u0, u1, u2 } = layout;
            for (const { slot, local } of puzzle.cubiesForCell(cellIdx)) {
                const mid = slots.get(slotKey3(local[0], local[1], local[2]));
                if (!mid) continue;
                const sides = axisSides(slots, local, hubSides);
                const built = buildCubieMatrixPerspective(mid, u0, u1, u2, sides);
                if (!built) continue;

                const { matrix } = built;
                const sk = slotKey(slot);
                const isSelected = sk === selKey;
                const isHovered = sk === this._hoverSlotKey;

                const color = cubieColor(slot, cellIdx, selectedFace, isSelected);
                const mesh = new THREE.Mesh(
                    this._boxGeo,
                    new THREE.MeshBasicMaterial({
                        color,
                        polygonOffset: true,
                        polygonOffsetFactor: 1,
                        polygonOffsetUnits: 1,
                    }),
                );
                mesh.matrixAutoUpdate = false;
                mesh.matrix.copy(matrix);
                mesh.frustumCulled = false;
                mesh.userData.slot = slot;
                mesh.userData.facetAxis = cellIdx;

                const edgeLines = makeEdgeShells(
                    this._edgeGeo, matrix, OUTLINE_COLOR, OUTLINE_EDGE_SCALES,
                );
                edgeLines.forEach(ln => this.scene.add(ln));

                const selLines = [];
                if (isSelected) {
                    makeEdgeShells(
                        this._edgeGeo, matrix, SELECT_OUTLINE, SELECT_EDGE_SCALES,
                    ).forEach(ln => {
                        this.scene.add(ln);
                        selLines.push(ln);
                    });
                } else if (isHovered) {
                    makeEdgeShells(
                        this._edgeGeo, matrix, HOVER_OUTLINE, HOVER_EDGE_SCALES,
                    ).forEach(ln => {
                        this.scene.add(ln);
                        selLines.push(ln);
                    });
                }

                this.scene.add(mesh);
                this._cubies.push({ mesh, edgeLines, selLines, slot, cellIdx });
            }
        }

        this._applyView();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    pick(ndcX, ndcY) {
        this.raycaster = this.raycaster || new THREE.Raycaster();
        this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
        const hits = this.raycaster.intersectObjects(this._cubies.map(c => c.mesh), false);
        if (!hits.length) return null;

        const hit = hits[0];
        const slot = hit.object.userData.slot;
        const facetAxis = hit.object.userData.facetAxis;
        if (slot.faceColors[facetAxis] < 0) return null;
        return { faceIdx: facetAxis, slot, cellIdx: facetAxis };
    }

    _resize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w < 1 || h < 1) return;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(w, h, false);
        this._applyView();
    }
}
