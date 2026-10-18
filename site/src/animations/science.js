import { BlElement, palette, line, dot, label, define } from './base.js';

// <bl-projectile>
class Projectile extends BlElement {
	setup() {
		this.canvas(0.55);
		const c = this.controls();
		this.angle = 45; this.v0 = 20; this.t = 0; this.trails = [];
		this.slider(c, 'זווית (°)', 5, 85, 1, this.angle, (v) => (this.angle = v));
		this.slider(c, 'מהירות (m/s)', 5, 30, 1, this.v0, (v) => (this.v0 = v));
		this.button(c, 'זרוק!', () => { this.t = 0.0001; });
		this.out = this.text(c);
		this.loop((dt) => {
			if (this.t > 0) {
				this.t += dt;
				const { x, y } = this.pos(this.t);
				if (y < 0) { this.trails.push({ angle: this.angle, v0: this.v0 }); if (this.trails.length > 4) this.trails.shift(); this.t = 0; }
			}
			this.draw();
		});
	}
	pos(t, angle = this.angle, v0 = this.v0) {
		const a = (angle * Math.PI) / 180;
		return { x: v0 * Math.cos(a) * t, y: v0 * Math.sin(a) * t - 4.9 * t * t };
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), scale = W / 95, gy = H - 20;
		const P = ({ x, y }) => [20 + x * scale, gy - y * scale];
		this.clear();
		ctx.strokeStyle = col.dim; line(ctx, 0, gy, W, gy);
		const path = (angle, v0, color, alpha) => {
			const a = (angle * Math.PI) / 180, T = (2 * v0 * Math.sin(a)) / 9.8;
			ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
			for (let i = 0; i <= 60; i++) { const [x, y] = P(this.pos((T * i) / 60, angle, v0)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
			ctx.stroke(); ctx.globalAlpha = 1;
		};
		this.trails.forEach((tr, i) => path(tr.angle, tr.v0, col.series[(i + 1) % 8], 0.5));
		ctx.setLineDash([4, 6]); path(this.angle, this.v0, col.dim, 0.7); ctx.setLineDash([]);
		const a = (this.angle * Math.PI) / 180;
		ctx.strokeStyle = col.series[3]; ctx.lineWidth = 3; line(ctx, 20, gy, 20 + Math.cos(a) * 40, gy - Math.sin(a) * 40);
		if (this.t > 0) { const [x, y] = P(this.pos(this.t)); dot(ctx, x, y, 7, col.series[0]); }
		const R = (this.v0 ** 2 * Math.sin(2 * a)) / 9.8, Hm = (this.v0 * Math.sin(a)) ** 2 / 19.6;
		this.out.textContent = `טווח: ${R.toFixed(1)} m   גובה מרבי: ${Hm.toFixed(1)} m`;
	}
}

// <bl-spring>
class Spring extends BlElement {
	setup() {
		this.canvas(0.45);
		const c = this.controls();
		this.k = 4; this.m = 1; this.A = 1; this.t = 0; this.hist = [];
		this.slider(c, 'k', 1, 20, 0.5, this.k, (v) => (this.k = v));
		this.slider(c, 'm', 0.2, 5, 0.1, this.m, (v) => (this.m = v));
		this.out = this.text(c);
		this.loop((dt) => { this.t += dt; this.hist.push(this.x()); if (this.hist.length > 300) this.hist.shift(); this.draw(); });
	}
	x() { return this.A * Math.cos(Math.sqrt(this.k / this.m) * this.t); }
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), mid = W * 0.3, amp = W * 0.12, y = H / 2, bx = mid + this.x() * amp;
		this.clear();
		ctx.strokeStyle = col.dim; ctx.lineWidth = 4; line(ctx, 10, y - 40, 10, y + 40);
		ctx.strokeStyle = col.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, y);
		for (let i = 1; i <= 16; i++) ctx.lineTo(10 + ((bx - 30 - 10) * i) / 16, y + (i % 2 ? -12 : 12));
		ctx.lineTo(bx - 20, y); ctx.stroke();
		ctx.fillStyle = col.series[0]; ctx.fillRect(bx - 20, y - 20, 40, 40);
		ctx.setLineDash([4, 4]); ctx.strokeStyle = col.grid; line(ctx, mid, y - 50, mid, y + 50); ctx.setLineDash([]);
		const gx = W * 0.55, gw = W * 0.43;
		ctx.strokeStyle = col.grid; ctx.lineWidth = 1; line(ctx, gx, y, gx + gw, y);
		ctx.strokeStyle = col.series[1]; ctx.lineWidth = 2; ctx.beginPath();
		this.hist.forEach((v, i) => { const px = gx + (i / 300) * gw, py = y - v * H * 0.4; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
		ctx.stroke();
		label(ctx, 'x(t)', gx + 15, 14, col.series[1]);
		this.out.textContent = `ω = √(k/m) = ${Math.sqrt(this.k / this.m).toFixed(2)} rad/s   T = ${((2 * Math.PI) / Math.sqrt(this.k / this.m)).toFixed(2)} s`;
	}
}

// <bl-particles>
class Particles extends BlElement {
	setup() {
		this.canvas(0.5);
		const c = this.controls();
		this.T = 20;
		this.slider(c, 'טמפרטורה', 0, 100, 1, this.T, (v) => (this.T = v));
		this.out = this.text(c);
		this.ps = Array.from({ length: 64 }, (_, i) => ({ hx: (i % 8) + 0.5, hy: Math.floor(i / 8) + 0.5, x: 0, y: 0, vx: Math.random() - 0.5, vy: Math.random() - 0.5 }));
		this.loop((dt) => this.step(dt));
	}
	step(dt) {
		if (!this.W) return;
		const { W, H } = this, s = Math.min(W, H) / 12, ox = W / 2 - 4 * s, oy = H - 8 * s - 6, phase = this.T < 33 ? 0 : this.T < 66 ? 1 : 2;
		const speed = 20 + this.T * 4;
		for (const p of this.ps) {
			if (!p.x) { p.x = ox + p.hx * s; p.y = oy + p.hy * s; }
			if (phase === 0) {
				const hx = ox + p.hx * s, hy = oy + p.hy * s, j = this.T / 10;
				p.x += (hx - p.x) * 0.2 + (Math.random() - 0.5) * j; p.y += (hy - p.y) * 0.2 + (Math.random() - 0.5) * j;
			} else {
				p.vx += (Math.random() - 0.5) * 0.4; p.vy += (Math.random() - 0.5) * 0.4 + (phase === 1 ? 0.15 : 0);
				const n = Math.hypot(p.vx, p.vy) || 1; p.vx /= n; p.vy /= n;
				p.x += p.vx * speed * dt; p.y += p.vy * speed * dt;
				const top = phase === 1 ? H * 0.45 : 6;
				if (p.x < 6 || p.x > W - 6) p.vx *= -1;
				if (p.y < top || p.y > H - 6) p.vy *= -1;
				p.x = Math.max(6, Math.min(W - 6, p.x)); p.y = Math.max(top, Math.min(H - 6, p.y));
			}
		}
		this.phase = phase;
		this.draw();
	}
	draw() {
		if (!this.W || !this.ps) return;
		const col = palette();
		this.clear();
		const color = [col.series[0], col.series[2], col.series[3]][this.phase ?? 0];
		for (const p of this.ps) dot(this.ctx, p.x, p.y, Math.min(this.W, this.H) / 30, color);
		this.out.textContent = ['מוצק', 'נוזל', 'גז'][this.phase ?? 0];
	}
}

// <bl-solar-system> / <bl-solar-system mode="seasons">
class SolarSystem extends BlElement {
	setup() {
		this.seasons = this.getAttribute('mode') === 'seasons';
		this.canvas(0.55);
		const c = this.controls();
		this.t = 0; this.speed = 1;
		this.slider(c, 'מהירות', 0, 5, 0.1, this.speed, (v) => (this.speed = v));
		this.out = this.text(c);
		this.loop((dt) => { this.t += dt * this.speed; this.draw(); });
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), cx = W / 2, cy = H / 2;
		this.clear();
		dot(ctx, cx, cy, this.seasons ? 22 : 16, '#fbbf24');
		if (this.seasons) {
			const R = Math.min(W * 0.38, H * 0.42 * 1.6), a = this.t * 0.6, ex = cx + R * Math.cos(a), ey = cy + R * 0.45 * Math.sin(a);
			ctx.strokeStyle = col.grid; ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
			dot(ctx, ex, ey, 14, '#3b82f6');
			const tilt = (23.4 * Math.PI) / 180;
			ctx.strokeStyle = col.text; ctx.lineWidth = 2; line(ctx, ex - 22 * Math.sin(tilt), ey - 22 * Math.cos(tilt), ex + 22 * Math.sin(tilt), ey + 22 * Math.cos(tilt));
			// the half of the Earth facing the Sun is lit
			const toSun = Math.atan2(cy - ey, cx - ex);
			ctx.beginPath(); ctx.arc(ex, ey, 14, toSun + Math.PI / 2, toSun - Math.PI / 2); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
			const m = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
			const season = ['קיץ', 'סתיו', 'חורף', 'אביב'][Math.floor(((m + Math.PI / 4) % (Math.PI * 2)) / (Math.PI / 2))];
			this.out.textContent = `בחצי הכדור הצפוני: ${season}`;
		} else {
			const planets = [['כוכב חמה', 0.39, 0.24, 3, '#a8a29e'], ['נוגה', 0.72, 0.62, 5, '#fcd34d'], ['כדור הארץ', 1, 1, 5, '#3b82f6'], ['מאדים', 1.52, 1.88, 4, '#ef4444'], ['צדק', 2.4, 11.9, 9, '#f59e0b']];
			const k = Math.min(W, H * 1.6) * 0.18;
			for (const [name, r, T, size, color] of planets) {
				const R = r * k, a = (this.t / T) * 1.2;
				ctx.strokeStyle = col.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
				const x = cx + R * Math.cos(a), y = cy + R * 0.6 * Math.sin(a);
				dot(ctx, x, y, size, color);
				label(ctx, name, x, y - size - 9, col.dim, 11);
			}
			this.out.textContent = `שנות כדור הארץ: ${(this.t / (Math.PI * 2 / 1.2)).toFixed(1)}`;
		}
	}
}

define('bl-projectile', Projectile);
define('bl-spring', Spring);
define('bl-particles', Particles);
define('bl-solar-system', SolarSystem);
