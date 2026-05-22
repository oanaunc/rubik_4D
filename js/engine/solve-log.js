// Step-by-step solve narrative for the sidebar log panel.

/**
 * @typedef {'info'|'phase'|'search'|'move'|'history'|'done'|'error'} SolveLogType
 * @typedef {{ type: SolveLogType, message: string, detail?: string, at: string }} SolveLogEntry
 */

export class SolveLog {
    /** @param {HTMLElement | null} container */
    constructor(container) {
        this.container = container;
        /** @type {SolveLogEntry[]} */
        this.steps = [];
    }

    clear() {
        this.steps = [];
        if (this.container) this.container.innerHTML = '';
    }

    /**
     * @param {SolveLogType} type
     * @param {string} message
     * @param {string} [detail]
     * @returns {number} index of this entry
     */
    add(type, message, detail = '') {
        const entry = {
            type,
            message,
            detail: detail || undefined,
            at: new Date().toISOString(),
        };
        const index = this.steps.length;
        this.steps.push(entry);
        if (this.container) {
            const row = document.createElement('div');
            row.className = `solve-log-step solve-log-${type}`;
            row.dataset.index = String(index);
            const num = document.createElement('span');
            num.className = 'solve-log-num';
            num.textContent = `${index + 1}.`;
            const msg = document.createElement('span');
            msg.className = 'solve-log-msg';
            msg.textContent = message;
            row.append(num, msg);
            if (detail) {
                const sub = document.createElement('div');
                sub.className = 'solve-log-detail';
                sub.textContent = detail;
                row.appendChild(sub);
            }
            this.container.appendChild(row);
            this.container.scrollTop = this.container.scrollHeight;
        }
        return index;
    }

    /** @param {number} index */
    highlight(index) {
        if (!this.container) return;
        for (const row of this.container.querySelectorAll('.solve-log-step')) {
            row.classList.toggle('active', row.dataset.index === String(index));
        }
        const row = this.container.querySelector(`[data-index="${index}"]`);
        row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    unhighlight() {
        if (!this.container) return;
        for (const row of this.container.querySelectorAll('.solve-log-step')) {
            row.classList.remove('active');
        }
    }

    /** @returns {{ steps: SolveLogEntry[] }} */
    export() {
        return { steps: [...this.steps] };
    }

    /** @param {{ steps?: SolveLogEntry[] }} payload */
    load(payload) {
        this.clear();
        if (!payload?.steps?.length) return;
        for (const e of payload.steps) {
            this.add(e.type, e.message, e.detail ?? '');
        }
    }
}
