// Mouse & keyboard controls for the 4D viewer
// Translates mouse drag → 4D rotation planes (mirrors RotationHandler.java)

export class Controls4D {
    constructor(element, puzzle, onTwist) {
        this.element = element;
        this.puzzle = puzzle;
        this.onTwist = onTwist;  // callback(faceIdx, sliceMask, direction)

        this._dragging = false;
        this._lastX = 0;
        this._lastY = 0;
        this._rotSpeed = 0.008;

        // Click state for twist detection
        this._clickStartX = 0;
        this._clickStartY = 0;
        this._moved = false;

        this._bind();
    }

    _bind() {
        const el = this.element;

        el.addEventListener('mousedown', e => {
            this._dragging = true;
            this._lastX = e.clientX;
            this._lastY = e.clientY;
            this._clickStartX = e.clientX;
            this._clickStartY = e.clientY;
            this._moved = false;
            e.preventDefault();
        });

        el.addEventListener('mousemove', e => {
            if (!this._dragging) return;
            const dx = e.clientX - this._lastX;
            const dy = e.clientY - this._lastY;
            this._lastX = e.clientX;
            this._lastY = e.clientY;

            if (Math.abs(dx) + Math.abs(dy) > 2) this._moved = true;

            const speed = this._rotSpeed;

            if (e.shiftKey) {
                // Shift + drag: rotate into W dimension
                // Horizontal drag → XW plane rotation
                // Vertical drag   → YW plane rotation
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.puzzle.applyViewRotation([0, 3], dx * speed); // XW
                } else {
                    this.puzzle.applyViewRotation([1, 3], dy * speed); // YW
                }
            } else if (e.ctrlKey || e.metaKey) {
                // Ctrl + drag: rotate in ZW plane
                this.puzzle.applyViewRotation([2, 3], dx * speed); // ZW
            } else {
                // Normal drag: 3D rotation (XZ and YZ planes)
                // Horizontal drag → XZ plane
                // Vertical drag   → YZ plane
                this.puzzle.applyViewRotation([2, 0], dx * speed); // XZ
                this.puzzle.applyViewRotation([2, 1], dy * speed); // YZ
            }
        });

        el.addEventListener('mouseup', e => {
            this._dragging = false;
        });

        el.addEventListener('mouseleave', e => {
            this._dragging = false;
        });

        // Touch support
        let lastTouch = null;
        el.addEventListener('touchstart', e => {
            lastTouch = e.touches[0];
            this._clickStartX = lastTouch.clientX;
            this._clickStartY = lastTouch.clientY;
            this._moved = false;
            e.preventDefault();
        }, { passive: false });

        el.addEventListener('touchmove', e => {
            if (!lastTouch) return;
            const t = e.touches[0];
            const dx = t.clientX - lastTouch.clientX;
            const dy = t.clientY - lastTouch.clientY;
            lastTouch = t;
            this._moved = true;

            const speed = this._rotSpeed;
            if (e.touches.length === 2) {
                // Two fingers: rotate into W
                this.puzzle.applyViewRotation([0, 3], dx * speed);
                this.puzzle.applyViewRotation([1, 3], dy * speed);
            } else {
                this.puzzle.applyViewRotation([2, 0], dx * speed);
                this.puzzle.applyViewRotation([2, 1], dy * speed);
            }
            e.preventDefault();
        }, { passive: false });

        el.addEventListener('touchend', e => {
            lastTouch = null;
        });
    }

    // Compute NDC (normalized device coords) from a client mouse event
    getNDC(e) {
        const rect = this.element.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
        };
    }

    // Returns true if the latest mouseup should be treated as a click (not a drag)
    wasClick() {
        return !this._moved;
    }

    isDragging() {
        return this._dragging;
    }
}
