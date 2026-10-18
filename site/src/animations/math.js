import { BlElement, palette, plane, axes, plot, line, dot, label, define } from './base.js';

// <bl-function-graph preset="linear|parabola|exponential|tangent">
class FunctionGraph extends BlElement {
	setup() {
		this.preset = this.getAttribute('preset') || 'parabola';
		this.canvas(0.65);
		const c = this.controls();
		const P = {
			linear: { p: { m: 1, b: 0 }, r: { m: [-4, 4, 0.1], b: [-5, 5, 0.5] }, f: (x, p) => p.m * x + p.b, fmt: (p) => `y = ${p.m.toFixed(1)}x + ${p.b.toFixed(1)}` },
			parabola: { p: { a: 1, b: 0, c: -2 }, r: { a: [-3, 3, 0.1], b: [-5, 5, 0.5], c: [-5, 5, 0.5] }, f: (x, p) => p.a * x * x + p.b * x + p.c, fmt: (p) => `y = ${p.a.toFixed(1)}x² + ${p.b.toFixed(1)}x + ${p.c.toFixed(1)}` },
			exponential: { p: { a: 1, base: 1.5 }, r: { a: [0.5, 3, 0.1], base: [0.3, 3, 0.05] }, f: (x, p) => p.a * p.base ** x, fmt: (p) => `y = ${p.a.toFixed(1)} · ${p.base.toFixed(2)}ˣ` },
			tangent: { p: { x0: 1 }, r: { x0: [-3, 3, 0.05] }, f: (x) => x ** 3 / 3 - x, fmt: (p) => `f'(${p.x0.toFixed(2)}) = ${(p.x0 ** 2 - 1).toFixed(2)}` },
		}[this.preset];
		this.P = P;
		this.p = { ...P.p };
		for (const [k, [mn, mx, st]] of Object.entries(P.r)) this.slider(c, k, mn, mx, st, this.p[k], (v) => { this.p[k] = v; this.draw(); });
		this.out = this.text(c);
		this.draw();
	}
	draw() {
		if (!this.W) return;
		const col = palette(), X = 6, Y = 6 * (this.H / this.W);
		this.clear();
		const p = plane(this, -X, X, -Y, Y);
		axes(this, p, -X, X, -Y, Y);
		plot(this, p, (x) => this.P.f(x, this.p), -X, X, col.series[0]);
		if (this.preset === 'tangent') {
			const x0 = this.p.x0, y0 = this.P.f(x0), m = x0 * x0 - 1;
			this.ctx.setLineDash([6, 4]);
			plot(this, p, (x) => y0 + m * (x - x0), -X, X, col.series[1], 2);
			this.ctx.setLineDash([]);
			dot(this.ctx, p.sx(x0), p.sy(y0), 6, col.series[1]);
		}
		if (this.preset === 'parabola' && this.p.a) {
			const xv = -this.p.b / (2 * this.p.a);
			dot(this.ctx, p.sx(xv), p.sy(this.P.f(xv, this.p)), 5, col.series[1]);
		}
		this.out.textContent = this.P.fmt(this.p);
	}
}

// <bl-unit-circle>
class UnitCircle extends BlElement {
	setup() {
		this.canvas(0.5);
		const c = this.controls();
		this.a = 0.8;
		this.run = true;
		this.button(c, '⏯', () => (this.run = !this.run));
		this.out = this.text(c);
		this.loop((dt) => { if (this.run) { this.a = (this.a + dt * 0.8) % (Math.PI * 2); this.draw(); } });
		this.draw();
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), r = H * 0.38, cx = H * 0.5, cy = H / 2;
		this.clear();
		ctx.strokeStyle = col.grid; ctx.lineWidth = 1;
		line(ctx, cx - r - 10, cy, cx + r + 10, cy); line(ctx, cx, cy - r - 10, cx, cy + r + 10);
		ctx.strokeStyle = col.dim; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
		const px = cx + r * Math.cos(this.a), py = cy - r * Math.sin(this.a);
		ctx.lineWidth = 3;
		ctx.strokeStyle = col.series[0]; line(ctx, cx, py, px, py); // cos
		ctx.strokeStyle = col.series[1]; line(ctx, px, cy, px, py); // sin
		ctx.strokeStyle = col.text; ctx.lineWidth = 1.5; line(ctx, cx, cy, px, py);
		dot(ctx, px, py, 6, col.accent);
		// sine wave to the right
		const x0 = H + 10, w = W - x0 - 10;
		ctx.strokeStyle = col.grid; ctx.lineWidth = 1; line(ctx, x0, cy, x0 + w, cy);
		ctx.strokeStyle = col.series[1]; ctx.lineWidth = 2; ctx.beginPath();
		for (let i = 0; i <= w; i++) { const t = (i / w) * Math.PI * 2; i ? ctx.lineTo(x0 + i, cy - r * Math.sin(t)) : ctx.moveTo(x0, cy - r * Math.sin(t)); }
		ctx.stroke();
		const wx = x0 + (this.a / (Math.PI * 2)) * w;
		ctx.setLineDash([4, 4]); ctx.strokeStyle = col.dim; line(ctx, px, py, wx, py); ctx.setLineDash([]);
		dot(ctx, wx, py, 5, col.series[1]);
		label(ctx, 'cos', cx + (px - cx) / 2, py + (py < cy ? -10 : 12), col.series[0]);
		label(ctx, 'sin', px + 18, cy + (py - cy) / 2, col.series[1]);
		this.out.textContent = `θ = ${((this.a * 180) / Math.PI).toFixed(0)}°   sin θ = ${Math.sin(this.a).toFixed(2)}   cos θ = ${Math.cos(this.a).toFixed(2)}`;
	}
}

// <bl-coin-flips> / <bl-coin-flips mode="galton">
class CoinFlips extends BlElement {
	setup() {
		this.galton = this.getAttribute('mode') === 'galton';
		this.canvas(0.55);
		const c = this.controls();
		this.reset();
		this.speed = 5;
		this.button(c, '↺', () => { this.reset(); this.draw(); });
		this.slider(c, 'מהירות', 1, 50, 1, this.speed, (v) => (this.speed = v));
		this.out = this.text(c);
		this.loop(() => { for (let i = 0; i < this.speed; i++) this.step(); this.draw(); });
	}
	reset() {
		this.n = 0; this.heads = 0; this.hist = []; this.levels = 12; this.bins = new Array(this.levels + 1).fill(0); this.balls = [];
	}
	step() {
		if (this.galton) {
			let k = 0;
			for (let i = 0; i < this.levels; i++) k += Math.random() < 0.5 ? 1 : 0;
			this.bins[k]++; this.n++;
			this.balls.push({ k, t: 0 }); if (this.balls.length > 30) this.balls.shift();
		} else {
			this.n++; if (Math.random() < 0.5) this.heads++;
			this.hist.push(this.heads / this.n); if (this.hist.length > 2000) this.hist.shift();
		}
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette();
		this.clear();
		if (this.galton) {
			const L = this.levels, bw = W / (L + 1), max = Math.max(1, ...this.bins), top = H * 0.42;
			for (let r = 0; r < L; r++) for (let i = 0; i <= r; i++) dot(ctx, W / 2 + (i - r / 2) * bw, 12 + (r * (top - 20)) / L, 2.5, col.dim);
			this.bins.forEach((b, i) => { const h = ((H - top - 10) * b) / max; ctx.fillStyle = col.series[0]; ctx.fillRect(i * bw + 2, H - h, bw - 4, h); });
			this.out.textContent = `כדורים: ${this.n}`;
		} else {
			const y = (v) => H - 10 - v * (H - 20);
			ctx.strokeStyle = col.series[1]; ctx.setLineDash([6, 4]); line(ctx, 0, y(0.5), W, y(0.5)); ctx.setLineDash([]);
			ctx.strokeStyle = col.series[0]; ctx.lineWidth = 2; ctx.beginPath();
			this.hist.forEach((v, i) => { const x = (i / Math.max(1, this.hist.length - 1)) * W; i ? ctx.lineTo(x, y(v)) : ctx.moveTo(x, y(v)); });
			ctx.stroke();
			label(ctx, '0.5', W - 18, y(0.5) - 10, col.series[1]);
			this.out.textContent = `הטלות: ${this.n}   עץ: ${this.heads}   שכיחות יחסית: ${(this.heads / Math.max(1, this.n)).toFixed(3)}`;
		}
	}
}

// <bl-riemann>
class Riemann extends BlElement {
	setup() {
		this.canvas(0.6);
		const c = this.controls();
		this.n = 6; this.mode = 'left';
		this.slider(c, 'n', 1, 60, 1, this.n, (v) => { this.n = v; this.draw(); });
		this.select(c, 'סוג', [['left', 'שמאל'], ['mid', 'אמצע'], ['right', 'ימין']], this.mode, (v) => { this.mode = v; this.draw(); });
		this.out = this.text(c);
		this.draw();
	}
	draw() {
		if (!this.W) return;
		const col = palette(), f = (x) => 0.15 * x * x * x - x * x + 1.5 * x + 3, a = 0.5, b = 5.5;
		this.clear();
		const p = plane(this, -0.5, 6.5, -1, 6);
		axes(this, p, -0.5, 6.5, -1, 6);
		const dx = (b - a) / this.n; let s = 0;
		for (let i = 0; i < this.n; i++) {
			const x = a + i * dx + (this.mode === 'left' ? 0 : this.mode === 'mid' ? dx / 2 : dx), h = f(x); s += h * dx;
			this.ctx.fillStyle = col.series[0]; this.ctx.globalAlpha = 0.35;
			this.ctx.fillRect(p.sx(a + i * dx), p.sy(h), p.sx(a + (i + 1) * dx) - p.sx(a + i * dx), p.sy(0) - p.sy(h));
			this.ctx.globalAlpha = 1; this.ctx.strokeStyle = col.series[0]; this.ctx.lineWidth = 1;
			this.ctx.strokeRect(p.sx(a + i * dx), p.sy(h), p.sx(a + (i + 1) * dx) - p.sx(a + i * dx), p.sy(0) - p.sy(h));
		}
		plot(this, p, f, -0.5, 6.5, col.series[1]);
		const F = (x) => 0.0375 * x ** 4 - x ** 3 / 3 + 0.75 * x * x + 3 * x;
		this.out.textContent = `סכום: ${s.toFixed(3)}   אינטגרל: ${(F(b) - F(a)).toFixed(3)}`;
	}
}

// <bl-matrix-transform> / <bl-matrix-transform eigen>
class MatrixTransform extends BlElement {
	setup() {
		this.eigen = this.hasAttribute('eigen');
		this.canvas(0.65);
		const c = this.controls();
		this.m = this.eigen ? [2, 1, 1, 2] : [1, 0.5, 0, 1];
		this.t = 1;
		['a', 'b', 'c', 'd'].forEach((k, i) => this.slider(c, k, -3, 3, 0.1, this.m[i], (v) => { this.m[i] = v; this.draw(); }));
		this.slider(c, 't', 0, 1, 0.01, 1, (v) => { this.t = v; this.draw(); });
		this.out = this.text(c);
		this.draw();
	}
	draw() {
		if (!this.W) return;
		const { ctx } = this, col = palette(), X = 5, Y = 5 * (this.H / this.W);
		this.clear();
		const p = plane(this, -X, X, -Y, Y);
		axes(this, p, -X, X, -Y, Y);
		const [a, b, c, d] = this.m, t = this.t;
		const M = (x, y) => [(1 - t) * x + t * (a * x + b * y), (1 - t) * y + t * (c * x + d * y)];
		ctx.strokeStyle = col.accent; ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
		for (let k = -6; k <= 6; k++) {
			let [x1, y1] = M(k, -6), [x2, y2] = M(k, 6); line(ctx, p.sx(x1), p.sy(y1), p.sx(x2), p.sy(y2));
			[x1, y1] = M(-6, k); [x2, y2] = M(6, k); line(ctx, p.sx(x1), p.sy(y1), p.sx(x2), p.sy(y2));
		}
		ctx.globalAlpha = 1;
		const arrow = (x, y, color, w = 3) => { ctx.strokeStyle = color; ctx.lineWidth = w; line(ctx, p.sx(0), p.sy(0), p.sx(x), p.sy(y)); dot(ctx, p.sx(x), p.sy(y), 4, color); };
		arrow(...M(1, 0), col.series[3]);
		arrow(...M(0, 1), col.series[2]);
		const det = a * d - b * c;
		let info = `det = ${det.toFixed(2)}`;
		if (this.eigen) {
			const tr = a + d, disc = tr * tr - 4 * det;
			if (disc >= 0) {
				for (const lam of [(tr + Math.sqrt(disc)) / 2, (tr - Math.sqrt(disc)) / 2]) {
					let v = Math.abs(b) > 1e-9 ? [b, lam - a] : Math.abs(c) > 1e-9 ? [lam - d, c] : lam === a ? [1, 0] : [0, 1];
					const n = Math.hypot(...v); v = [v[0] / n, v[1] / n];
					ctx.setLineDash([5, 5]); ctx.strokeStyle = col.series[1]; ctx.lineWidth = 1.5;
					line(ctx, p.sx(-8 * v[0]), p.sy(-8 * v[1]), p.sx(8 * v[0]), p.sy(8 * v[1])); ctx.setLineDash([]);
					arrow(...M(v[0], v[1]), col.series[1], 2.5);
				}
				info += `   λ = ${((tr + Math.sqrt(disc)) / 2).toFixed(2)}, ${((tr - Math.sqrt(disc)) / 2).toFixed(2)}`;
			} else info += '   אין ערכים עצמיים ממשיים';
		}
		this.out.textContent = info;
	}
}

// <bl-fraction-pie numerator="3" denominator="8">
class FractionPie extends BlElement {
	setup() {
		this.canvas(0.45);
		const c = this.controls();
		this.n = +this.getAttribute('numerator') || 1; this.d = +this.getAttribute('denominator') || 4; this.shown = 0;
		this.slider(c, 'מונה', 0, 12, 1, this.n, (v) => (this.n = v));
		this.slider(c, 'מכנה', 1, 12, 1, this.d, (v) => (this.d = v));
		this.out = this.text(c);
		this.loop((dt) => { this.shown += (Math.min(this.n, this.d * 2) - this.shown) * Math.min(1, dt * 8); this.draw(); });
	}
	draw() {
		if (!this.W) return;
		const { ctx, H, W } = this, col = palette(), r = H * 0.42, pies = this.n > this.d ? 2 : 1;
		this.clear();
		for (let k = 0; k < pies; k++) {
			const cx = pies === 1 ? W / 2 : W / 2 + (k ? 1 : -1) * (r + 10), cy = H / 2;
			const fill = Math.max(0, Math.min(this.d, this.shown - k * this.d));
			for (let i = 0; i < this.d; i++) {
				const a0 = -Math.PI / 2 + (i / this.d) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / this.d;
				ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a0 + (a1 - a0) * Math.max(0, Math.min(1, fill - i))); ctx.closePath();
				ctx.fillStyle = col.series[1]; ctx.fill();
				ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.strokeStyle = col.text; ctx.lineWidth = 2; ctx.stroke();
			}
		}
		this.out.textContent = `${this.n}/${this.d} = ${(this.n / this.d).toFixed(3)}`;
	}
}

// <bl-multiplication-grid rows="3" cols="4">
class MultiplicationGrid extends BlElement {
	setup() {
		this.canvas(0.5);
		const c = this.controls();
		this.r = +this.getAttribute('rows') || 3; this.c = +this.getAttribute('cols') || 4; this.t0 = performance.now();
		const restart = () => (this.t0 = performance.now());
		this.slider(c, 'שורות', 1, 10, 1, this.r, (v) => { this.r = v; restart(); });
		this.slider(c, 'עמודות', 1, 10, 1, this.c, (v) => { this.c = v; restart(); });
		this.out = this.text(c);
		this.loop(() => this.draw());
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), s = Math.min((W - 20) / 10, (H - 20) / 10);
		this.clear();
		const shown = Math.floor((performance.now() - this.t0) / 90);
		const ox = (W - this.c * s) / 2, oy = (H - this.r * s) / 2;
		for (let i = 0; i < this.r; i++) for (let j = 0; j < this.c; j++) {
			const k = i * this.c + j;
			dot(ctx, ox + j * s + s / 2, oy + i * s + s / 2, s * 0.35, k < shown ? col.series[i % col.series.length] : col.grid);
		}
		this.out.textContent = `${this.r} × ${this.c} = ${Math.min(shown, this.r * this.c) === this.r * this.c ? this.r * this.c : '…'}`;
	}
}

define('bl-function-graph', FunctionGraph);
define('bl-unit-circle', UnitCircle);
define('bl-coin-flips', CoinFlips);
define('bl-riemann', Riemann);
define('bl-matrix-transform', MatrixTransform);
define('bl-fraction-pie', FractionPie);
define('bl-multiplication-grid', MultiplicationGrid);
