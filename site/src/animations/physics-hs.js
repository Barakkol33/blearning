// High-school physics animations (Bagrut 5 units).
import { BlElement, palette, line, dot, label, define } from './base.js';
import { arrow, draggable, outBox, say } from './math-hs.js';

const TAU = Math.PI * 2;
const g = 9.8;
const fx = (v, d = 2) => (Math.abs(v) < 1e-9 ? '0' : Number(v.toFixed(d)).toString());

/** Small graph panel: draws axes and a polyline of [t, v] points. */
function panel(ctx, x, y, w, h, pts, tmax, vmin, vmax, color, name, col, cur) {
	ctx.strokeStyle = col.grid; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
	const sy = (v) => y + h - ((v - vmin) / (vmax - vmin || 1)) * h, sx = (t) => x + (t / tmax) * w;
	if (vmin < 0 && vmax > 0) { ctx.strokeStyle = col.dim; line(ctx, x, sy(0), x + w, sy(0)); }
	ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
	pts.forEach(([t, v], i) => (i ? ctx.lineTo(sx(t), sy(v)) : ctx.moveTo(sx(t), sy(v))));
	ctx.stroke();
	if (cur) dot(ctx, sx(cur[0]), sy(cur[1]), 4, color);
	label(ctx, name, x + 18, y + 11, color, 12);
}

// <bl-motion-graphs> x(t), v(t), a(t) of motion with constant acceleration
class MotionGraphs extends BlElement {
	setup() {
		this.canvas(0.62);
		const c = this.controls();
		this.v0 = 2; this.a = 1; this.t = 0; this.T = 8;
		this.slider(c, 'v₀ (m/s)', -6, 6, 0.5, this.v0, (v) => { this.v0 = v; this.t = 0; });
		this.slider(c, 'a (m/s²)', -3, 3, 0.25, this.a, (v) => { this.a = v; this.t = 0; });
		this.button(c, 'מההתחלה', () => (this.t = 0));
		this.out = outBox(this);
		this.loop((dt) => { this.t = Math.min(this.T, this.t + dt); this.draw(); });
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H, v0, a, T } = this, col = palette();
		this.clear();
		const x = (t) => v0 * t + 0.5 * a * t * t, v = (t) => v0 + a * t;
		const ts = Array.from({ length: 81 }, (_, i) => (T * i) / 80).filter((t) => t <= this.t);
		const xs = Array.from({ length: 81 }, (_, i) => x((T * i) / 80)), xmin = Math.min(0, ...xs), xmax = Math.max(1, ...xs);
		// track and cart
		const ty = 26, sx = (p) => 20 + ((p - xmin) / (xmax - xmin)) * (W - 40);
		ctx.strokeStyle = col.dim; ctx.lineWidth = 2; line(ctx, 20, ty + 10, W - 20, ty + 10);
		ctx.fillStyle = col.series[0]; ctx.fillRect(sx(x(this.t)) - 14, ty - 6, 28, 14);
		arrow(ctx, sx(x(this.t)), ty - 12, sx(x(this.t)) + v(this.t) * 6, ty - 12, col.series[1], 2);
		const gy = 56, gh = (H - gy - 20) / 3 - 8, vs = [v(0), v(T)];
		panel(ctx, 20, gy, W - 40, gh, ts.map((t) => [t, x(t)]), T, xmin, xmax, col.series[0], 'x(t)', col, [this.t, x(this.t)]);
		panel(ctx, 20, gy + gh + 10, W - 40, gh, ts.map((t) => [t, v(t)]), T, Math.min(0, ...vs) - 1, Math.max(0, ...vs) + 1, col.series[1], 'v(t)', col, [this.t, v(this.t)]);
		panel(ctx, 20, gy + 2 * (gh + 10), W - 40, gh, ts.map((t) => [t, a]), T, Math.min(0, a) - 1, Math.max(0, a) + 1, col.series[2], 'a(t)', col, [this.t, a]);
		say(this.out, `t = ${fx(this.t, 1)} s  ·  x = v₀t + ½at² = ${fx(x(this.t), 1)} m  ·  v = v₀ + at = ${fx(v(this.t), 1)} m/s  ·  שיפוע x(t) = v, שיפוע v(t) = a, השטח מתחת ל-v(t) = העתק`);
	}
}

// <bl-incline> block on an inclined plane with friction
class Incline extends BlElement {
	setup() {
		this.canvas(0.55);
		const c = this.controls();
		this.th = 30; this.mu = 0.2; this.m = 2; this.s = 0; this.v = 0;
		this.slider(c, 'זווית (°)', 0, 60, 1, this.th, (v) => { this.th = v; this.reset(); });
		this.slider(c, 'μ', 0, 1, 0.05, this.mu, (v) => { this.mu = v; this.reset(); });
		this.slider(c, 'm (kg)', 0.5, 10, 0.5, this.m, (v) => { this.m = v; this.reset(); });
		this.button(c, 'שחרר', () => this.reset());
		this.out = outBox(this);
		this.loop((dt) => { const a = this.acc(); this.v += a * dt; this.s += this.v * dt; if (this.s > 6) this.reset(); this.draw(); });
	}
	reset() { this.s = 0; this.v = 0; }
	acc() { const t = (this.th * Math.PI) / 180, a = g * (Math.sin(t) - this.mu * Math.cos(t)); return a > 0 ? a : 0; }
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), t = (this.th * Math.PI) / 180, L = Math.min(W * 0.8, (H - 30) / Math.max(Math.sin(t), 0.3));
		const x0 = W * 0.1, y0 = H - 15, top = [x0, y0 - L * Math.sin(t)], bot = [x0 + L * Math.cos(t), y0];
		this.clear();
		ctx.fillStyle = col.grid; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(...top); ctx.lineTo(...bot); ctx.closePath(); ctx.fill();
		const k = Math.min(1, this.s / 6), cx = top[0] + (bot[0] - top[0]) * (0.15 + 0.6 * k), cy = top[1] + (bot[1] - top[1]) * (0.15 + 0.6 * k);
		// d: down the slope (screen coordinates), n: the outward normal (away from the wedge)
		const d = [Math.cos(t), Math.sin(t)], n = [Math.sin(t), -Math.cos(t)], bx = cx + n[0] * 16, by = cy + n[1] * 16;
		ctx.save(); ctx.translate(bx, by); ctx.rotate(t); ctx.fillStyle = col.series[0]; ctx.fillRect(-18, -16, 36, 32); ctx.restore();
		const F = 3.2, W_ = this.m * g, N = W_ * Math.cos(t), f = Math.min(this.mu * N, W_ * Math.sin(t));
		arrow(ctx, bx, by, bx, by + W_ * F * 0.35, col.series[3]); label(ctx, 'mg', bx + 16, by + W_ * F * 0.35, col.series[3]);
		arrow(ctx, bx, by, bx + n[0] * N * F * 0.35, by + n[1] * N * F * 0.35, col.series[2]); label(ctx, 'N', bx + n[0] * N * F * 0.35 - 10, by + n[1] * N * F * 0.35, col.series[2]);
		if (f > 0.01) { arrow(ctx, bx, by, bx - d[0] * f * F * 0.35, by - d[1] * f * F * 0.35, col.series[1]); label(ctx, 'f', bx - d[0] * f * F * 0.35, by - d[1] * f * F * 0.35 - 12, col.series[1]); }
		const a = this.acc();
		say(this.out, `mg·sinθ = ${fx(W_ * Math.sin(t), 1)} N  ·  N = mg·cosθ = ${fx(N, 1)} N  ·  ${a > 0 ? `a = g(sinθ − μcosθ) = ${fx(a)} m/s²` : `הגוף נשאר במנוחה: mg·sinθ ≤ μN (tanθ ≤ μ)`}`);
	}
}

// <bl-circular> uniform circular motion: velocity, centripetal acceleration, release
class Circular extends BlElement {
	setup() {
		this.canvas(0.6);
		const c = this.controls();
		this.r = 2; this.w = 1.5; this.ang = 0; this.free = null;
		this.slider(c, 'r (m)', 0.5, 3, 0.1, this.r, (v) => (this.r = v));
		this.slider(c, 'ω (rad/s)', 0.3, 4, 0.1, this.w, (v) => (this.w = v));
		this.button(c, 'שחרר את החוט', () => { if (!this.free) this.free = { ...this.pos(), vx: -this.w * this.r * Math.sin(this.ang), vy: this.w * this.r * Math.cos(this.ang), t: 0 }; });
		this.out = outBox(this);
		this.loop((dt) => {
			if (this.free) { this.free.x += this.free.vx * dt; this.free.y += this.free.vy * dt; this.free.t += dt; if (this.free.t > 2.5) this.free = null; }
			else this.ang += this.w * dt;
			this.draw();
		});
	}
	pos() { return { x: this.r * Math.cos(this.ang), y: this.r * Math.sin(this.ang) }; }
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), s = H / 8, O = [W / 2, H / 2], S = (x, y) => [O[0] + x * s, O[1] - y * s];
		this.clear();
		ctx.strokeStyle = col.grid; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(...O, this.r * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
		dot(ctx, ...O, 4, col.dim);
		const v = this.w * this.r, ac = this.w * this.w * this.r;
		if (this.free) {
			const P = S(this.free.x, this.free.y); dot(ctx, ...P, 9, col.series[0]);
			arrow(ctx, ...P, P[0] + this.free.vx * 14, P[1] - this.free.vy * 14, col.series[1]);
		} else {
			const { x, y } = this.pos(), P = S(x, y);
			ctx.strokeStyle = col.dim; ctx.lineWidth = 1.5; line(ctx, ...O, ...P);
			dot(ctx, ...P, 9, col.series[0]);
			arrow(ctx, ...P, P[0] - Math.sin(this.ang) * v * 14, P[1] - Math.cos(this.ang) * v * 14, col.series[1]); label(ctx, 'v', P[0] - Math.sin(this.ang) * v * 14 + 10, P[1] - Math.cos(this.ang) * v * 14, col.series[1]);
			arrow(ctx, ...P, P[0] - Math.cos(this.ang) * Math.min(ac, 12) * 6, P[1] + Math.sin(this.ang) * Math.min(ac, 12) * 6, col.series[3]); label(ctx, 'a', P[0] - Math.cos(this.ang) * Math.min(ac, 12) * 6 + 10, P[1] + Math.sin(this.ang) * Math.min(ac, 12) * 6, col.series[3]);
		}
		say(this.out, `v = ωr = ${fx(v)} m/s  ·  a = v²/r = ω²r = ${fx(ac)} m/s² (אל המרכז)  ·  T = 2π/ω = ${fx(TAU / this.w)} s  ·  בלי החוט: תנועה בקו ישר, בכיוון המשיק`);
	}
}

// <bl-pendulum> energy conservation (with optional friction)
class Pendulum extends BlElement {
	setup() {
		this.canvas(0.55);
		const c = this.controls();
		this.L = 2; this.th0 = 50; this.damp = 0; this.m = 1;
		this.slider(c, 'אורך (m)', 0.5, 3, 0.1, this.L, (v) => { this.L = v; this.reset(); });
		this.slider(c, 'זווית התחלתית (°)', 5, 80, 1, this.th0, (v) => { this.th0 = v; this.reset(); });
		this.slider(c, 'חיכוך', 0, 0.5, 0.05, this.damp, (v) => (this.damp = v));
		this.out = outBox(this);
		this.reset();
		this.loop((dt) => { for (let i = 0; i < 4; i++) { const h = dt / 4; this.om += (-(g / this.L) * Math.sin(this.th) - this.damp * this.om) * h; this.th += this.om * h; } this.draw(); });
	}
	reset() { this.th = (this.th0 * Math.PI) / 180; this.om = 0; this.E0 = this.m * g * this.L * (1 - Math.cos(this.th)); }
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), s = (H - 40) / 3.2, piv = [W * 0.35, 16];
		this.clear();
		const P = [piv[0] + this.L * s * Math.sin(this.th), piv[1] + this.L * s * Math.cos(this.th)];
		ctx.strokeStyle = col.dim; ctx.lineWidth = 2; line(ctx, ...piv, ...P); dot(ctx, ...piv, 4, col.dim); dot(ctx, ...P, 12, col.series[0]);
		ctx.setLineDash([3, 5]); ctx.strokeStyle = col.grid; line(ctx, piv[0] - this.L * s, piv[1] + this.L * s, piv[0] + this.L * s, piv[1] + this.L * s); ctx.setLineDash([]);
		const v = this.om * this.L, K = 0.5 * this.m * v * v, U = this.m * g * this.L * (1 - Math.cos(this.th)), E = this.E0 || 1;
		const bars = [['Eₖ', K, col.series[1]], ['Eₚ', U, col.series[2]], ['E', K + U, col.series[0]]], bx = W * 0.72, bh = H - 50;
		bars.forEach(([n, val, c], i) => { const h = (val / E) * bh; ctx.fillStyle = c; ctx.fillRect(bx + i * 40, H - 25 - h, 28, h); label(ctx, n, bx + i * 40 + 14, H - 12, c, 13); });
		say(this.out, `Eₖ = ½mv² = ${fx(K)} J  ·  Eₚ = mgh = ${fx(U)} J  ·  סכום = ${fx(K + U)} J${this.damp ? ' (החיכוך מקטין את האנרגיה המכנית)' : ' (נשמר)'}`);
	}
}

// <bl-collision> 1D collision of two carts: elastic or perfectly inelastic
class Collision extends BlElement {
	setup() {
		this.canvas(0.35);
		const c = this.controls();
		this.m1 = 2; this.m2 = 1; this.u1 = 3; this.u2 = -1; this.type = 'elastic';
		this.select(c, 'סוג', [['elastic', 'אלסטית'], ['inelastic', 'פלסטית (נדבקים)']], this.type, (v) => { this.type = v; this.reset(); });
		this.slider(c, 'm₁', 0.5, 5, 0.5, this.m1, (v) => { this.m1 = v; this.reset(); });
		this.slider(c, 'm₂', 0.5, 5, 0.5, this.m2, (v) => { this.m2 = v; this.reset(); });
		this.slider(c, 'u₁', -4, 4, 0.5, this.u1, (v) => { this.u1 = v; this.reset(); });
		this.slider(c, 'u₂', -4, 4, 0.5, this.u2, (v) => { this.u2 = v; this.reset(); });
		this.button(c, 'מההתחלה', () => this.reset());
		this.out = outBox(this);
		this.reset();
		this.loop((dt) => this.step(dt));
	}
	reset() { this.x1 = -4; this.x2 = 4; this.v1 = this.u1; this.v2 = this.u2; this.hit = false; this.t = 0; }
	after() {
		const { m1, m2, u1, u2 } = this;
		if (this.type === 'inelastic') { const v = (m1 * u1 + m2 * u2) / (m1 + m2); return [v, v]; }
		return [((m1 - m2) * u1 + 2 * m2 * u2) / (m1 + m2), ((m2 - m1) * u2 + 2 * m1 * u1) / (m1 + m2)];
	}
	step(dt) {
		this.t += dt;
		this.x1 += this.v1 * dt; this.x2 += this.v2 * dt;
		const w1 = 0.4 + this.m1 * 0.12, w2 = 0.4 + this.m2 * 0.12;
		if (!this.hit && this.x2 - this.x1 <= w1 + w2) { [this.v1, this.v2] = this.after(); this.hit = true; }
		if (this.t > 8 || Math.abs(this.x1) > 12 || Math.abs(this.x2) > 12) this.reset();
		this.draw();
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), s = W / 24, y = H * 0.6, X = (x) => W / 2 + x * s;
		this.clear();
		ctx.strokeStyle = col.dim; ctx.lineWidth = 2; line(ctx, 0, y + 16, W, y + 16);
		const w1 = (0.4 + this.m1 * 0.12) * s, w2 = (0.4 + this.m2 * 0.12) * s;
		ctx.fillStyle = col.series[0]; ctx.fillRect(X(this.x1) - w1, y - 14, 2 * w1, 28);
		ctx.fillStyle = col.series[1]; ctx.fillRect(X(this.x2) - w2, y - 14, 2 * w2, 28);
		label(ctx, 'm₁', X(this.x1), y, '#fff', 12); label(ctx, 'm₂', X(this.x2), y, '#fff', 12);
		if (Math.abs(this.v1) > 0.01) arrow(ctx, X(this.x1), y - 24, X(this.x1) + this.v1 * 12, y - 24, col.series[0], 2);
		if (Math.abs(this.v2) > 0.01) arrow(ctx, X(this.x2), y - 24, X(this.x2) + this.v2 * 12, y - 24, col.series[1], 2);
		const [v1, v2] = this.after(), { m1, m2, u1, u2 } = this;
		const pB = m1 * u1 + m2 * u2, pA = m1 * v1 + m2 * v2, kB = 0.5 * (m1 * u1 * u1 + m2 * u2 * u2), kA = 0.5 * (m1 * v1 * v1 + m2 * v2 * v2);
		say(this.out, `אחרי: v₁ = ${fx(v1)}, v₂ = ${fx(v2)} m/s  ·  תנע: ${fx(pB)} → ${fx(pA)} kg·m/s (נשמר)  ·  אנרגיה קינטית: ${fx(kB)} → ${fx(kA)} J${this.type === 'elastic' ? ' (נשמרת)' : ' (חלק הופך לחום)'}`);
	}
}

// <bl-orbit> Kepler's laws: elliptic orbit, equal areas in equal times
class Orbit extends BlElement {
	setup() {
		this.canvas(0.6);
		const c = this.controls();
		this.e = 0.5; this.M = 0; this.sweeps = [];
		this.slider(c, 'אקסצנטריות e', 0, 0.85, 0.05, this.e, (v) => { this.e = v; this.sweeps = []; });
		this.out = outBox(this);
		this.loop((dt) => { this.M += dt * 0.6; this.draw(); });
	}
	E(M) { let E = M; for (let i = 0; i < 8; i++) E -= (E - this.e * Math.sin(E) - M) / (1 - this.e * Math.cos(E)); return E; }
	draw() {
		if (!this.W) return;
		const { ctx, W, H, e } = this, col = palette(), a = Math.min(W * 0.38, (H * 0.42) / Math.sqrt(1 - e * e)), b = a * Math.sqrt(1 - e * e), c = a * e, O = [W / 2, H / 2];
		const pt = (M) => { const E = this.E(M); return [O[0] + a * Math.cos(E), O[1] + b * Math.sin(E)]; };
		this.clear();
		ctx.strokeStyle = col.grid; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(...O, a, b, 0, 0, TAU); ctx.stroke();
		const sun = [O[0] + c, O[1]];
		// two sectors swept in the same time (equal areas)
		const k = Math.floor(this.M / TAU) * TAU, sec = (from, color) => {
			ctx.fillStyle = color; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(...sun);
			for (let i = 0; i <= 20; i++) ctx.lineTo(...pt(from + (0.6 * i) / 20)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
		};
		sec(k + 0, col.series[0]); sec(k + Math.PI - 0.3, col.series[1]);
		dot(ctx, ...sun, 12, '#fbbf24');
		const P = pt(this.M); dot(ctx, ...P, 7, '#3b82f6');
		const rp = a - c, ra = a + c;
		say(this.out, `חוק שני של קפלר: בזמנים שווים הקו שמש-כוכב מכסה שטחים שווים  ·  vₘₐₓ/vₘᵢₙ = r_max/r_min = ${fx(ra / rp)}`);
	}
}

// <bl-field> electric field of draggable point charges (click empty space to add, toggle sign)
class Field extends BlElement {
	setup() {
		this.canvas(0.65);
		const c = this.controls();
		this.Q = [{ x: 0.35, y: 0.5, q: 1 }, { x: 0.65, y: 0.5, q: -1 }];
		this.button(c, 'הוסף +', () => { this.Q.push({ x: 0.5, y: 0.25, q: 1 }); this.draw(); });
		this.button(c, 'הוסף −', () => { this.Q.push({ x: 0.5, y: 0.75, q: -1 }); this.draw(); });
		this.button(c, 'איפוס', () => { this.Q = [{ x: 0.35, y: 0.5, q: 1 }, { x: 0.65, y: 0.5, q: -1 }]; this.draw(); });
		this.out = outBox(this, 'גררו את המטענים. קווי השדה יוצאים מ-+ ונכנסים ל-−');
		draggable(this, (x, y) => this.Q.find((p) => Math.hypot(p.x * this.W - x, p.y * this.H - y) < 16) ?? null, (p, x, y) => { p.x = x / this.W; p.y = y / this.H; });
	}
	E(x, y) {
		let ex = 0, ey = 0;
		for (const p of this.Q) { const dx = x - p.x * this.W, dy = y - p.y * this.H, r2 = dx * dx + dy * dy + 1, r = Math.sqrt(r2); ex += (p.q * dx) / (r2 * r); ey += (p.q * dy) / (r2 * r); }
		return [ex, ey];
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette();
		this.clear();
		// field lines from positive charges
		ctx.strokeStyle = col.accent; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.8;
		for (const p of this.Q.filter((q) => q.q > 0)) {
			for (let k = 0; k < 16; k++) {
				let x = p.x * W + 8 * Math.cos((TAU * k) / 16), y = p.y * H + 8 * Math.sin((TAU * k) / 16);
				ctx.beginPath(); ctx.moveTo(x, y);
				for (let i = 0; i < 400; i++) {
					const [ex, ey] = this.E(x, y), n = Math.hypot(ex, ey); if (!n) break;
					x += (ex / n) * 4; y += (ey / n) * 4; ctx.lineTo(x, y);
					if (x < 0 || y < 0 || x > W || y > H || this.Q.some((o) => o.q < 0 && Math.hypot(o.x * W - x, o.y * H - y) < 8)) break;
				}
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 1;
		for (const p of this.Q) { dot(ctx, p.x * W, p.y * H, 12, p.q > 0 ? col.series[3] : col.series[0]); label(ctx, p.q > 0 ? '+' : '−', p.x * W, p.y * H, '#fff', 18); }
	}
}

// <bl-rc> charging / discharging a capacitor through a resistor
class RC extends BlElement {
	setup() {
		this.canvas(0.5);
		const c = this.controls();
		this.R = 2; this.C = 1; this.E = 10; this.mode = 'charge'; this.t = 0;
		this.slider(c, 'R (kΩ)', 0.5, 5, 0.5, this.R, (v) => { this.R = v; this.t = 0; });
		this.slider(c, 'C (mF)', 0.5, 3, 0.25, this.C, (v) => { this.C = v; this.t = 0; });
		this.select(c, 'תהליך', [['charge', 'טעינה'], ['discharge', 'פריקה']], this.mode, (v) => { this.mode = v; this.t = 0; });
		this.out = outBox(this);
		this.loop((dt) => { this.t = Math.min(this.t + dt * 2, 25); this.draw(); });
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H, E } = this, col = palette(), tau = this.R * this.C, T = 25;
		const V = (t) => (this.mode === 'charge' ? E * (1 - Math.exp(-t / tau)) : E * Math.exp(-t / tau));
		const I = (t) => (E / this.R) * Math.exp(-t / tau);
		this.clear();
		const pts = (f) => Array.from({ length: 101 }, (_, i) => (T * i) / 100).filter((t) => t <= this.t).map((t) => [t, f(t)]);
		const gw = W - 40, gh = (H - 40) / 2;
		panel(ctx, 20, 10, gw, gh, pts(V), T, 0, E * 1.05, col.series[0], 'V_C(t)', col, [this.t, V(this.t)]);
		panel(ctx, 20, 20 + gh, gw, gh, pts(I), T, 0, (E / this.R) * 1.05, col.series[1], 'I(t)', col, [this.t, I(this.t)]);
		ctx.setLineDash([4, 4]); ctx.strokeStyle = col.series[2]; const xt = 20 + (tau / T) * gw; line(ctx, xt, 10, xt, H - 10); ctx.setLineDash([]);
		label(ctx, 'τ', xt + 8, H - 16, col.series[2]);
		say(this.out, `τ = RC = ${fx(tau)} s  ·  אחרי τ: ${this.mode === 'charge' ? '63% מהמתח המרבי' : 'נשאר 37% מהמתח'}  ·  אחרי 5τ התהליך כמעט הסתיים  ·  V_C = ${fx(V(this.t))} V, I = ${fx(I(this.t))} mA`);
	}
}

// <bl-resistors> two resistors in series or in parallel, with a battery's internal resistance
class Resistors extends BlElement {
	setup() {
		this.canvas(0.45);
		const c = this.controls();
		this.R1 = 4; this.R2 = 6; this.E = 12; this.r = 0; this.mode = 'series';
		this.select(c, 'חיבור', [['series', 'טורי'], ['parallel', 'מקבילי']], this.mode, (v) => { this.mode = v; this.draw(); });
		this.slider(c, 'R₁ (Ω)', 1, 20, 1, this.R1, (v) => { this.R1 = v; this.draw(); });
		this.slider(c, 'R₂ (Ω)', 1, 20, 1, this.R2, (v) => { this.R2 = v; this.draw(); });
		this.slider(c, 'ε (V)', 1, 24, 1, this.E, (v) => { this.E = v; this.draw(); });
		this.slider(c, 'r פנימית (Ω)', 0, 5, 0.5, this.r, (v) => { this.r = v; this.draw(); });
		this.out = outBox(this);
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H, R1, R2, E, r } = this, col = palette(), ser = this.mode === 'series';
		const Req = ser ? R1 + R2 : (R1 * R2) / (R1 + R2), I = E / (Req + r), Vt = E - I * r;
		const I1 = ser ? I : Vt / R1, I2 = ser ? I : Vt / R2;
		this.clear();
		const L = 40, R = W - 40, T = 30, B = H - 30;
		ctx.strokeStyle = col.text; ctx.lineWidth = 2;
		const res = (x, y, name, i) => { ctx.fillStyle = col.bg; ctx.fillRect(x - 28, y - 10, 56, 20); ctx.strokeRect(x - 28, y - 10, 56, 20); label(ctx, name, x, y, col.series[i], 13); };
		line(ctx, L, B, L, T); // battery side
		ctx.fillStyle = col.bg; ctx.fillRect(L - 14, (T + B) / 2 - 10, 28, 20);
		ctx.lineWidth = 3; line(ctx, L - 14, (T + B) / 2 - 4, L + 14, (T + B) / 2 - 4); ctx.lineWidth = 1.5; line(ctx, L - 8, (T + B) / 2 + 4, L + 8, (T + B) / 2 + 4); ctx.lineWidth = 2;
		label(ctx, 'ε, r', L + 30, (T + B) / 2, col.dim, 12);
		line(ctx, L, B, R, B);
		if (ser) {
			line(ctx, L, T, R, T); line(ctx, R, T, R, B);
			res(W * 0.4, T, `R₁ ${R1}Ω`, 0); res(W * 0.7, T, `R₂ ${R2}Ω`, 1);
		} else {
			const y1 = T, y2 = (T + B) / 2;
			line(ctx, L, T, W * 0.35, T); line(ctx, W * 0.35, y1, W * 0.35, y2); line(ctx, W * 0.75, y1, W * 0.75, y2);
			line(ctx, W * 0.35, y1, W * 0.75, y1); line(ctx, W * 0.35, y2, W * 0.75, y2); line(ctx, W * 0.75, y1, R, y1); line(ctx, R, y1, R, B);
			res(W * 0.55, y1, `R₁ ${R1}Ω`, 0); res(W * 0.55, y2, `R₂ ${R2}Ω`, 1);
		}
		arrow(ctx, R - 20, B - 14, R - 60, B - 14, col.series[2], 2); label(ctx, `I = ${fx(I)} A`, R - 100, B - 14, col.series[2], 12);
		say(this.out, `R שקולה = ${ser ? 'R₁ + R₂' : 'R₁R₂/(R₁+R₂)'} = ${fx(Req)} Ω  ·  I = ε/(R+r) = ${fx(I)} A  ·  מתח ההדקים = ε − Ir = ${fx(Vt)} V  ·  I₁ = ${fx(I1)} A, I₂ = ${fx(I2)} A  ·  V₁ = ${fx(I1 * R1)} V, V₂ = ${fx(I2 * R2)} V`);
	}
}

// <bl-magnetic> a charged particle in a uniform magnetic field into the page
class Magnetic extends BlElement {
	setup() {
		this.canvas(0.6);
		const c = this.controls();
		this.B = 1; this.v = 2; this.q = 1; this.m = 1;
		this.slider(c, 'B (T)', 0.3, 3, 0.1, this.B, (v) => { this.B = v; this.reset(); });
		this.slider(c, 'v', 0.5, 4, 0.1, this.v, (v) => { this.v = v; this.reset(); });
		this.slider(c, 'm', 0.5, 3, 0.1, this.m, (v) => { this.m = v; this.reset(); });
		this.select(c, 'מטען', [['1', 'חיובי'], ['-1', 'שלילי']], '1', (v) => { this.q = Number(v); this.reset(); });
		this.out = outBox(this);
		this.reset();
		this.loop((dt) => { this.step(dt); this.draw(); });
	}
	reset() { this.x = -4; this.y = 0; this.vx = this.v; this.vy = 0; this.trail = []; }
	step(dt) {
		const inField = this.x > -1.5;
		for (let i = 0; i < 4; i++) {
			const h = dt / 4;
			// F = qv×B with B into the page: a positive charge turns counterclockwise
			if (inField) { const w = (this.q * this.B) / this.m; const vx = this.vx * Math.cos(w * h) - this.vy * Math.sin(w * h), vy = this.vx * Math.sin(w * h) + this.vy * Math.cos(w * h); this.vx = vx; this.vy = vy; }
			this.x += this.vx * h; this.y += this.vy * h;
		}
		this.trail.push([this.x, this.y]); if (this.trail.length > 500) this.trail.shift();
		if (Math.abs(this.x) > 8 || Math.abs(this.y) > 6 || this.trail.length > 480) this.reset();
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), s = H / 10, S = (x, y) => [W * 0.3 + x * s, H / 2 - y * s];
		this.clear();
		const fx0 = S(-1.5, 0)[0];
		ctx.fillStyle = col.accent; ctx.globalAlpha = 0.08; ctx.fillRect(fx0, 0, W - fx0, H); ctx.globalAlpha = 1;
		for (let x = fx0 + 20; x < W; x += 36) for (let y = 18; y < H; y += 36) label(ctx, '×', x, y, col.dim, 14);
		label(ctx, 'B (לתוך הדף)', W - 60, 14, col.dim, 12);
		ctx.strokeStyle = col.series[1]; ctx.lineWidth = 2; ctx.beginPath();
		this.trail.forEach(([x, y], i) => { const [px, py] = S(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
		const P = S(this.x, this.y); dot(ctx, ...P, 8, this.q > 0 ? col.series[3] : col.series[0]); label(ctx, this.q > 0 ? '+' : '−', ...P, '#fff', 14);
		const r = (this.m * this.v) / this.B;
		say(this.out, `F = qvB, מאונך למהירות  ·  רדיוס r = mv/(qB) = ${fx(r)}  ·  זמן מחזור T = 2πm/(qB) = ${fx((TAU * this.m) / this.B)} (לא תלוי ב-v)`);
	}
}

// <bl-induction> a metal rod moving on rails in a magnetic field
class Induction extends BlElement {
	setup() {
		this.canvas(0.5);
		const c = this.controls();
		this.B = 0.5; this.L = 0.4; this.R = 2; this.v = 3; this.x = 0.3;
		this.slider(c, 'v (m/s)', -5, 5, 0.5, this.v, (v) => (this.v = v));
		this.slider(c, 'B (T)', 0, 1.5, 0.1, this.B, (v) => (this.B = v));
		this.slider(c, 'R (Ω)', 0.5, 10, 0.5, this.R, (v) => (this.R = v));
		this.out = outBox(this);
		this.loop((dt) => { this.x += this.v * dt * 0.08; if (this.x > 0.95) this.x = 0.15; if (this.x < 0.15) this.x = 0.95; this.draw(); });
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), T = H * 0.2, B = H * 0.8, L0 = W * 0.08, X = L0 + this.x * (W * 0.88);
		this.clear();
		ctx.fillStyle = col.accent; ctx.globalAlpha = 0.18; ctx.fillRect(L0, T, X - L0, B - T); ctx.globalAlpha = 1;
		for (let x = L0 + 20; x < W - 10; x += 34) for (let y = T + 16; y < B; y += 30) label(ctx, '×', x, y, col.dim, 12);
		ctx.strokeStyle = col.text; ctx.lineWidth = 3; line(ctx, L0, T, W - 10, T); line(ctx, L0, B, W - 10, B);
		ctx.lineWidth = 2; line(ctx, L0, T, L0, B);
		ctx.fillStyle = col.bg; ctx.fillRect(L0 - 9, H / 2 - 22, 18, 44); ctx.strokeRect(L0 - 9, H / 2 - 22, 18, 44); label(ctx, 'R', L0 + 20, H / 2, col.dim);
		ctx.strokeStyle = col.series[1]; ctx.lineWidth = 5; line(ctx, X, T - 6, X, B + 6);
		arrow(ctx, X, H / 2, X + Math.sign(this.v) * Math.min(60, Math.abs(this.v) * 14), H / 2, col.series[2], 2.5);
		const emf = this.B * this.L * this.v, I = emf / this.R, F = this.B * I * this.L;
		if (Math.abs(I) > 1e-6) { const up = I > 0; arrow(ctx, X - 14, up ? B - 20 : T + 20, X - 14, up ? T + 20 : B - 20, col.series[3], 2); label(ctx, 'I', X - 26, H / 2, col.series[3]); }
		say(this.out, `ε = BLv = ${fx(emf, 3)} V  ·  I = ε/R = ${fx(I, 3)} A  ·  כוח מגנטי על המוט F = BIL = ${fx(F, 3)} N, נגד כיוון התנועה (חוק לנץ)  ·  השטף גדל כשהמוט מתרחק`);
	}
}

define('bl-motion-graphs', MotionGraphs);
define('bl-incline', Incline);
define('bl-circular', Circular);
define('bl-pendulum', Pendulum);
define('bl-collision', Collision);
define('bl-orbit', Orbit);
define('bl-field', Field);
define('bl-rc', RC);
define('bl-resistors', Resistors);
define('bl-magnetic', Magnetic);
define('bl-induction', Induction);
