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

// Shared base of <bl-jokes> and <bl-quotes>: rows "main | second | topic, topic".
// Two modes: scroll through everything (filtered by topic) or draw one at random.
class Collection extends BlElement {
	setup() {
		if (!styled) {
			document.head.append(Object.assign(document.createElement('style'), { textContent: css }));
			styled = true;
		}
		this.items = this.rows().map(([main, second = '', topics = '']) => ({ main, second, topics: topics.split(',').map((t) => t.trim()).filter(Boolean) }));
		this.topics = [...new Set(this.items.flatMap((i) => i.topics))].sort((a, b) => a.localeCompare(b, 'he'));
		this.picked = new Set();
		this.mode = this.getAttribute('mode') === 'scroll' ? 'scroll' : 'random';

		const c = this.controls();
		this.select(c, 'תצוגה', [['random', '🎲 אחד אקראי'], ['scroll', '📜 גלילה']], this.mode, (v) => { this.mode = v; this.render(); });
		this.again = this.button(c, this.againLabel, () => this.render());
		this.out = this.text(c);

		this.topicBar = document.createElement('div');
		this.topicBar.className = 'bl-col-topics';
		this.topicBar.addEventListener('click', (e) => {
			const b = e.target.closest('button');
			if (!b) return;
			const t = b.dataset.topic;
			t ? (this.picked.has(t) ? this.picked.delete(t) : this.picked.add(t)) : this.picked.clear();
			this.queue = null;
			this.render();
		});
		this.body = document.createElement('div');
		this.append(this.topicBar, this.body);
		this.render();
	}

	filtered() {
		return this.picked.size ? this.items.filter((i) => i.topics.some((t) => this.picked.has(t))) : this.items;
	}

	/** Next random item: a shuffled queue, so nothing repeats until all were shown. */
	draw(list) {
		if (!this.queue?.length) this.queue = [...list].sort(() => Math.random() - 0.5);
		return this.queue.pop();
	}

	render() {
		const list = this.filtered();
		const count = (t) => this.items.filter((i) => i.topics.includes(t)).length;
		this.topicBar.innerHTML = '';
		for (const [t, label] of [['', `הכל (${this.items.length})`], ...this.topics.map((t) => [t, `${t} (${count(t)})`])]) {
			const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
			if (t) b.dataset.topic = t;
			b.setAttribute('aria-pressed', t ? this.picked.has(t) : !this.picked.size);
			this.topicBar.append(b);
		}
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

	tags(item) {
		return this.el('div', 'bl-col-tags', item.topics.join(' · '));
	}
}

// <bl-jokes> with rows "setup | punchline | topics": the punchline opens on click
class Jokes extends Collection {
	againLabel = '😂 עוד בדיחה';
	card(item, withTags) {
		const d = this.el('details', 'bl-col-card');
		d.append(this.el('summary', '', item.main));
		if (item.second) d.append(this.el('div', 'bl-col-second', item.second));
		if (withTags) d.append(this.tags(item));
		return d;
	}
}

// <bl-quotes> with rows "quote | author | topics"
class Quotes extends Collection {
	againLabel = '💬 עוד ציטוט';
	card(item, withTags) {
		const q = this.el('blockquote', 'bl-col-card');
		q.append(this.el('div', '', item.main));
		if (item.second) q.append(this.el('div', 'bl-col-second', `— ${item.second}`));
		if (withTags) q.append(this.tags(item));
		return q;
	}
}

define('bl-jokes', Jokes);
define('bl-quotes', Quotes);
