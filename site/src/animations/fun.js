import { BlElement, define } from './base.js';

const css = `
.bl-anim :is(.bl-col-topics,.bl-col-list,.bl-col-card)>*{margin:0}
.bl-col-topics{display:flex;flex-wrap:wrap;gap:.35rem;margin:.6rem 0}
.bl-col-topics button{font:inherit;font-size:.85rem;padding:.15rem .7rem;border-radius:999px;border:1px solid var(--sl-color-gray-5);background:transparent;color:var(--sl-color-text);cursor:pointer}
.bl-col-topics button[aria-pressed=true]{background:var(--sl-color-accent);border-color:var(--sl-color-accent);color:var(--sl-color-black)}
.bl-col-list{display:grid;gap:.6rem;max-height:70vh;overflow-y:auto;padding:.2rem}
.bl-col-card{border:1px solid var(--sl-color-gray-5);border-radius:.6rem;padding:.7rem .9rem;background:var(--sl-color-black);margin:0}
.bl-col-card summary{cursor:pointer;font-weight:600}
.bl-anim .bl-col-card .bl-col-second{margin-top:.4rem;color:var(--sl-color-accent-high)}
.bl-anim .bl-col-card .bl-col-tags{margin-top:.35rem;font-size:.75rem;color:var(--sl-color-gray-3)}
.bl-col-one .bl-col-card{font-size:1.25rem;min-height:7rem;display:flex;flex-direction:column;justify-content:center}
`;
let styled = false;

// Ratings, lowest first (the optional 4th column).
const RATINGS = [['נחמד', '⭐'], ['טוב', '⭐⭐'], ['מצוין', '⭐⭐⭐']];

// Shared base of <bl-jokes> and <bl-quotes>: rows "main | second | topic, topic | rating".
// Two modes: scroll through everything or draw one at random, both filtered by topic and rating.
class Collection extends BlElement {
	setup() {
		if (!styled) {
			document.head.append(Object.assign(document.createElement('style'), { textContent: css }));
			styled = true;
		}
		this.items = this.rows().map(([main, second = '', topics = '', rating = '']) => ({ main, second, rating, topics: topics.split(',').map((t) => t.trim()).filter(Boolean) }));
		this.topics = [...new Set(this.items.flatMap((i) => i.topics))].sort((a, b) => a.localeCompare(b, 'he'));
		this.ratings = RATINGS.filter(([r]) => this.items.some((i) => i.rating === r));
		this.picked = new Set();
		this.pickedRatings = new Set();
		this.mode = this.getAttribute('mode') === 'scroll' ? 'scroll' : 'random';

		const c = this.controls();
		this.select(c, 'תצוגה', [['random', '🎲 אחד אקראי'], ['scroll', '📜 גלילה']], this.mode, (v) => { this.mode = v; this.render(); });
		this.again = this.button(c, this.againLabel, () => this.render());
		this.out = this.text(c);

		this.ratingBar = this.chipBar(this.pickedRatings);
		this.topicBar = this.chipBar(this.picked);
		this.body = document.createElement('div');
		this.append(this.ratingBar, this.topicBar, this.body);
		this.render();
	}

	/** A row of toggle chips that edits `picked`; the first chip ("הכל") clears it. */
	chipBar(picked) {
		const bar = document.createElement('div');
		bar.className = 'bl-col-topics';
		bar.addEventListener('click', (e) => {
			const b = e.target.closest('button');
			if (!b) return;
			const v = b.dataset.value;
			v ? (picked.has(v) ? picked.delete(v) : picked.add(v)) : picked.clear();
			this.queue = null;
			this.render();
		});
		return bar;
	}

	fillChips(bar, picked, chips) {
		bar.innerHTML = '';
		for (const [v, label] of chips) {
			const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
			if (v) b.dataset.value = v;
			b.setAttribute('aria-pressed', v ? picked.has(v) : !picked.size);
			bar.append(b);
		}
	}

	filtered() {
		return this.items.filter((i) =>
			(!this.picked.size || i.topics.some((t) => this.picked.has(t))) &&
			(!this.pickedRatings.size || this.pickedRatings.has(i.rating)));
	}

	/** Next random item: a shuffled queue, so nothing repeats until all were shown. */
	draw(list) {
		if (!this.queue?.length) this.queue = [...list].sort(() => Math.random() - 0.5);
		return this.queue.pop();
	}

	render() {
		const list = this.filtered();
		const count = (f) => this.items.filter(f).length;
		this.fillChips(this.topicBar, this.picked, [['', `כל הנושאים (${this.items.length})`], ...this.topics.map((t) => [t, `${t} (${count((i) => i.topics.includes(t))})`])]);
		this.ratingBar.hidden = !this.ratings.length;
		this.fillChips(this.ratingBar, this.pickedRatings, [['', 'כל הדירוגים'], ...this.ratings.map(([r, stars]) => [r, `${stars} ${r} (${count((i) => i.rating === r)})`])]);
		this.again.hidden = this.mode !== 'random';
		this.body.className = this.mode === 'random' ? 'bl-col-one' : 'bl-col-list';
		this.body.innerHTML = '';
		if (this.mode === 'random') {
			const item = this.draw(list);
			if (item) this.body.append(this.card(item, false));
			this.out.textContent = `מתוך ${list.length}`;
		} else {
			for (const item of list) this.body.append(this.card(item, true));
			this.body.scrollTop = 0;
			this.out.textContent = `${list.length} פריטים`;
		}
	}

	el(tag, cls, text) {
		const e = Object.assign(document.createElement(tag), { className: cls ?? '', textContent: text ?? '' });
		e.dir = 'auto';
		return e;
	}

	/** Rating stars, plus the topics when scrolling. */
	meta(item, withTags) {
		const stars = RATINGS.find(([r]) => r === item.rating);
		const parts = [stars ? `${stars[1]} ${stars[0]}` : '', withTags ? item.topics.join(' · ') : ''].filter(Boolean);
		return parts.length ? this.el('div', 'bl-col-tags', parts.join('  ·  ')) : null;
	}
}

// <bl-jokes> with rows "setup | punchline | topics | rating": the punchline opens on click
class Jokes extends Collection {
	againLabel = '😂 עוד בדיחה';
	card(item, withTags) {
		const d = this.el('details', 'bl-col-card');
		d.append(this.el('summary', '', item.main));
		if (item.second) d.append(this.el('div', 'bl-col-second', item.second));
		d.append(this.meta(item, withTags) ?? '');
		return d;
	}
}

// <bl-quotes> with rows "quote | author | topics | rating"
class Quotes extends Collection {
	againLabel = '💬 עוד ציטוט';
	card(item, withTags) {
		const q = this.el('blockquote', 'bl-col-card');
		q.append(this.el('div', '', item.main));
		if (item.second) q.append(this.el('div', 'bl-col-second', `— ${item.second}`));
		q.append(this.meta(item, withTags) ?? '');
		return q;
	}
}

define('bl-jokes', Jokes);
define('bl-quotes', Quotes);
