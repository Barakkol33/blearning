// High-school math animations (Bagrut 5 units).
import { BlElement, palette, line, dot, label, plane, axes, plot, define } from './base.js';

const TAU = Math.PI * 2;
const deg = (r) => (r * 180) / Math.PI;
const fx = (v, d = 2) => (Math.abs(v) < 1e-9 ? '0' : Number(v.toFixed(d)).toString());

/** Explanation box under an animation: one line per fact, each line with its own text direction. */
export function outBox(el, initial = '') {
	if (!document.getElementById('bl-lines-css')) {
		const st = Object.assign(document.createElement('style'), { id: 'bl-lines-css' });
		st.textContent = '.bl-lines{margin-top:.5rem;font-size:.9rem;line-height:1.6;font-variant-numeric:tabular-nums}.bl-lines div{text-align:right}';
		document.head.append(st);
	}
	const d = document.createElement('div');
	d.className = 'bl-lines';
	el.append(d);
	say(d, initial);
	return d;
}

/** Facts are separated by " · " in the text. */
export function say(d, text) {
	if (d._t === text) return;
	d._t = text;
	d.replaceChildren(...String(text).split(/\s+·\s+/).filter(Boolean).map((t) => Object.assign(document.createElement('div'), { textContent: t, dir: 'auto' })));
}

export function arrow(ctx, x1, y1, x2, y2, color, w = 2.5) {
	const a = Math.atan2(y2 - y1, x2 - x1), h = Math.min(10, Math.hypot(x2 - x1, y2 - y1) * 0.4);
	ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
	line(ctx, x1, y1, x2, y2);
	ctx.beginPath(); ctx.moveTo(x2, y2);
	ctx.lineTo(x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4));
	ctx.lineTo(x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4));
	ctx.closePath(); ctx.fill();
}

/** Pointer dragging on the element's canvas. pick(x, y) → handle or null; move(handle, x, y). */
export function draggable(el, pick, move) {
	let held = null;
	const pos = (e) => { const r = el.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
	el.cv.addEventListener('pointerdown', (e) => { held = pick(...pos(e)); if (held != null) el.cv.setPointerCapture(e.pointerId); });
	el.cv.addEventListener('pointermove', (e) => { if (held != null) { move(held, ...pos(e)); el.draw(); } });
	const up = () => (held = null);
	el.cv.addEventListener('pointerup', up); el.cv.addEventListener('pointercancel', up);
}

function arcMark(ctx, x, y, r, a1, a2, color) {
	ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
	let d = a2 - a1; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
	ctx.arc(x, y, r, a1, a1 + d, d < 0); ctx.stroke();
}

// <bl-sequence type="arithmetic|geometric">
class Sequence extends BlElement {
	setup() {
		this.geo = this.getAttribute('type') === 'geometric';
		this.canvas(0.5);
		const c = this.controls();
		this.a1 = this.geo ? 1 : 2; this.d = this.geo ? 1.5 : 1.5; this.n = 8;
		this.select(c, 'סדרה', [['arithmetic', 'חשבונית'], ['geometric', 'הנדסית']], this.geo ? 'geometric' : 'arithmetic', (v) => {
			this.geo = v === 'geometric'; this.dIn.min = this.geo ? -2 : -3; this.dIn.max = this.geo ? 2 : 3; this.d = Number(this.dIn.value); this.draw();
		});
		this.slider(c, 'a₁', -5, 10, 0.5, this.a1, (v) => { this.a1 = v; this.draw(); });
		this.dIn = this.slider(c, 'd / q', this.geo ? -2 : -3, this.geo ? 2 : 3, 0.1, this.d, (v) => { this.d = v; this.draw(); });
		this.slider(c, 'n', 1, 15, 1, this.n, (v) => { this.n = v; this.draw(); });
		this.out = outBox(this);
	}
	term(k) { return this.geo ? this.a1 * this.d ** (k - 1) : this.a1 + (k - 1) * this.d; }
	draw() {
		if (!this.W) return;
		const { ctx, W, H, n } = this, col = palette();
		this.clear();
		const vals = Array.from({ length: n }, (_, i) => this.term(i + 1));
		const m = Math.max(1, ...vals.map(Math.abs)), y0 = H / 2, bw = (W - 40) / 15;
		ctx.strokeStyle = col.dim; line(ctx, 20, y0, W - 20, y0);
		vals.forEach((v, i) => {
			const x = 20 + i * bw + bw * 0.15, h = (v / m) * (H / 2 - 28);
			ctx.fillStyle = col.series[i === n - 1 ? 1 : 0]; ctx.fillRect(x, y0 - Math.max(h, 0), bw * 0.7, Math.abs(h));
			label(ctx, fx(v, 1), x + bw * 0.35, y0 - h + (h >= 0 ? -10 : 10), col.text, 11);
			label(ctx, `a${i + 1}`, x + bw * 0.35, y0 + (h >= 0 ? 12 : -12), col.dim, 10);
		});
		const S = this.geo ? (this.d === 1 ? this.a1 * n : (this.a1 * (this.d ** n - 1)) / (this.d - 1)) : (n * (2 * this.a1 + (n - 1) * this.d)) / 2;
		const an = this.geo ? 'aₙ = a₁·qⁿ⁻¹' : 'aₙ = a₁ + (n−1)d';
		say(this.out, `${an} = ${fx(vals[n - 1])}   Sₙ = ${fx(S)}`);
	}
}

// <bl-meeting> two movers toward each other / one chasing the other
class Meeting extends BlElement {
	setup() {
		this.canvas(0.32);
		const c = this.controls();
		this.D = 120; this.v1 = 50; this.v2 = 30; this.mode = 'toward'; this.t = 0; this.run = false;
		this.select(c, 'מצב', [['toward', 'נעים זה לקראת זה'], ['chase', 'אחד רודף אחרי השני']], this.mode, (v) => { this.mode = v; this.t = 0; this.draw(); });
		this.slider(c, 'מרחק (ק"מ)', 20, 200, 10, this.D, (v) => { this.D = v; this.t = 0; this.draw(); });
		this.slider(c, 'v₁ (קמ"ש)', 10, 100, 5, this.v1, (v) => { this.v1 = v; this.t = 0; this.draw(); });
		this.slider(c, 'v₂ (קמ"ש)', 10, 100, 5, this.v2, (v) => { this.v2 = v; this.t = 0; this.draw(); });
		this.button(c, 'סע', () => { this.t = 0; this.run = true; });
		this.out = outBox(this);
		this.loop((dt) => { if (this.run) { this.t += dt * 0.6; if (this.t >= this.meet() || this.t > 10) { this.t = Math.min(this.meet(), 10); this.run = false; } } this.draw(); });
	}
	meet() { const rel = this.mode === 'toward' ? this.v1 + this.v2 : this.v1 - this.v2; return rel > 0 ? this.D / rel : Infinity; }
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), L = this.mode === 'toward' ? this.D : this.D * 2.2, s = (W - 60) / L, y = H * 0.55;
		this.clear();
		ctx.strokeStyle = col.dim; ctx.lineWidth = 2; line(ctx, 30, y, W - 30, y);
		const x1 = this.v1 * this.t, x2 = this.mode === 'toward' ? this.D - this.v2 * this.t : this.D + this.v2 * this.t;
		dot(ctx, 30 + x1 * s, y, 9, col.series[0]); label(ctx, 'A', 30 + x1 * s, y - 20, col.series[0]);
		dot(ctx, 30 + x2 * s, y, 9, col.series[1]); label(ctx, 'B', 30 + x2 * s, y - 20, col.series[1]);
		label(ctx, `t = ${fx(this.t)} h`, W / 2, 16, col.text);
		const T = this.meet();
		say(this.out, Number.isFinite(T)
			? `${this.mode === 'toward' ? 'זמן מפגש: t = D/(v₁+v₂)' : 'זמן השגה: t = D/(v₁−v₂)'} = ${fx(T)} שעות`
			: 'A לא ישיג את B (v₁ ≤ v₂)');
	}
}

// <bl-inscribed-angle> drag A, B, C on the circle
class InscribedAngle extends BlElement {
	setup() {
		this.canvas(0.6);
		this.out = outBox(this, 'גררו את הנקודות A, B, C על המעגל');
		this.ang = { A: 3.6, B: 5.8, C: 1.6 };
		draggable(this, (x, y) => Object.keys(this.ang).find((k) => { const [px, py] = this.pt(this.ang[k]); return Math.hypot(px - x, py - y) < 18; }) ?? null,
			(k, x, y) => { this.ang[k] = Math.atan2(y - this.H / 2, x - this.W / 2); });
	}
	pt(a) { const R = this.H * 0.4; return [this.W / 2 + R * Math.cos(a), this.H / 2 + R * Math.sin(a)]; }
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), R = H * 0.4, O = [W / 2, H / 2];
		const [A, B, C] = ['A', 'B', 'C'].map((k) => this.pt(this.ang[k]));
		this.clear();
		ctx.strokeStyle = col.dim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(...O, R, 0, TAU); ctx.stroke();
		ctx.strokeStyle = col.series[1]; ctx.lineWidth = 2; line(ctx, ...O, ...A); line(ctx, ...O, ...B);
		ctx.strokeStyle = col.series[0]; line(ctx, ...C, ...A); line(ctx, ...C, ...B);
		ctx.strokeStyle = col.grid; line(ctx, ...A, ...B);
		const angAt = (P, Q1, Q2) => { let d = Math.atan2(Q2[1] - P[1], Q2[0] - P[0]) - Math.atan2(Q1[1] - P[1], Q1[0] - P[0]); d = Math.abs(((d + 3 * Math.PI) % TAU) - Math.PI); return d; };
		const ins = angAt(C, A, B);
		// central angle subtending the arc that does not contain C
		const norm = (a) => ((a % TAU) + TAU) % TAU;
		const span = norm(this.ang.B - this.ang.A), cIn = norm(this.ang.C - this.ang.A) < span;
		const central = cIn ? TAU - span : span;
		arcMark(ctx, ...C, 22, Math.atan2(A[1] - C[1], A[0] - C[0]), Math.atan2(B[1] - C[1], B[0] - C[0]), col.series[0]);
		// canvas arcs go in the direction of increasing angle; draw the arc of AOB that does not contain C
		ctx.strokeStyle = col.series[1]; ctx.lineWidth = 1.5; ctx.beginPath();
		cIn ? ctx.arc(...O, 18, this.ang.B, this.ang.A) : ctx.arc(...O, 18, this.ang.A, this.ang.B); ctx.stroke();
		for (const [P, n, c] of [[A, 'A', col.text], [B, 'B', col.text], [C, 'C', col.series[0]]]) { dot(ctx, ...P, 7, c); label(ctx, n, P[0] + (P[0] - O[0]) * 0.12, P[1] + (P[1] - O[1]) * 0.12, col.text, 14); }
		dot(ctx, ...O, 4, col.series[1]); label(ctx, 'O', O[0] + 12, O[1] + 12, col.series[1]);
		say(this.out, `זווית היקפית ACB = ${deg(ins).toFixed(1)}°   זווית מרכזית AOB = ${deg(central).toFixed(1)}° (פי 2)`);
	}
}

// <bl-triangle> law of sines / cosines with draggable vertices
class Triangle extends BlElement {
	setup() {
		this.canvas(0.6);
		this.out = outBox(this);
		this.P = [[0.25, 0.8], [0.8, 0.78], [0.45, 0.18]];
		draggable(this, (x, y) => { const i = this.P.findIndex(([px, py]) => Math.hypot(px * this.W - x, py * this.H - y) < 18); return i < 0 ? null : i; },
			(i, x, y) => { this.P[i] = [Math.min(0.97, Math.max(0.03, x / this.W)), Math.min(0.97, Math.max(0.03, y / this.H))]; });
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), u = Math.min(W, H) / 10;
		const [A, B, C] = this.P.map(([x, y]) => [x * W, y * H]);
		const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) / u;
		const a = d(B, C), b = d(A, C), c = d(A, B);
		const ang = (o, p, q) => Math.acos(Math.max(-1, Math.min(1, (o * o + p * p - q * q) / (2 * o * p))));
		const Aa = ang(b, c, a), Bb = ang(a, c, b), Cc = Math.PI - Aa - Bb;
		const R = a / (2 * Math.sin(Aa));
		this.clear();
		// circumcircle
		const D = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
		if (Math.abs(D) > 1) {
			const s = (p) => p[0] ** 2 + p[1] ** 2;
			const ox = (s(A) * (B[1] - C[1]) + s(B) * (C[1] - A[1]) + s(C) * (A[1] - B[1])) / D, oy = (s(A) * (C[0] - B[0]) + s(B) * (A[0] - C[0]) + s(C) * (B[0] - A[0])) / D;
			ctx.setLineDash([4, 5]); ctx.strokeStyle = col.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, oy, R * u, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
		}
		ctx.strokeStyle = col.series[0]; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...C); ctx.closePath(); ctx.stroke();
		const mid = (p, q, t) => label(ctx, t, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 10, col.series[1], 13);
		mid(B, C, `a=${a.toFixed(2)}`); mid(A, C, `b=${b.toFixed(2)}`); mid(A, B, `c=${c.toFixed(2)}`);
		for (const [P, n, t] of [[A, 'A', Aa], [B, 'B', Bb], [C, 'C', Cc]]) { dot(ctx, ...P, 7, col.text); label(ctx, `${n} ${deg(t).toFixed(0)}°`, P[0], P[1] + (P[1] > H / 2 ? 18 : -18), col.text, 13); }
		const area = 0.5 * a * b * Math.sin(Cc);
		say(this.out, `a/sinα = b/sinβ = c/sinγ = 2R = ${(2 * R).toFixed(2)}   שטח = ½ab·sinγ = ${area.toFixed(2)}`);
	}
}

// <bl-box-optimization> cut squares x from a square sheet L×L, maximize volume
class BoxOptimization extends BlElement {
	setup() {
		this.canvas(0.5);
		const c = this.controls();
		this.L = 30; this.x = 3;
		this.xIn = this.slider(c, 'x (גודל החיתוך)', 0.5, 14.5, 0.5, this.x, (v) => { this.x = v; this.draw(); });
		this.out = outBox(this);
	}
	V(x) { return x * (this.L - 2 * x) ** 2; }
	draw() {
		if (!this.W) return;
		const { ctx, W, H, L, x } = this, col = palette();
		this.clear();
		// the sheet
		const s = (Math.min(W * 0.4, H) - 30) / L, ox = 15, oy = (H - L * s) / 2;
		ctx.strokeStyle = col.dim; ctx.strokeRect(ox, oy, L * s, L * s);
		ctx.fillStyle = col.series[3]; ctx.globalAlpha = 0.5;
		for (const [cx, cy] of [[0, 0], [L - x, 0], [0, L - x], [L - x, L - x]]) ctx.fillRect(ox + cx * s, oy + cy * s, x * s, x * s);
		ctx.globalAlpha = 1; ctx.setLineDash([4, 4]); ctx.strokeStyle = col.series[0]; ctx.strokeRect(ox + x * s, oy + x * s, (L - 2 * x) * s, (L - 2 * x) * s); ctx.setLineDash([]);
		label(ctx, `x=${x}`, ox + (x * s) / 2, oy + x * s + 10, col.text, 11);
		// V(x) graph
		const gx = W * 0.45, gw = W * 0.52, xmax = L / 2, vmax = this.V(L / 6) * 1.15;
		const p = { sx: (t) => gx + (t / xmax) * gw, sy: (v) => H - 20 - (v / vmax) * (H - 40) };
		ctx.strokeStyle = col.dim; ctx.lineWidth = 1; line(ctx, gx, H - 20, gx + gw, H - 20); line(ctx, gx, 10, gx, H - 20);
		ctx.strokeStyle = col.series[0]; ctx.lineWidth = 2.5; ctx.beginPath();
		for (let i = 0; i <= 100; i++) { const t = (xmax * i) / 100; i ? ctx.lineTo(p.sx(t), p.sy(this.V(t))) : ctx.moveTo(p.sx(t), p.sy(this.V(t))); }
		ctx.stroke();
		ctx.setLineDash([3, 4]); ctx.strokeStyle = col.series[2]; line(ctx, p.sx(L / 6), p.sy(0), p.sx(L / 6), p.sy(this.V(L / 6))); ctx.setLineDash([]);
		dot(ctx, p.sx(x), p.sy(this.V(x)), 6, col.series[1]);
		label(ctx, 'V(x)', gx + 22, 16, col.series[0]); label(ctx, 'x', gx + gw - 6, H - 8, col.dim);
		say(this.out, `V(x) = x(${L}−2x)² = ${this.V(x).toFixed(0)}   מקסימום ב-x = L/6 = ${L / 6} (V' = 0): V = ${this.V(L / 6).toFixed(0)}`);
	}
}

// <bl-exp-log> y = aˣ and y = logₐx, mirror images across y = x
class ExpLog extends BlElement {
	setup() {
		this.canvas(0.7);
		const c = this.controls();
		this.a = 2;
		this.slider(c, 'a (הבסיס)', 0.2, 4, 0.1, this.a, (v) => { this.a = Math.abs(v - 1) < 0.05 ? 1.1 : v; this.draw(); });
		this.out = outBox(this);
	}
	draw() {
		if (!this.W) return;
		const col = palette(), r = 5, p = plane(this, -r * 1.4, r * 1.4, -r, r);
		this.clear(); axes(this, p, -r * 1.4, r * 1.4, -r, r);
		const { ctx } = this;
		ctx.setLineDash([5, 5]); plot(this, p, (x) => x, -r * 1.4, r * 1.4, col.dim, 1); ctx.setLineDash([]);
		plot(this, p, (x) => this.a ** x, -r * 1.4, r * 1.4, col.series[0]);
		plot(this, p, (x) => (x > 0 ? Math.log(x) / Math.log(this.a) : NaN), -r * 1.4, r * 1.4, col.series[1]);
		dot(ctx, p.sx(0), p.sy(1), 5, col.series[0]); dot(ctx, p.sx(1), p.sy(0), 5, col.series[1]);
		label(ctx, 'y = aˣ', p.sx(-3), p.sy(this.a > 1 ? 0.6 : 4), col.series[0]);
		label(ctx, 'y = logₐx', p.sx(4.5), p.sy(this.a > 1 ? 1.8 : -1.8), col.series[1]);
		say(this.out, `${this.a > 1 ? 'a > 1: עולות' : '0 < a < 1: יורדות'}  ·  aˣ עוברת ב-(0,1), logₐx עוברת ב-(1,0)  ·  הגרפים סימטריים סביב y = x`);
	}
}

// <bl-complex> drag z; show powers zⁿ or the n-th roots of z
class Complex extends BlElement {
	setup() {
		this.canvas(0.75);
		const c = this.controls();
		this.z = [1.1, 0.6]; this.n = 3; this.mode = 'powers';
		this.select(c, 'הצג', [['powers', 'חזקות z, z², …, zⁿ'], ['roots', 'השורשים מסדר n של z']], this.mode, (v) => { this.mode = v; this.draw(); });
		this.slider(c, 'n', 2, 8, 1, this.n, (v) => { this.n = v; this.draw(); });
		this.out = outBox(this);
		draggable(this, () => 'z', (_, x, y) => { const p = this.p; this.z = [p.ix(x), (this.H / 2 - y) / (this.H / 2) * this.r]; });
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), r = (this.r = 2.5), xr = (r * W) / H;
		const p = (this.p = plane(this, -xr, xr, -r, r));
		this.clear(); axes(this, p, -xr, xr, -r, r, 0.5);
		const [a, b] = this.z, m = Math.hypot(a, b), th = Math.atan2(b, a);
		ctx.strokeStyle = col.grid; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(p.sx(0), p.sy(0), (m / (2 * r)) * H, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
		const pts = this.mode === 'powers'
			? Array.from({ length: this.n }, (_, k) => [m ** (k + 1), th * (k + 1), `z${k ? k + 1 : ''}`])
			: Array.from({ length: this.n }, (_, k) => [m ** (1 / this.n), (th + TAU * k) / this.n, `w${k}`]);
		if (this.mode === 'roots') { ctx.strokeStyle = col.series[2]; ctx.lineWidth = 1.5; ctx.beginPath(); pts.forEach(([R, t], i) => { const x = p.sx(R * Math.cos(t)), y = p.sy(R * Math.sin(t)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.stroke(); }
		pts.forEach(([R, t, n], i) => {
			const x = p.sx(R * Math.cos(t)), y = p.sy(R * Math.sin(t));
			arrow(ctx, p.sx(0), p.sy(0), x, y, col.series[this.mode === 'roots' ? 2 : (i + 1) % 8], 1.8);
			label(ctx, n, x + 12, y - 10, col.text, 12);
		});
		arrow(ctx, p.sx(0), p.sy(0), p.sx(a), p.sy(b), col.series[0], 3);
		dot(ctx, p.sx(a), p.sy(b), 8, col.series[0]);
		label(ctx, 'Re', W - 14, p.sy(0) - 10, col.dim); label(ctx, 'Im', p.sx(0) + 14, 10, col.dim);
		say(this.out, `z = ${fx(a)} + ${fx(b)}i = ${fx(m)}·cis ${deg(th).toFixed(0)}°  ·  ${this.mode === 'powers' ? 'zⁿ = rⁿ·cis(nθ)' : 'השורשים על מעגל ברדיוס ⁿ√r, במרווחים של 360°/n'}`);
	}
}

// <bl-conic mode="ellipse|parabola">
class Conic extends BlElement {
	setup() {
		this.mode = this.getAttribute('mode') || 'ellipse';
		this.canvas(0.65);
		const c = this.controls();
		this.a = 4; this.b = 2.5; this.pp = 1.5; this.t = 0.8;
		this.select(c, 'עקומה', [['ellipse', 'אליפסה'], ['parabola', 'פרבולה']], this.mode, (v) => { this.mode = v; this.build(); });
		this.box = document.createElement('span'); c.append(this.box);
		this.out = outBox(this);
		this.build();
		this.loop((dt) => { this.t += dt * 0.5; this.draw(); });
	}
	build() {
		this.box.textContent = '';
		if (this.mode === 'ellipse') {
			this.slider(this.box, 'a', 1, 5, 0.1, this.a, (v) => { this.a = Math.max(v, this.b + 0.01); });
			this.slider(this.box, 'b', 0.5, 4.9, 0.1, this.b, (v) => { this.b = Math.min(v, this.a - 0.01); });
		} else this.slider(this.box, 'p', 0.5, 4, 0.1, this.pp, (v) => (this.pp = v));
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), r = 6, xr = (r * W) / H, p = plane(this, -xr, xr, -r, r);
		this.clear(); axes(this, p, -xr, xr, -r, r);
		ctx.lineWidth = 2.5; ctx.strokeStyle = col.series[0]; ctx.beginPath();
		if (this.mode === 'ellipse') {
			const { a, b } = this, c = Math.sqrt(a * a - b * b);
			for (let i = 0; i <= 100; i++) { const t = (TAU * i) / 100, x = p.sx(a * Math.cos(t)), y = p.sy(b * Math.sin(t)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
			ctx.stroke();
			const P = [a * Math.cos(this.t), b * Math.sin(this.t)], F1 = [-c, 0], F2 = [c, 0];
			ctx.strokeStyle = col.series[1]; ctx.lineWidth = 2; line(ctx, p.sx(F1[0]), p.sy(0), p.sx(P[0]), p.sy(P[1]));
			ctx.strokeStyle = col.series[2]; line(ctx, p.sx(F2[0]), p.sy(0), p.sx(P[0]), p.sy(P[1]));
			dot(ctx, p.sx(F1[0]), p.sy(0), 5, col.text); dot(ctx, p.sx(F2[0]), p.sy(0), 5, col.text); dot(ctx, p.sx(P[0]), p.sy(P[1]), 7, col.series[3]);
			label(ctx, 'F₁', p.sx(F1[0]), p.sy(0) + 14, col.text); label(ctx, 'F₂', p.sx(F2[0]), p.sy(0) + 14, col.text);
			const d1 = Math.hypot(P[0] - F1[0], P[1]), d2 = Math.hypot(P[0] - F2[0], P[1]);
			say(this.out, `x²/a² + y²/b² = 1  ·  c = √(a²−b²) = ${fx(c)}  ·  PF₁ + PF₂ = ${fx(d1)} + ${fx(d2)} = ${fx(d1 + d2)} = 2a`);
		} else {
			const q = this.pp;
			for (let i = 0; i <= 100; i++) { const y = -r + (2 * r * i) / 100, x = (y * y) / (2 * q); i ? ctx.lineTo(p.sx(x), p.sy(y)) : ctx.moveTo(p.sx(x), p.sy(y)); }
			ctx.stroke();
			const y = 4 * Math.sin(this.t), P = [(y * y) / (2 * q), y], F = [q / 2, 0];
			ctx.setLineDash([5, 5]); ctx.strokeStyle = col.dim; line(ctx, p.sx(-q / 2), 0, p.sx(-q / 2), H); ctx.setLineDash([]);
			ctx.strokeStyle = col.series[1]; ctx.lineWidth = 2; line(ctx, p.sx(F[0]), p.sy(0), p.sx(P[0]), p.sy(P[1]));
			ctx.strokeStyle = col.series[2]; line(ctx, p.sx(-q / 2), p.sy(P[1]), p.sx(P[0]), p.sy(P[1]));
			dot(ctx, p.sx(F[0]), p.sy(0), 5, col.text); dot(ctx, p.sx(P[0]), p.sy(P[1]), 7, col.series[3]);
			label(ctx, 'F', p.sx(F[0]) + 10, p.sy(0) + 14, col.text); label(ctx, `x = −p/2`, p.sx(-q / 2) - 34, 14, col.dim, 12);
			const dF = Math.hypot(P[0] - F[0], P[1]), dL = P[0] + q / 2;
			say(this.out, `y² = 2px  ·  מרחק מהמוקד ${fx(dF)} = מרחק מהמדריך ${fx(dL)}`);
		}
	}
}

// <bl-vectors> two draggable vectors: sum, difference, dot product, angle
class Vectors extends BlElement {
	setup() {
		this.canvas(0.65);
		const c = this.controls();
		this.u = [3, 1]; this.v = [1, 2.5]; this.show = 'sum';
		this.select(c, 'הצג', [['sum', 'u + v (מקבילית)'], ['diff', 'u − v'], ['proj', 'היטל של u על v']], this.show, (s) => { this.show = s; this.draw(); });
		this.out = outBox(this);
		draggable(this, (x, y) => ['u', 'v'].find((k) => Math.hypot(this.p.sx(this[k][0]) - x, this.p.sy(this[k][1]) - y) < 18) ?? null,
			(k, x, y) => { this[k] = [Math.round(this.p.ix(x) * 2) / 2, Math.round(((this.H - y) / this.H * 2 * this.r - this.r) * 2) / 2]; });
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), r = (this.r = 5), xr = (r * W) / H, p = (this.p = plane(this, -xr, xr, -r, r));
		this.clear(); axes(this, p, -xr, xr, -r, r);
		const O = [p.sx(0), p.sy(0)], S = (v) => [p.sx(v[0]), p.sy(v[1])], { u, v } = this;
		const dotp = u[0] * v[0] + u[1] * v[1], lu = Math.hypot(...u), lv = Math.hypot(...v);
		if (this.show === 'sum') {
			const s = [u[0] + v[0], u[1] + v[1]];
			ctx.setLineDash([4, 4]); ctx.strokeStyle = col.grid; line(ctx, ...S(u), ...S(s)); line(ctx, ...S(v), ...S(s)); ctx.setLineDash([]);
			arrow(ctx, ...O, ...S(s), col.series[2], 3); label(ctx, 'u+v', S(s)[0] + 16, S(s)[1] - 10, col.series[2]);
		} else if (this.show === 'diff') {
			arrow(ctx, ...S(v), ...S(u), col.series[3], 3); label(ctx, 'u−v', (S(u)[0] + S(v)[0]) / 2 + 14, (S(u)[1] + S(v)[1]) / 2, col.series[3]);
		} else if (lv) {
			const k = dotp / (lv * lv), pr = [v[0] * k, v[1] * k];
			ctx.setLineDash([4, 4]); ctx.strokeStyle = col.grid; line(ctx, ...S(u), ...S(pr)); ctx.setLineDash([]);
			arrow(ctx, ...O, ...S(pr), col.series[2], 3); label(ctx, 'היטל', S(pr)[0] + 18, S(pr)[1] + 12, col.series[2]);
		}
		arrow(ctx, ...O, ...S(u), col.series[0], 3); arrow(ctx, ...O, ...S(v), col.series[1], 3);
		dot(ctx, ...S(u), 6, col.series[0]); dot(ctx, ...S(v), 6, col.series[1]);
		label(ctx, `u(${u})`, S(u)[0] + 18, S(u)[1] - 12, col.series[0]); label(ctx, `v(${v})`, S(v)[0] + 18, S(v)[1] - 12, col.series[1]);
		const ang = lu && lv ? deg(Math.acos(Math.max(-1, Math.min(1, dotp / (lu * lv))))) : 0;
		say(this.out, `u·v = ${fx(dotp)}  ·  |u| = ${fx(lu)}, |v| = ${fx(lv)}  ·  זווית = ${ang.toFixed(1)}°${Math.abs(dotp) < 1e-9 ? ' (מאונכים)' : ''}`);
	}
}

// <bl-solid shape="box|pyramid|prism|cylinder|cone"> rotatable 3D solid with the key segments and angles
class Solid extends BlElement {
	setup() {
		this.shape = this.getAttribute('shape') || 'box';
		this.canvas(0.7);
		const c = this.controls();
		this.yaw = -0.6; this.pitch = 0.35; this.dim = { a: 4, b: 3, h: 3 };
		this.select(c, 'גוף', [['box', 'תיבה'], ['pyramid', 'פירמידה ריבועית'], ['prism', 'מנסרה משולשת'], ['cylinder', 'גליל'], ['cone', 'חרוט']], this.shape, (v) => { this.shape = v; this.draw(); });
		this.slider(c, 'a', 1, 6, 0.5, this.dim.a, (v) => { this.dim.a = v; this.draw(); });
		this.slider(c, 'b', 1, 6, 0.5, this.dim.b, (v) => { this.dim.b = v; this.draw(); });
		this.slider(c, 'h', 1, 6, 0.5, this.dim.h, (v) => { this.dim.h = v; this.draw(); });
		this.out = outBox(this);
		let last = null;
		this.cv.addEventListener('pointerdown', (e) => { last = [e.clientX, e.clientY]; this.cv.setPointerCapture(e.pointerId); });
		this.cv.addEventListener('pointermove', (e) => {
			if (!last) return;
			this.yaw += (e.clientX - last[0]) * 0.01; this.pitch = Math.max(-0.2, Math.min(1.4, this.pitch + (e.clientY - last[1]) * 0.01));
			last = [e.clientX, e.clientY]; this.draw();
		});
		this.cv.addEventListener('pointerup', () => (last = null));
		this.loop((dt) => { if (!last && this.spin !== false) { this.yaw += dt * 0.25; this.draw(); } });
		this.cv.addEventListener('dblclick', () => (this.spin = this.spin === false));
	}
	rot([x, y, z]) {
		const { yaw, pitch } = this, x1 = x * Math.cos(yaw) - z * Math.sin(yaw), z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
		return [x1, y * Math.cos(pitch) - z1 * Math.sin(pitch), y * Math.sin(pitch) + z1 * Math.cos(pitch)];
	}
	proj(v) {
		const [x, y, d] = this.rot(v);
		return [this.W / 2 + x * this.s, this.cy - y * this.s, d];
	}
	draw() {
		if (!this.W) return;
		const { ctx } = this, col = palette(), { a, b, h } = this.dim;
		// fit the solid: scale by its largest dimension, and center it vertically
		this.s = Math.min(this.W, this.H) / (Math.max(a, b, h) + 2.5);
		this.cy = this.H / 2 + (h * this.s * Math.cos(this.pitch)) / 2;
		this.clear();
		const P = (v) => this.proj(v);
		const seg = (p, q, color, w = 2, dash) => { const A = P(p), B = P(q); ctx.setLineDash(dash ? [5, 5] : []); ctx.strokeStyle = color; ctx.lineWidth = w; line(ctx, A[0], A[1], B[0], B[1]); ctx.setLineDash([]); };
		const lab = (v, t, color) => { const A = P(v); label(ctx, t, A[0] + 10, A[1] - 10, color, 13); };
		const angleMark = (o, p, q, color) => { const O = P(o), A = P(p), B = P(q); arcMark(ctx, O[0], O[1], 20, Math.atan2(A[1] - O[1], A[0] - O[0]), Math.atan2(B[1] - O[1], B[0] - O[0]), color); };
		const edges = (V, F, E) => {
			// a face is visible when its outward normal points toward the viewer (positive depth after rotation);
			// an edge is dashed (hidden) when none of the faces it bounds is visible
			const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
			const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
			const center = V.reduce((s, v) => [s[0] + v[0] / V.length, s[1] + v[1] / V.length, s[2] + v[2] / V.length], [0, 0, 0]);
			const facing = F.map((f) => {
				const [p0, p1, p2] = f.map((i) => V[i]);
				let n = cross(sub(p1, p0), sub(p2, p0));
				const fc = f.reduce((s, i) => [s[0] + V[i][0] / f.length, s[1] + V[i][1] / f.length, s[2] + V[i][2] / f.length], [0, 0, 0]);
				const out = sub(fc, center);
				if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) n = n.map((c) => -c);
				return this.rot(n)[2] > 1e-9;
			});
			for (const [i, j] of E) {
				const vis = F.some((f, k) => facing[k] && f.includes(i) && f.includes(j) && (Math.abs(f.indexOf(i) - f.indexOf(j)) === 1 || Math.abs(f.indexOf(i) - f.indexOf(j)) === f.length - 1));
				seg(V[i], V[j], col.text, 2, !vis);
			}
		};
		let info = '';
		if (this.shape === 'box') {
			const V = [[-a / 2, 0, -b / 2], [a / 2, 0, -b / 2], [a / 2, 0, b / 2], [-a / 2, 0, b / 2]].flatMap((p) => [p]).concat([[-a / 2, h, -b / 2], [a / 2, h, -b / 2], [a / 2, h, b / 2], [-a / 2, h, b / 2]]);
			const F = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
			const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
			edges(V, F, E);
			seg(V[0], V[2], col.series[1], 2.5); seg(V[0], V[6], col.series[3], 3); seg(V[2], V[6], col.series[2], 2.5);
			angleMark(V[0], V[2], V[6], col.series[3]);
			['A', 'B', 'C', 'D', "A'", "B'", "C'", "D'"].forEach((n, i) => lab(V[i], n, col.dim));
			const base = Math.hypot(a, b), d = Math.hypot(a, b, h);
			info = `אלכסון הבסיס AC = √(a²+b²) = ${fx(base)}  ·  אלכסון התיבה AC' = √(a²+b²+h²) = ${fx(d)}  ·  הזווית בין AC' לבסיס: tan α = h/AC → α = ${deg(Math.atan(h / base)).toFixed(1)}°  ·  נפח = abh = ${fx(a * b * h)}`;
		} else if (this.shape === 'pyramid') {
			const V = [[-a / 2, 0, -a / 2], [a / 2, 0, -a / 2], [a / 2, 0, a / 2], [-a / 2, 0, a / 2], [0, h, 0]];
			const F = [[0, 3, 2, 1], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]];
			const E = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4]];
			edges(V, F, E);
			const O = [0, 0, 0], M = [a / 2, 0, 0];
			seg(V[4], O, col.series[2], 2.5, true); seg(O, V[2], col.series[1], 2, true); seg(O, M, col.series[0], 2, true); seg(V[4], M, col.series[0], 2.5);
			angleMark(V[2], O, V[4], col.series[1]); angleMark(M, O, V[4], col.series[0]);
			['A', 'B', 'C', 'D', 'S'].forEach((n, i) => lab(V[i], n, col.dim)); lab(O, 'O', col.series[2]); lab(M, 'M', col.series[0]);
			const half = (a * Math.SQRT2) / 2, ap = Math.hypot(h, a / 2);
			info = `גובה SO = ${fx(h)}  ·  מקצוע צדדי SC = ${fx(Math.hypot(h, half))}, הזווית שלו עם הבסיס: ${deg(Math.atan(h / half)).toFixed(1)}°  ·  גובה הפאה (אפותמה) SM = ${fx(ap)}, הזווית בין הפאה לבסיס: ${deg(Math.atan(h / (a / 2))).toFixed(1)}°  ·  נפח = ⅓a²h = ${fx((a * a * h) / 3)}`;
		} else if (this.shape === 'prism') {
			const tri = [[-a / 2, 0, -b / 3], [a / 2, 0, -b / 3], [0, 0, (2 * b) / 3]];
			const V = [...tri, ...tri.map(([x, , z]) => [x, h, z])];
			const F = [[0, 2, 1], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]];
			const E = [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]];
			edges(V, F, E);
			seg(V[0], V[4], col.series[3], 2.5); seg(V[1], V[4], col.series[2], 2.5); angleMark(V[0], V[1], V[4], col.series[3]);
			['A', 'B', 'C', "A'", "B'", "C'"].forEach((n, i) => lab(V[i], n, col.dim));
			info = `אלכסון הפאה AB' = √(a²+h²) = ${fx(Math.hypot(a, h))}, הזווית שלו עם הבסיס: ${deg(Math.atan(h / a)).toFixed(1)}°  ·  נפח = שטח הבסיס × h = ${fx(0.5 * a * b * h)}`;
		} else {
			const R = a / 2, n = 48, ring = (y) => Array.from({ length: n }, (_, i) => [R * Math.cos((TAU * i) / n), y, R * Math.sin((TAU * i) / n)]);
			const drawRing = (pts, color) => { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((v, i) => { const [x, y] = P(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.stroke(); };
			drawRing(ring(0), col.text);
			// silhouette: the two points of the base circle farthest left/right on screen
			const side = ring(0).map((v) => [P(v)[0], v]).sort((p, q) => p[0] - q[0]);
			const L = side[0][1], Rt = side.at(-1)[1];
			if (this.shape === 'cylinder') {
				drawRing(ring(h), col.text);
				seg(L, [L[0], h, L[2]], col.text); seg(Rt, [Rt[0], h, Rt[2]], col.text);
				seg([0, 0, 0], [0, h, 0], col.series[2], 2.5, true); seg([0, 0, 0], [R, 0, 0], col.series[1], 2.5);
				info = `רדיוס r = ${fx(R)}, גובה h = ${fx(h)}  ·  נפח = πr²h = ${fx(Math.PI * R * R * h)}  ·  מעטפת = 2πrh = ${fx(TAU * R * h)}`;
			} else {
				const S = [0, h, 0];
				seg(L, S, col.text); seg(Rt, S, col.text);
				seg([0, 0, 0], S, col.series[2], 2.5, true); seg([0, 0, 0], [R, 0, 0], col.series[1], 2.5); seg([R, 0, 0], S, col.series[3], 2.5);
				angleMark([R, 0, 0], [0, 0, 0], S, col.series[3]);
				const l = Math.hypot(R, h);
				info = `רדיוס r = ${fx(R)}, גובה h = ${fx(h)}, קו יוצר l = √(r²+h²) = ${fx(l)}  ·  הזווית בין הקו היוצר לבסיס: ${deg(Math.atan(h / R)).toFixed(1)}°  ·  נפח = ⅓πr²h = ${fx((Math.PI * R * R * h) / 3)}  ·  מעטפת = πrl = ${fx(Math.PI * R * l)}`;
			}
		}
		say(this.out, `${info}  ·  גררו כדי לסובב. לחיצה כפולה עוצרת או ממשיכה את הסיבוב.`);
	}
}

define('bl-sequence', Sequence);
define('bl-meeting', Meeting);
define('bl-inscribed-angle', InscribedAngle);
define('bl-triangle', Triangle);
define('bl-box-optimization', BoxOptimization);
define('bl-exp-log', ExpLog);
define('bl-complex', Complex);
define('bl-conic', Conic);
define('bl-vectors', Vectors);
define('bl-solid', Solid);
