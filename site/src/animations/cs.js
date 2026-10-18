import { BlElement, palette, line, dot, label, define } from './base.js';

// Step generators: each yields {a, hi: [indices], sorted: Set}
function* bubble(a) {
	const s = new Set();
	for (let i = a.length - 1; i > 0; i--) {
		for (let j = 0; j < i; j++) { yield { hi: [j, j + 1], s }; if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; yield { hi: [j, j + 1], s, swap: true }; } }
		s.add(i);
	}
	s.add(0);
}
function* insertion(a) {
	const s = new Set([0]);
	for (let i = 1; i < a.length; i++) {
		for (let j = i; j > 0 && a[j - 1] > a[j]; j--) { [a[j], a[j - 1]] = [a[j - 1], a[j]]; yield { hi: [j - 1, j], s, swap: true }; }
		for (let k = 0; k <= i; k++) s.add(k);
		yield { hi: [i], s };
	}
}
function* selection(a) {
	const s = new Set();
	for (let i = 0; i < a.length; i++) {
		let m = i;
		for (let j = i + 1; j < a.length; j++) { yield { hi: [m, j], s }; if (a[j] < a[m]) m = j; }
		[a[i], a[m]] = [a[m], a[i]]; s.add(i); yield { hi: [i, m], s, swap: true };
	}
}
function* quick(a, lo = 0, hi = a.length - 1, s = new Set()) {
	if (lo > hi) return;
	if (lo === hi) { s.add(lo); return; }
	const p = a[hi]; let i = lo;
	for (let j = lo; j < hi; j++) { yield { hi: [j, hi], s, pivot: hi }; if (a[j] < p) { [a[i], a[j]] = [a[j], a[i]]; i++; yield { hi: [i - 1, j], s, swap: true, pivot: hi }; } }
	[a[i], a[hi]] = [a[hi], a[i]]; s.add(i); yield { hi: [i], s, swap: true };
	yield* quick(a, lo, i - 1, s); yield* quick(a, i + 1, hi, s);
}
function* heap(a) {
	const s = new Set(), n = a.length;
	function* sift(i, size) {
		for (;;) {
			let m = i; const l = 2 * i + 1, r = l + 1;
			if (l < size && a[l] > a[m]) m = l;
			if (r < size && a[r] > a[m]) m = r;
			yield { hi: [i, m], s };
			if (m === i) return;
			[a[i], a[m]] = [a[m], a[i]]; yield { hi: [i, m], s, swap: true }; i = m;
		}
	}
	for (let i = Math.floor(n / 2) - 1; i >= 0; i--) yield* sift(i, n);
	for (let e = n - 1; e > 0; e--) { [a[0], a[e]] = [a[e], a[0]]; s.add(e); yield { hi: [0, e], s, swap: true }; yield* sift(0, e); }
	s.add(0);
}
function* merge(a, lo = 0, hi = a.length, s = new Set()) {
	if (hi - lo < 2) return;
	const mid = (lo + hi) >> 1;
	yield* merge(a, lo, mid, s); yield* merge(a, mid, hi, s);
	const left = a.slice(lo, mid), right = a.slice(mid, hi);
	let i = 0, j = 0, k = lo;
	while (i < left.length || j < right.length) {
		a[k] = j >= right.length || (i < left.length && left[i] <= right[j]) ? left[i++] : right[j++];
		yield { hi: [k], s, swap: true }; k++;
	}
	if (lo === 0 && hi === a.length) for (let x = 0; x < a.length; x++) s.add(x);
}
const ALGOS = { bubble: ['מיון בועות', bubble], insertion: ['מיון הכנסה', insertion], selection: ['מיון בחירה', selection], quick: ['מיון מהיר', quick], heap: ['מיון ערימה', heap], merge: ['מיון מיזוג', merge] };

// <bl-sorting algorithm="bubble|insertion|selection|quick|heap|merge">
class Sorting extends BlElement {
	setup() {
		this.algo = this.getAttribute('algorithm') || 'bubble';
		this.canvas(0.45);
		const c = this.controls();
		this.speed = 8;
		this.select(c, 'אלגוריתם', Object.entries(ALGOS).map(([k, [t]]) => [k, t]), this.algo, (v) => { this.algo = v; this.reset(); });
		this.button(c, '↺ ערבב', () => this.reset());
		this.slider(c, 'מהירות', 1, 30, 1, this.speed, (v) => (this.speed = v));
		this.out = this.text(c);
		this.reset();
		let acc = 0;
		this.loop((dt) => {
			acc += dt * this.speed * 6;
			while (acc >= 1 && this.gen) {
				acc--;
				const r = this.gen.next();
				if (r.done) { this.gen = null; this.st = { hi: [], s: new Set(this.a.keys()) }; } else { this.st = r.value; this.steps++; if (r.value.swap) this.swaps++; }
			}
			this.draw();
		});
	}
	reset() {
		this.a = Array.from({ length: 28 }, () => 5 + Math.floor(Math.random() * 95));
		this.gen = ALGOS[this.algo][1](this.a); this.st = { hi: [], s: new Set() }; this.steps = 0; this.swaps = 0;
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), bw = W / this.a.length;
		this.clear();
		this.a.forEach((v, i) => {
			ctx.fillStyle = this.st.hi.includes(i) ? (this.st.swap ? col.series[3] : col.series[1]) : i === this.st.pivot ? col.series[4] : this.st.s.has(i) ? col.series[2] : col.series[0];
			const h = (v / 100) * (H - 10);
			ctx.fillRect(i * bw + 1, H - h, bw - 2, h);
		});
		this.out.textContent = `השוואות/צעדים: ${this.steps}   החלפות: ${this.swaps}`;
	}
}

// <bl-call-stack> : factorial / fibonacci call stack
class CallStack extends BlElement {
	setup() {
		this.canvas(0.5);
		const c = this.controls();
		this.fn = 'fact'; this.n = 5;
		this.select(c, 'פונקציה', [['fact', 'עצרת'], ['fib', 'פיבונאצ\'י']], this.fn, (v) => { this.fn = v; this.reset(); });
		this.slider(c, 'n', 1, 7, 1, this.n, (v) => { this.n = v; this.reset(); });
		this.button(c, '↺', () => this.reset());
		this.out = this.text(c);
		this.reset();
		let acc = 0;
		this.loop((dt) => { acc += dt * 2.5; while (acc >= 1) { acc--; this.next(); } this.draw(); });
	}
	reset() {
		this.events = []; this.i = 0; this.stack = []; this.result = null;
		const ev = this.events, fn = this.fn;
		const rec = (n) => {
			ev.push({ t: 'call', n });
			let r;
			if (fn === 'fact') r = n <= 1 ? 1 : n * rec(n - 1);
			else r = n <= 1 ? n : rec(n - 1) + rec(n - 2);
			ev.push({ t: 'ret', n, r });
			return r;
		};
		rec(this.n);
	}
	next() {
		if (this.i >= this.events.length) { if (this.i++ > this.events.length + 6) this.reset(); return; }
		const e = this.events[this.i++];
		if (e.t === 'call') this.stack.push({ n: e.n });
		else { this.stack.pop(); if (this.stack.length) this.stack.at(-1).last = e.r; else this.result = e.r; }
		this.last = e;
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), h = Math.min(32, (H - 20) / 9), w = Math.min(260, W * 0.6), x = (W - w) / 2;
		this.clear();
		this.stack.forEach((f, i) => {
			const y = H - 10 - (i + 1) * (h + 4), top = i === this.stack.length - 1;
			ctx.fillStyle = top ? col.series[1] : col.series[0]; ctx.globalAlpha = top ? 1 : 0.6;
			ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
			label(ctx, `${this.fn === 'fact' ? 'fact' : 'fib'}(${f.n})${f.last !== undefined ? `   ← ${f.last}` : ''}`, x + w / 2, y + h / 2, '#fff', 14);
		});
		const e = this.last;
		this.out.textContent = this.result !== null ? `תוצאה: ${this.result}` : e ? (e.t === 'call' ? `קריאה: n = ${e.n}` : `חזרה מ-n = ${e.n} עם ${e.r}`) : '';
	}
}

// <bl-stack-queue>
class StackQueue extends BlElement {
	setup() {
		this.canvas(0.4);
		const c = this.controls();
		this.mode = 'stack'; this.items = []; this.next = 1; this.anim = null;
		this.select(c, 'מבנה', [['stack', 'מחסנית (LIFO)'], ['queue', 'תור (FIFO)']], this.mode, (v) => { this.mode = v; this.items = []; });
		this.button(c, this.mode === 'stack' ? 'push / הכנס' : 'הכנס', () => { if (this.items.length < 9) this.items.push({ v: this.next++, t: 0 }); });
		this.button(c, 'pop / הוצא', () => {
			if (!this.items.length) return;
			const it = this.mode === 'stack' ? this.items.pop() : this.items.shift();
			this.anim = { v: it.v, t: 0 }; this.out.textContent = `יצא: ${it.v}`;
		});
		this.out = this.text(c);
		this.loop((dt) => { for (const it of this.items) it.t = Math.min(1, it.t + dt * 4); if (this.anim) { this.anim.t += dt * 2; if (this.anim.t > 1) this.anim = null; } this.draw(); });
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), s = Math.min(48, H / 2.5);
		this.clear();
		if (this.mode === 'stack') {
			const x = W / 2 - s / 2;
			ctx.strokeStyle = col.dim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, 10); ctx.lineTo(x - 6, H - 6); ctx.lineTo(x + s + 6, H - 6); ctx.lineTo(x + s + 6, 10); ctx.stroke();
			this.items.forEach((it, i) => {
				const y = H - 10 - (i + 1) * (s * 0.42) - (1 - it.t) * 40;
				ctx.fillStyle = col.series[i % 8]; ctx.fillRect(x, y, s, s * 0.38); label(ctx, it.v, x + s / 2, y + s * 0.19, '#fff', 13);
			});
			if (this.anim) label(ctx, `${this.anim.v} ↑`, W / 2, 20 - this.anim.t * 10, col.series[3], 16);
		} else {
			const y = H / 2 - s / 2, x0 = W * 0.15;
			ctx.strokeStyle = col.dim; line(ctx, x0, y - 6, W * 0.85, y - 6); line(ctx, x0, y + s + 6, W * 0.85, y + s + 6);
			label(ctx, 'יציאה ←', x0 - 30, H / 2, col.dim, 12); label(ctx, '← כניסה', W * 0.85 + 30, H / 2, col.dim, 12);
			this.items.forEach((it, i) => {
				const x = x0 + 6 + i * (s + 6) + (1 - it.t) * 60;
				ctx.fillStyle = col.series[(it.v - 1) % 8]; ctx.fillRect(x, y, s, s); label(ctx, it.v, x + s / 2, y + s / 2, '#fff', 14);
			});
		}
	}
}

// <bl-tree-traversal>
class TreeTraversal extends BlElement {
	setup() {
		this.canvas(0.55);
		const c = this.controls();
		this.order = 'in';
		this.select(c, 'סריקה', [['pre', 'תחילית (preorder)'], ['in', 'תוכית (inorder)'], ['post', 'סופית (postorder)'], ['level', 'לפי רמות (BFS)']], this.order, (v) => { this.order = v; this.reset(); });
		this.button(c, '↺', () => this.reset());
		this.out = this.text(c);
		// BST of these keys
		const keys = [50, 30, 70, 20, 40, 60, 80, 35, 65];
		this.root = null;
		const ins = (n, k, d, x, w) => n ? (k < n.k ? (n.l = ins(n.l, k, d + 1, x - w / 2, w / 2)) : (n.r = ins(n.r, k, d + 1, x + w / 2, w / 2)), n) : { k, d, x };
		for (const k of keys) this.root = ins(this.root, k, 0, 0.5, 0.5);
		this.reset();
		let acc = 0;
		this.loop((dt) => { acc += dt * 1.5; if (acc >= 1) { acc = 0; if (this.i < this.seq.length) this.i++; else if (this.i++ > this.seq.length + 3) this.reset(); } this.draw(); });
	}
	reset() {
		const seq = [], o = this.order;
		const walk = (n) => { if (!n) return; if (o === 'pre') seq.push(n); walk(n.l); if (o === 'in') seq.push(n); walk(n.r); if (o === 'post') seq.push(n); };
		if (o === 'level') { const q = [this.root]; while (q.length) { const n = q.shift(); seq.push(n); n.l && q.push(n.l); n.r && q.push(n.r); } } else walk(this.root);
		this.seq = seq; this.i = 0;
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), P = (n) => [n.x * W, 30 + n.d * ((H - 60) / 3)];
		this.clear();
		const edges = (n) => { if (!n) return; for (const c of [n.l, n.r]) if (c) { ctx.strokeStyle = col.grid; ctx.lineWidth = 2; line(ctx, ...P(n), ...P(c)); edges(c); } };
		edges(this.root);
		const visited = new Set(this.seq.slice(0, this.i));
		const nodes = (n) => { if (!n) return; const [x, y] = P(n), cur = this.seq[this.i - 1] === n; dot(ctx, x, y, 17, cur ? col.series[1] : visited.has(n) ? col.series[2] : col.series[0]); label(ctx, n.k, x, y, '#fff', 13); nodes(n.l); nodes(n.r); };
		nodes(this.root);
		this.out.textContent = this.seq.slice(0, this.i).map((n) => n.k).join(', ');
	}
}

// <bl-graph-search algorithm="bfs|dfs|astar">
class GraphSearch extends BlElement {
	setup() {
		this.algo = this.getAttribute('algorithm') || 'bfs';
		this.canvas(0.55);
		const c = this.controls();
		this.select(c, 'אלגוריתם', [['bfs', 'BFS'], ['dfs', 'DFS'], ['astar', 'A*']], this.algo, (v) => { this.algo = v; this.reset(); });
		this.button(c, '↺ מבוך חדש', () => { this.maze(); this.reset(); });
		this.out = this.text(c);
		this.cols = 25; this.rows = 13;
		this.maze(); this.reset();
		let acc = 0;
		this.loop((dt) => { acc += dt * 40; while (acc >= 1) { acc--; this.step(); } this.draw(); });
	}
	maze() {
		const R = this.rows, C = this.cols;
		this.wall = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => r === 0 || c === 0 || r === R - 1 || c === C - 1 || Math.random() < 0.27));
		this.start = [1, 1]; this.goal = [R - 2, C - 2];
		this.wall[1][1] = this.wall[R - 2][C - 2] = false;
	}
	reset() {
		this.seen = new Map([[this.key(this.start), null]]); this.frontier = [{ p: this.start, g: 0 }]; this.done = false; this.path = []; this.expanded = 0;
	}
	key([r, c]) { return r * 1000 + c; }
	step() {
		if (this.done) return;
		if (!this.frontier.length) { this.done = true; this.out.textContent = `אין מסלול. נפתחו ${this.expanded} צמתים`; return; }
		let idx = 0;
		if (this.algo === 'dfs') idx = this.frontier.length - 1;
		if (this.algo === 'astar') { const h = ([r, c]) => Math.abs(r - this.goal[0]) + Math.abs(c - this.goal[1]); let best = Infinity; this.frontier.forEach((f, i) => { const v = f.g + h(f.p); if (v < best) { best = v; idx = i; } }); }
		const { p, g } = this.frontier.splice(idx, 1)[0];
		this.cur = p; this.expanded++;
		if (p[0] === this.goal[0] && p[1] === this.goal[1]) {
			this.done = true; let k = this.key(p);
			while (k !== null) { this.path.push(k); k = this.seen.get(k); }
			this.out.textContent = `מסלול באורך ${this.path.length - 1}. נפתחו ${this.expanded} צמתים`;
			return;
		}
		for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
			const q = [p[0] + dr, p[1] + dc];
			if (!this.wall[q[0]][q[1]] && !this.seen.has(this.key(q))) { this.seen.set(this.key(q), this.key(p)); this.frontier.push({ p: q, g: g + 1 }); }
		}
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), s = Math.min(W / this.cols, H / this.rows), ox = (W - s * this.cols) / 2, oy = (H - s * this.rows) / 2;
		this.clear();
		const path = new Set(this.path), front = new Set(this.frontier.map((f) => this.key(f.p)));
		for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
			const k = this.key([r, c]);
			ctx.fillStyle = this.wall[r][c] ? col.grid : path.has(k) ? col.series[1] : front.has(k) ? col.series[4] : this.seen.has(k) ? col.series[0] : col.bg;
			ctx.fillRect(ox + c * s + 1, oy + r * s + 1, s - 2, s - 2);
		}
		for (const [p, color] of [[this.start, col.series[2]], [this.goal, col.series[3]]]) dot(ctx, ox + p[1] * s + s / 2, oy + p[0] * s + s / 2, s * 0.35, color);
	}
}

// <bl-dfa> : binary numbers divisible by 3
class Dfa extends BlElement {
	setup() {
		this.canvas(0.45);
		const c = this.controls();
		const l = document.createElement('label');
		this.inp = Object.assign(document.createElement('input'), { value: '1101', dir: 'ltr', size: 12 });
		this.inp.addEventListener('input', () => { this.inp.value = this.inp.value.replace(/[^01]/g, ''); this.reset(); });
		l.append('מילה: ', this.inp); c.append(l);
		this.button(c, '▶', () => this.reset());
		this.out = this.text(c);
		this.reset();
		let acc = 0;
		this.loop((dt) => { acc += dt * 1.2; if (acc >= 1) { acc = 0; if (this.i < this.inp.value.length) { this.state = (this.state * 2 + +this.inp.value[this.i]) % 3; this.i++; } } this.draw(); });
	}
	reset() { this.state = 0; this.i = 0; }
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), pos = [[W * 0.2, H * 0.55], [W * 0.5, H * 0.55], [W * 0.8, H * 0.55]], r = Math.min(30, H * 0.13);
		this.clear();
		const arrow = (a, b, txt, bend) => {
			const [x1, y1] = pos[a], [x2, y2] = pos[b];
			ctx.strokeStyle = col.dim; ctx.lineWidth = 1.5; ctx.beginPath();
			if (a === b) { ctx.arc(x1, y1 - r - 14, 16, 0, Math.PI * 2); ctx.stroke(); label(ctx, txt, x1, y1 - r - 40, col.text); return; }
			const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + bend;
			ctx.moveTo(x1, y1 + Math.sign(bend) * r * 0.8); ctx.quadraticCurveTo(mx, my, x2, y2 + Math.sign(bend) * r * 0.8); ctx.stroke();
			label(ctx, txt, mx, my + Math.sign(bend) * 4, col.text);
		};
		// transitions δ(q, b) = (2q + b) mod 3
		arrow(0, 0, '0'); arrow(2, 2, '1'); arrow(0, 1, '1', -50); arrow(1, 0, '1', 50); arrow(1, 2, '0', -50); arrow(2, 1, '0', 50);
		pos.forEach(([x, y], q) => {
			dot(ctx, x, y, r, q === this.state ? col.series[1] : col.series[0]);
			if (q === 0) { ctx.strokeStyle = col.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r - 5, 0, Math.PI * 2); ctx.stroke(); }
			label(ctx, `q${q}`, x, y, '#fff', 15);
		});
		label(ctx, '→', pos[0][0] - r - 16, pos[0][1], col.text, 20);
		const w = this.inp.value, done = this.i >= w.length;
		this.out.textContent = `${w.slice(0, this.i)}·${w.slice(this.i)}   ${done ? (this.state === 0 ? `✔ מתקבלת (${parseInt(w || '0', 2)} מתחלק ב-3)` : `✘ נדחית (${parseInt(w || '0', 2)} לא מתחלק ב-3)`) : ''}`;
	}
}

// <bl-truth-table formula="(p -> q) & !r">  operators: ! & | -> <->
class TruthTable extends BlElement {
	setup() {
		this.formula = this.getAttribute('formula') || 'p & q';
		this.vars = [...new Set(this.formula.match(/[a-z]/g))].sort();
		const table = document.createElement('table');
		table.dir = 'ltr';
		table.style.cssText = 'width:auto;margin:0 auto;text-align:center;font-family:var(--sl-font-mono)';
		const js = this.formula.replace(/<->/g, '==').replace(/->/g, '<=').replace(/!/g, '!').replace(/&/g, '&&').replace(/\|/g, '||');
		const f = new Function(...this.vars, `return !!(${js.replace(/([a-z])/g, '(+$1)')})`);
		const head = `<tr>${this.vars.map((v) => `<th>${v}</th>`).join('')}<th>${this.formula}</th></tr>`;
		let body = '';
		for (let m = 0; m < 2 ** this.vars.length; m++) {
			const vals = this.vars.map((_, i) => !((m >> (this.vars.length - 1 - i)) & 1));
			const r = f(...vals);
			body += `<tr>${vals.map((v) => `<td>${v ? 'T' : 'F'}</td>`).join('')}<td style="font-weight:700;color:${r ? '#10b981' : '#ef4444'}">${r ? 'T' : 'F'}</td></tr>`;
		}
		table.innerHTML = head + body;
		this.append(table);
		const rows = [...table.querySelectorAll('tr')].slice(1);
		let i = 0;
		this.loop(() => {
			if (performance.now() - (this.t || 0) < 900) return;
			this.t = performance.now();
			rows.forEach((r, k) => (r.style.background = k === i ? 'var(--sl-color-accent-low)' : ''));
			i = (i + 1) % rows.length;
		});
	}
}

// <bl-binary-counter bits="8">
class BinaryCounter extends BlElement {
	setup() {
		this.bits = +this.getAttribute('bits') || 8;
		this.v = 0;
		this.row = document.createElement('div');
		this.row.dir = 'ltr';
		this.row.style.cssText = 'display:flex;gap:.35rem;justify-content:center;flex-wrap:wrap';
		this.btns = Array.from({ length: this.bits }, (_, i) => {
			const b = Object.assign(document.createElement('button'), { type: 'button', className: 'bl-btn' });
			b.style.cssText = 'width:2.6rem;height:3rem;font-size:1.3rem;font-family:var(--sl-font-mono)';
			b.addEventListener('click', () => { this.v ^= 1 << (this.bits - 1 - i); this.draw(); });
			this.row.append(b);
			return b;
		});
		this.append(this.row);
		const c = this.controls();
		this.button(c, '+1', () => { this.v = (this.v + 1) % 2 ** this.bits; this.draw(); });
		this.auto = false;
		this.button(c, '⏯ ספירה', () => (this.auto = !this.auto));
		this.out = this.text(c);
		this.loop(() => { if (this.auto && performance.now() - (this.t || 0) > 400) { this.t = performance.now(); this.v = (this.v + 1) % 2 ** this.bits; this.draw(); } });
		this.draw();
	}
	draw() {
		const col = palette();
		this.btns.forEach((b, i) => { const on = (this.v >> (this.bits - 1 - i)) & 1; b.textContent = on; b.style.background = on ? col.accent : 'transparent'; b.style.color = on ? col.bg : col.text; });
		this.out.textContent = `עשרוני: ${this.v}   הקסדצימלי: 0x${this.v.toString(16).toUpperCase().padStart(Math.ceil(this.bits / 4), '0')}`;
	}
}

// <bl-scheduler> : Round Robin
class Scheduler extends BlElement {
	setup() {
		this.canvas(0.4);
		const c = this.controls();
		this.q = 2;
		this.slider(c, 'quantum', 1, 6, 1, this.q, (v) => { this.q = v; this.compute(); });
		this.out = this.text(c);
		this.jobs = [{ n: 'P1', a: 0, b: 5 }, { n: 'P2', a: 1, b: 3 }, { n: 'P3', a: 2, b: 7 }, { n: 'P4', a: 4, b: 2 }];
		this.compute();
		this.loop(() => this.draw());
	}
	compute() {
		const rem = this.jobs.map((j) => j.b), q = [], slots = [], fin = {};
		let t = 0, added = 0;
		const arrive = () => { while (added < this.jobs.length && this.jobs[added].a <= t) q.push(added++); };
		arrive();
		while (q.length || added < this.jobs.length) {
			if (!q.length) { t++; arrive(); slots.push(-1); continue; }
			const i = q.shift(), run = Math.min(this.q, rem[i]);
			for (let k = 0; k < run; k++) { slots.push(i); t++; arrive(); }
			rem[i] -= run;
			if (rem[i]) q.push(i); else fin[i] = t;
		}
		this.slots = slots; this.t0 = performance.now();
		const wait = this.jobs.map((j, i) => fin[i] - j.a - j.b);
		this.out.textContent = `זמן המתנה ממוצע: ${(wait.reduce((a, b) => a + b, 0) / wait.length).toFixed(2)}`;
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), n = this.slots.length, s = (W - 40) / n, shown = Math.min(n, (performance.now() - this.t0) / 250);
		this.clear();
		this.jobs.forEach((j, i) => label(ctx, j.n, 18, 25 + i * ((H - 40) / 4) + 10, col.series[i]));
		this.slots.forEach((i, k) => {
			if (k >= shown || i < 0) return;
			ctx.fillStyle = col.series[i];
			ctx.fillRect(36 + k * s, 25 + i * ((H - 40) / 4), s - 1, (H - 40) / 4 - 6);
		});
		ctx.strokeStyle = col.dim; line(ctx, 36, H - 12, W - 4, H - 12);
		for (let k = 0; k <= n; k += 2) label(ctx, k, 36 + k * s, H - 5, col.dim, 10);
	}
}

// <bl-venn-join>
class VennJoin extends BlElement {
	setup() {
		this.canvas(0.4);
		const c = this.controls();
		this.kind = 'inner';
		this.select(c, 'JOIN', [['inner', 'INNER'], ['left', 'LEFT'], ['right', 'RIGHT'], ['full', 'FULL OUTER']], this.kind, (v) => { this.kind = v; this.draw(); });
		this.out = this.text(c);
		this.draw();
	}
	draw() {
		if (!this.W) return;
		const { ctx, W, H } = this, col = palette(), r = H * 0.38, cx = W / 2, d = r * 0.6;
		this.clear();
		const circle = (x) => { ctx.beginPath(); ctx.arc(x, H / 2, r, 0, Math.PI * 2); };
		const fill = (inA, inB) => {
			const k = this.kind;
			return (inA && inB) || (inA && (k === 'left' || k === 'full')) || (inB && (k === 'right' || k === 'full'));
		};
		for (let x = cx - d - r; x < cx + d + r; x += 2) for (let y = H / 2 - r; y < H / 2 + r; y += 2) {
			const inA = Math.hypot(x - (cx - d), y - H / 2) < r, inB = Math.hypot(x - (cx + d), y - H / 2) < r;
			if ((inA || inB) && fill(inA, inB)) { ctx.fillStyle = col.series[0]; ctx.fillRect(x, y, 2, 2); }
		}
		ctx.strokeStyle = col.text; ctx.lineWidth = 2; circle(cx - d); ctx.stroke(); circle(cx + d); ctx.stroke();
		label(ctx, 'A', cx - d - r * 0.5, H / 2, col.text, 18); label(ctx, 'B', cx + d + r * 0.5, H / 2, col.text, 18);
		this.out.textContent = { inner: 'רק שורות שיש להן התאמה בשתי הטבלאות', left: 'כל השורות מ-A, ו-NULL כשאין התאמה ב-B', right: 'כל השורות מ-B, ו-NULL כשאין התאמה ב-A', full: 'כל השורות משתי הטבלאות' }[this.kind];
	}
}

define('bl-sorting', Sorting);
define('bl-call-stack', CallStack);
define('bl-stack-queue', StackQueue);
define('bl-tree-traversal', TreeTraversal);
define('bl-graph-search', GraphSearch);
define('bl-dfa', Dfa);
define('bl-truth-table', TruthTable);
define('bl-binary-counter', BinaryCounter);
define('bl-scheduler', Scheduler);
define('bl-venn-join', VennJoin);
