import { BlElement, palette, define } from './base.js';

// <bl-timeline> with rows "year | event" (negative year = BCE; small numbers = order only)
class Timeline extends BlElement {
	setup() {
		const rows = this.rows();
		const order = rows.every(([y]) => /^\d+$/.test(y) && +y < 50);
		const wrap = document.createElement('div');
		wrap.style.cssText = 'position:relative;padding:.5rem 0';
		const bar = document.createElement('div');
		bar.style.cssText = 'position:absolute;inset-inline-start:1.1rem;top:0;bottom:0;width:3px;background:var(--sl-color-accent);transform-origin:top;transform:scaleY(0);transition:transform 1.2s ease';
		wrap.append(bar);
		const items = rows.map(([y, ...t], i) => {
			const it = document.createElement('div');
			it.style.cssText = 'position:relative;padding-inline-start:3rem;margin:.6rem 0;opacity:0;transform:translateX(1rem);transition:opacity .5s ease,transform .5s ease';
			const year = order ? '' : +y < 0 ? `${-y} לפנה"ס` : `${y}`;
			it.innerHTML = `<span style="position:absolute;inset-inline-start:.6rem;top:.35rem;width:1.1rem;height:1.1rem;border-radius:50%;background:${palette().series[i % 8]}"></span>${year ? `<b style="color:var(--sl-color-accent-high)">${year}</b> · ` : ''}${t.join(' | ')}`;
			wrap.append(it);
			return it;
		});
		this.append(wrap);
		const c = this.controls();
		const play = () => {
			bar.style.transition = 'none'; bar.style.transform = 'scaleY(0)';
			items.forEach((it) => { it.style.transition = 'none'; it.style.opacity = 0; it.style.transform = 'translateX(1rem)'; });
			requestAnimationFrame(() => requestAnimationFrame(() => {
				bar.style.transition = `transform ${items.length * 0.35}s ease`; bar.style.transform = 'scaleY(1)';
				items.forEach((it, i) => { it.style.transition = `opacity .5s ease ${i * 0.35}s, transform .5s ease ${i * 0.35}s`; it.style.opacity = 1; it.style.transform = 'none'; });
			}));
		};
		this.button(c, '▶ הפעל שוב', play);
		new IntersectionObserver(([e], o) => { if (e.isIntersecting) { play(); o.disconnect(); } }).observe(this);
	}
}

// <bl-flashcards> with rows "front | back"
class Flashcards extends BlElement {
	setup() {
		this.cards = this.rows();
		this.i = 0;
		this.card = document.createElement('button');
		this.card.type = 'button';
		this.card.style.cssText = 'display:block;width:100%;min-height:9rem;font:inherit;font-size:1.4rem;border-radius:.75rem;border:1px solid var(--sl-color-gray-5);background:var(--sl-color-black);color:var(--sl-color-white);cursor:pointer;transition:transform .35s ease;perspective:600px';
		this.card.addEventListener('click', () => this.flip());
		this.append(this.card);
		const c = this.controls();
		this.button(c, '→ הקודם', () => this.go(-1));
		this.button(c, 'הבא ←', () => this.go(1));
		this.button(c, '🔀', () => { this.cards.sort(() => Math.random() - 0.5); this.go(0); });
		this.out = this.text(c);
		this.go(0);
	}
	go(d) { this.i = (this.i + d + this.cards.length) % this.cards.length; this.back = false; this.render(); }
	flip() {
		this.card.style.transform = 'rotateY(90deg)';
		setTimeout(() => { this.back = !this.back; this.render(); this.card.style.transform = 'rotateY(0)'; }, 180);
	}
	render() {
		const [front, back] = this.cards[this.i];
		this.card.textContent = this.back ? back : front;
		this.card.style.color = this.back ? 'var(--sl-color-accent-high)' : 'var(--sl-color-white)';
		this.out.textContent = `${this.i + 1} / ${this.cards.length}   (לחצו על הכרטיס כדי להפוך)`;
	}
}

// <bl-knesset> : D'Hondt-like seat allocation (Bader-Ofer, without surplus agreements)
class Knesset extends BlElement {
	setup() {
		this.parties = [['א', 28], ['ב', 22], ['ג', 14], ['ד', 10], ['ה', 8], ['ו', 6], ['ז', 5], ['ח', 3], ['ט', 2.5], ['י', 1.5]];
		this.threshold = 3.25;
		const c = this.controls();
		this.slider(c, 'אחוז חסימה', 0, 6, 0.25, this.threshold, (v) => { this.threshold = v; this.draw(); });
		this.button(c, '🎲 תוצאות אחרות', () => { this.parties.forEach((p) => (p[1] = Math.max(0.5, p[1] * (0.6 + Math.random() * 0.8)))); this.draw(); });
		this.out = this.text(c);
		this.seatsEl = document.createElement('div');
		this.seatsEl.style.cssText = 'display:grid;grid-template-columns:repeat(20,1fr);gap:3px;margin-top:.6rem';
		this.append(this.seatsEl);
		this.legend = document.createElement('div');
		this.legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:.3rem 1rem;margin-top:.5rem;font-size:.85rem';
		this.append(this.legend);
		this.draw();
	}
	draw() {
		const col = palette(), total = this.parties.reduce((a, p) => a + p[1], 0);
		const passed = this.parties.map(([n, v], i) => ({ n, v, i, pct: (100 * v) / total })).filter((p) => p.pct >= this.threshold);
		const seats = passed.map(() => 0);
		for (let s = 0; s < 120; s++) {
			let best = 0;
			passed.forEach((p, k) => { if (p.v / (seats[k] + 1) > passed[best].v / (seats[best] + 1)) best = k; });
			seats[best]++;
		}
		const cells = [];
		passed.forEach((p, k) => { for (let s = 0; s < seats[k]; s++) cells.push(col.series[p.i % 8]); });
		this.seatsEl.innerHTML = cells.map((c, i) => `<span style="aspect-ratio:1;border-radius:50%;background:${c};animation:bl-pop .3s ease ${i * 4}ms both"></span>`).join('') +
			'<style>@keyframes bl-pop{from{transform:scale(0)}to{transform:scale(1)}}</style>';
		this.legend.innerHTML = this.parties.map(([n, v], i) => {
			const pct = (100 * v) / total, k = passed.findIndex((p) => p.i === i);
			return `<span style="opacity:${k < 0 ? 0.45 : 1}"><b style="color:${col.series[i % 8]}">●</b> רשימה ${n}: ${pct.toFixed(1)}% → ${k < 0 ? 'לא עברה' : seats[k]}</span>`;
		}).join('');
		this.out.textContent = `${passed.length} רשימות עברו את אחוז החסימה`;
	}
}

// <bl-root-builder>
const ROOTS = [['כ', 'ת', 'ב'], ['ל', 'מ', 'ד'], ['ש', 'מ', 'ר'], ['ס', 'פ', 'ר'], ['ג', 'ד', 'ל']];
const PATTERNS = [
	['פָּעַל', '1ָ2ַ3'], ['נִפְעַל', 'נִ1ְ2ַ3'], ['פִּעֵל', '1ִ2ֵּ3'], ['הִפְעִיל', 'הִ1ְ2ִי3'], ['הִתְפַּעֵל', 'הִתְ1ַ2ֵּ3'],
	['מִקְטָל', 'מִ1ְ2ָ3'], ['קְטִילָה', '1ְ2ִי3ָה'], ['קַטָּל', '1ַ2ָּ3'], ['מִקְטֶלֶת', 'מִ1ְ2ֶ3ֶת'],
];
const MARK = /[֑-ׇ]/;
const FINAL = { כ: 'ך', מ: 'ם', נ: 'ן', פ: 'ף', צ: 'ץ' };
class RootBuilder extends BlElement {
	setup() {
		this.r = 0; this.p = 0;
		const c = this.controls();
		this.select(c, 'שורש', ROOTS.map((r, i) => [i, r.join('-')]), 0, (v) => { this.r = +v; this.render(); });
		this.select(c, 'בניין / משקל', PATTERNS.map(([n], i) => [i, n]), 0, (v) => { this.p = +v; this.render(); });
		this.word = document.createElement('div');
		this.word.style.cssText = 'font-size:3rem;text-align:center;margin:.5rem 0;letter-spacing:.05em';
		this.prepend(this.word);
		this.render();
	}
	render() {
		const root = ROOTS[this.r], pat = PATTERNS[this.p][1];
		const chars = [...pat];
		let html = '';
		for (let i = 0; i < chars.length; i++) {
			if (!'123'.includes(chars[i])) { html += chars[i]; continue; }
			let letter = root[+chars[i] - 1];
			if (i === chars.length - 1 && FINAL[letter]) letter = FINAL[letter]; // final form at the end of the word
			// keep the vowel marks with their letter, so they render on it
			while (MARK.test(chars[i + 1] ?? '')) letter += chars[++i];
			html += `<span style="color:var(--sl-color-accent-high);font-weight:700">${letter}</span>`;
		}
		this.word.innerHTML = html;
		this.word.animate?.([{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
	}
}

define('bl-timeline', Timeline);
define('bl-flashcards', Flashcards);
define('bl-knesset', Knesset);
define('bl-root-builder', RootBuilder);
