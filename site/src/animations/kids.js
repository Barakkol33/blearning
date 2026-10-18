import { BlElement, define } from './base.js';

const HE = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');
const EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ANIMALS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵', '🐥', '🐢', '🦋', '🐞'];
const COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

const css = `
.bl-kid{font-family:system-ui,sans-serif;text-align:center;user-select:none}
.bl-kid .big{font-size:5rem;line-height:1.1;margin:.3rem 0;animation:bl-bounce 1.6s ease-in-out infinite}
.bl-kid .opts{display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;margin:1rem 0}
.bl-kid .opt{width:5.5rem;height:5.5rem;border-radius:50%;border:none;font-size:2.6rem;font-weight:700;color:#fff;cursor:pointer;box-shadow:0 .3rem 0 rgba(0,0,0,.25);transition:transform .15s}
.bl-kid .opt:hover{transform:scale(1.08)}
.bl-kid .opt.wrong{animation:bl-shake .4s}
.bl-kid .stars{font-size:1.6rem;min-height:2rem;letter-spacing:.2rem}
.bl-kid .animals{font-size:3rem;display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;max-width:24rem;margin:0 auto;min-height:4rem}
.bl-kid .animals span{animation:bl-in .4s ease both}
.bl-kid .msg{font-size:1.5rem;min-height:2.2rem;font-weight:700}
@keyframes bl-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-.4rem)}}
@keyframes bl-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-.5rem)}75%{transform:translateX(.5rem)}}
@keyframes bl-in{from{transform:scale(0) rotate(-30deg)}to{transform:scale(1)}}
@keyframes bl-confetti{to{transform:translate(var(--x),var(--y)) rotate(360deg);opacity:0}}
`;

class KidGame extends BlElement {
	setup() {
		if (!document.getElementById('bl-kid-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'bl-kid-css', textContent: css }));
		this.classList.add('bl-kid');
		this.score = 0;
		this.stars = Object.assign(document.createElement('div'), { className: 'stars' });
		this.msg = Object.assign(document.createElement('div'), { className: 'msg' });
		this.append(this.stars);
		this.init();
		this.append(this.msg);
		this.round();
	}
	say(text, lang) {
		try {
			const u = new SpeechSynthesisUtterance(text);
			u.lang = lang;
			speechSynthesis.cancel();
			speechSynthesis.speak(u);
		} catch {}
	}
	options(correct, pool, n, onPick) {
		this.opts.innerHTML = '';
		const choices = shuffle([correct, ...shuffle(pool.filter((x) => x !== correct)).slice(0, n - 1)]);
		choices.forEach((c, i) => {
			const b = Object.assign(document.createElement('button'), { type: 'button', className: 'opt', textContent: c });
			b.style.background = COLORS[i % COLORS.length];
			b.addEventListener('click', () => {
				if (c === correct) { this.win(b); onPick?.(true); }
				else { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); this.msg.textContent = this.tryAgain; onPick?.(false); }
			});
			this.opts.append(b);
		});
	}
	win(b) {
		this.score++;
		this.stars.textContent = '⭐'.repeat(this.score % 10 || 10);
		this.msg.textContent = pick(this.praise);
		const r = b.getBoundingClientRect(), host = this.getBoundingClientRect();
		for (let i = 0; i < 18; i++) {
			const s = document.createElement('span');
			s.textContent = pick(['🎉', '⭐', '✨', '🎈']);
			s.style.cssText = `position:absolute;left:${r.left - host.left + r.width / 2}px;top:${r.top - host.top + r.height / 2}px;font-size:1.4rem;pointer-events:none;--x:${(Math.random() - 0.5) * 300}px;--y:${(Math.random() - 0.5) * 300}px;animation:bl-confetti .9s ease-out forwards`;
			this.append(s);
			setTimeout(() => s.remove(), 1000);
		}
		setTimeout(() => this.round(), 1100);
	}
}

// <bl-first-letter> / <bl-first-letter lang="en">
// Shows a picture and its word with the first letter missing; the child picks the letter the word starts with.
const WORDS_HE = [
	['🐶', 'כלב'], ['🐱', 'חתול'], ['🐰', 'ארנב'], ['🐻', 'דוב'], ['🐸', 'צפרדע'], ['🐵', 'קוף'], ['🐢', 'צב'], ['🦋', 'פרפר'],
	['🐟', 'דג'], ['🐴', 'סוס'], ['🐄', 'פרה'], ['🐍', 'נחש'], ['🦓', 'זברה'], ['🐫', 'גמל'], ['🦁', 'אריה'], ['🐘', 'פיל'],
	['🍎', 'תפוח'], ['🍌', 'בננה'], ['🍇', 'ענבים'], ['🍋', 'לימון'], ['🍦', 'גלידה'], ['🎂', 'עוגה'], ['🥚', 'ביצה'], ['🍕', 'פיצה'],
	['🏠', 'בית'], ['🚗', 'מכונית'], ['🚌', 'אוטובוס'], ['✈️', 'מטוס'], ['🚆', 'רכבת'], ['⚽', 'כדור'], ['📖', 'ספר'], ['🔑', 'מפתח'],
	['☀️', 'שמש'], ['🌙', 'ירח'], ['⭐', 'כוכב'], ['🌸', 'פרח'], ['🌳', 'עץ'], ['⛰️', 'הר'], ['❤️', 'לב'], ['✋', 'יד'],
	['👂', 'אוזן'], ['⏰', 'שעון'], ['📱', 'טלפון'], ['🧦', 'גרב'], ['👑', 'כתר'], ['🎈', 'בלון'], ['🪑', 'כיסא'], ['🌊', 'ים'],
	['🦒', 'ג׳ירפה'], ['🐧', 'פינגווין'], ['🦉', 'ינשוף'], ['🐝', 'דבורה'], ['🐜', 'נמלה'], ['🦈', 'כריש'], ['🐙', 'תמנון'], ['🐔', 'תרנגול'],
	['🦆', 'ברווז'], ['🐑', 'כבשה'], ['🦚', 'טווס'], ['🍓', 'תות'], ['🥕', 'גזר'], ['🍉', 'אבטיח'], ['🧀', 'גבינה'], ['🍞', 'לחם'],
	['🥛', 'חלב'], ['🌧️', 'גשם'], ['❄️', 'שלג'], ['🔥', 'אש'], ['🌹', 'ורד'], ['👟', 'נעל'], ['👕', 'חולצה'], ['🎁', 'מתנה'],
	['🥁', 'תוף'], ['🚲', 'אופניים'], ['🚢', 'אונייה'], ['🌈', 'קשת'], ['🧸', 'דובי'], ['🪁', 'עפיפון'], ['🦷', 'שן'], ['🐭', 'עכבר'],
];
const WORDS_EN = [
	['🍎', 'apple'], ['⚽', 'ball'], ['🐱', 'cat'], ['🐶', 'dog'], ['🥚', 'egg'], ['🐟', 'fish'], ['🍇', 'grapes'], ['🎩', 'hat'],
	['🍦', 'ice cream'], ['🧃', 'juice'], ['🔑', 'key'], ['🦁', 'lion'], ['🌙', 'moon'], ['👃', 'nose'], ['🍊', 'orange'], ['🐷', 'pig'],
	['👑', 'queen'], ['🐰', 'rabbit'], ['☀️', 'sun'], ['🌳', 'tree'], ['☂️', 'umbrella'], ['🎻', 'violin'], ['🐳', 'whale'], ['🪀', 'yo-yo'], ['🦓', 'zebra'],
	['🐜', 'ant'], ['🐝', 'bee'], ['🍌', 'banana'], ['🚗', 'car'], ['🎂', 'cake'], ['🦆', 'duck'], ['🐘', 'elephant'], ['🐸', 'frog'],
	['🔥', 'fire'], ['🐐', 'goat'], ['🐴', 'horse'], ['🏠', 'house'], ['🪁', 'kite'], ['🍃', 'leaf'], ['🐵', 'monkey'], ['🐭', 'mouse'],
	['🐙', 'octopus'], ['🦉', 'owl'], ['🍕', 'pizza'], ['🐧', 'penguin'], ['🌧️', 'rain'], ['🚀', 'rocket'], ['⭐', 'star'], ['🐍', 'snake'],
	['🐯', 'tiger'], ['🐢', 'turtle'], ['🚐', 'van'], ['⌚', 'watch'],
];
class FirstLetter extends KidGame {
	init() {
		this.style.position = 'relative';
		this.en = this.getAttribute('lang') === 'en';
		this.words = this.en ? WORDS_EN : WORDS_HE;
		this.letters = this.en ? EN : HE;
		this.praise = this.en ? ['Great job!', 'Super!', 'Well done!'] : ['כל הכבוד!', 'מעולה!', 'יופי!', 'אלוף!'];
		this.tryAgain = this.en ? 'Listen again and try 🙂' : 'הקשיבו שוב ונסו 🙂';
		this.big = Object.assign(document.createElement('div'), { className: 'big' });
		this.big.style.cursor = 'pointer';
		this.big.title = this.en ? 'Click to hear the word' : 'לחצו כדי לשמוע את המילה';
		this.big.addEventListener('click', () => this.speak());
		this.word = document.createElement('div');
		this.word.dir = this.en ? 'ltr' : 'rtl';
		this.word.style.cssText = 'display:flex;justify-content:center;align-items:flex-end;gap:.05em;font-size:2.6rem;font-weight:700;margin:.2rem 0';
		this.opts = Object.assign(document.createElement('div'), { className: 'opts' });
		this.append(this.big, this.word, this.opts);
	}
	speak() { this.say(this.current[1], this.en ? 'en-US' : 'he-IL'); }
	round() {
		let next;
		do next = pick(this.words); while (next === this.current);
		this.current = next;
		const [emoji, word] = next, first = word[0].toUpperCase();
		this.msg.textContent = this.en ? 'Which letter does the word start with?' : 'באיזו אות מתחילה המילה?';
		this.big.textContent = emoji;
		const rest = word.slice(1);
		this.word.innerHTML = `<span style="min-width:.9em;color:var(--sl-color-accent);border-bottom:.2rem dashed var(--sl-color-accent)">?</span><span>${rest}</span>`;
		// distractors: other letters, never the right one
		this.options(first, this.letters, 3, (ok) => {
			if (ok) this.word.innerHTML = `<span style="color:var(--sl-color-orange-high)">${first}</span><span>${rest}</span>`;
			else this.speak();
		});
		setTimeout(() => this.speak(), 300);
	}
}

// <bl-count-game>
class CountGame extends KidGame {
	init() {
		this.style.position = 'relative';
		this.praise = ['כל הכבוד!', 'ספרת נכון!', 'מעולה!', 'יופי של ספירה!'];
		this.tryAgain = 'בואו נספור שוב 🙂';
		this.animals = Object.assign(document.createElement('div'), { className: 'animals' });
		this.opts = Object.assign(document.createElement('div'), { className: 'opts' });
		this.append(this.animals, this.opts);
	}
	round() {
		const n = 1 + Math.floor(Math.random() * 9), a = pick(ANIMALS);
		this.msg.textContent = 'כמה חיות יש?';
		this.animals.innerHTML = Array.from({ length: n }, (_, i) => `<span style="animation-delay:${i * 0.12}s">${a}</span>`).join('');
		this.animals.onclick = () => this.say(String(n), 'he-IL');
		this.options(String(n), Array.from({ length: 10 }, (_, i) => String(i + 1)), 3);
	}
}

define('bl-first-letter', FirstLetter);
define('bl-count-game', CountGame);
