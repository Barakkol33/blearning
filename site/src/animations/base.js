// Shared helpers for blearning animations (custom elements used as <bl-*> tags in Markdown).

const css = `
.bl-anim{display:block;border:1px solid var(--sl-color-gray-5);border-radius:.75rem;padding:.75rem;margin:1rem 0;background:var(--sl-color-gray-7,var(--sl-color-black));}
.bl-anim canvas{width:100%;display:block;border-radius:.5rem;background:var(--sl-color-black);touch-action:none}
.bl-controls{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:center;margin-top:.6rem;font-size:.9rem}
.bl-controls label{display:flex;gap:.4rem;align-items:center}
.bl-controls input[type=range]{width:7rem}
.bl-controls button,.bl-btn{font:inherit;padding:.25rem .8rem;border-radius:999px;border:1px solid var(--sl-color-accent);background:transparent;color:var(--sl-color-text);cursor:pointer}
.bl-controls button:hover,.bl-btn:hover{background:var(--sl-color-accent-low)}
.bl-controls select{font:inherit;padding:.15rem .4rem;border-radius:.4rem}
.bl-out{font-variant-numeric:tabular-nums;font-weight:600}
`;
let styled = false;

export function palette() {
	const s = getComputedStyle(document.documentElement);
	const v = (n, f) => s.getPropertyValue(n).trim() || f;
	return {
		text: v('--sl-color-white', '#fff'),
		dim: v('--sl-color-gray-3', '#999'),
		grid: v('--sl-color-gray-5', '#444'),
		bg: v('--sl-color-black', '#000'),
		accent: v('--sl-color-accent', '#7aa2ff'),
		accentHigh: v('--sl-color-accent-high', '#cdd9ff'),
		series: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308'],
	};
}

export class BlElement extends HTMLElement {
	connectedCallback() {
		if (this._ready) return;
		this._ready = true;
		if (!styled) {
			const st = document.createElement('style');
			st.textContent = css;
			document.head.append(st);
			styled = true;
		}
		this.source = this.textContent.trim();
		this.textContent = '';
		this.classList.add('bl-anim');
		this.setup();
		new MutationObserver(() => this.draw?.()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	}

	/** Rows from the element's text: "a | b" per line. */
	rows() {
		return this.source.split('\n').map((l) => l.split('|').map((c) => c.trim())).filter((r) => r[0]);
	}

	canvas(aspect = 0.6) {
		const c = document.createElement('canvas');
		this.append(c);
		const fit = () => {
			const w = c.clientWidth || 600;
			const dpr = window.devicePixelRatio || 1;
			c.width = w * dpr;
			c.height = w * aspect * dpr;
			c.style.height = `${w * aspect}px`;
			const ctx = c.getContext('2d');
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			this.W = w;
			this.H = w * aspect;
			this.draw?.();
		};
		this.ctx = c.getContext('2d');
		new ResizeObserver(fit).observe(c);
		this.cv = c;
		return c;
	}

	controls() {
		const d = document.createElement('div');
		d.className = 'bl-controls';
		this.append(d);
		return d;
	}

	slider(parent, label, min, max, step, value, on) {
		const l = document.createElement('label');
		const out = document.createElement('span');
		out.className = 'bl-out';
		const i = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value });
		const show = () => (out.textContent = Number(i.value).toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0));
		i.addEventListener('input', () => {
			show();
			on(Number(i.value));
		});
		show();
		l.append(label, i, out);
		parent.append(l);
		return i;
	}

	button(parent, label, on) {
		const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
		b.addEventListener('click', on);
		parent.append(b);
		return b;
	}

	select(parent, label, options, value, on) {
		const l = document.createElement('label');
		const s = document.createElement('select');
		for (const [v, t] of options) s.append(Object.assign(document.createElement('option'), { value: v, textContent: t }));
		s.value = value;
		s.addEventListener('change', () => on(s.value));
		l.append(label, s);
		parent.append(l);
		return s;
	}

	text(parent, initial = '') {
		const s = document.createElement('span');
		s.className = 'bl-out';
		s.textContent = initial;
		parent.append(s);
		return s;
	}

	/** requestAnimationFrame loop that only runs while the element is on screen. */
	loop(step) {
		let visible = false, last = 0;
		const tick = (t) => {
			if (!visible) return;
			const dt = Math.min(0.05, (t - (last || t)) / 1000);
			last = t;
			step(dt);
			requestAnimationFrame(tick);
		};
		new IntersectionObserver(([e]) => {
			const was = visible;
			visible = e.isIntersecting;
			if (visible && !was) { last = 0; requestAnimationFrame(tick); }
		}).observe(this);
	}

	clear() {
		this.ctx.clearRect(0, 0, this.W, this.H);
	}
}

/** Coordinate system helper for math plots. */
export function plane(el, xmin, xmax, ymin, ymax) {
	const sx = (x) => ((x - xmin) / (xmax - xmin)) * el.W;
	const sy = (y) => el.H - ((y - ymin) / (ymax - ymin)) * el.H;
	const ix = (px) => xmin + (px / el.W) * (xmax - xmin);
	return { sx, sy, ix };
}

export function axes(el, p, xmin, xmax, ymin, ymax, step = 1) {
	const { ctx } = el, c = palette();
	ctx.lineWidth = 1;
	ctx.strokeStyle = c.grid;
	ctx.globalAlpha = 0.5;
	for (let x = Math.ceil(xmin / step) * step; x <= xmax; x += step) line(ctx, p.sx(x), 0, p.sx(x), el.H);
	for (let y = Math.ceil(ymin / step) * step; y <= ymax; y += step) line(ctx, 0, p.sy(y), el.W, p.sy(y));
	ctx.globalAlpha = 1;
	ctx.strokeStyle = c.dim;
	line(ctx, p.sx(xmin), p.sy(0), p.sx(xmax), p.sy(0));
	line(ctx, p.sx(0), p.sy(ymin), p.sx(0), p.sy(ymax));
}

export function line(ctx, x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

export function dot(ctx, x, y, r, fill) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fillStyle = fill;
	ctx.fill();
}

export function label(ctx, txt, x, y, color, size = 13, align = 'center') {
	ctx.fillStyle = color;
	ctx.font = `${size}px system-ui, sans-serif`;
	ctx.textAlign = align;
	ctx.textBaseline = 'middle';
	ctx.direction = 'ltr';
	ctx.fillText(txt, x, y);
}

export function plot(el, p, f, xmin, xmax, color, width = 2.5) {
	const { ctx } = el;
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.beginPath();
	let started = false;
	for (let px = 0; px <= el.W; px += 2) {
		const y = f(p.ix(px));
		if (!Number.isFinite(y) || Math.abs(y) > 1e4) { started = false; continue; }
		started ? ctx.lineTo(px, p.sy(y)) : ctx.moveTo(px, p.sy(y));
		started = true;
	}
	ctx.stroke();
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function define(name, cls) {
	if (!customElements.get(name)) customElements.define(name, cls);
}
