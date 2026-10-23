// Generates the openu repo (https://github.com/Barakkol33/openu) as blearning content, so it is
// published on the site while openu stays the single source of truth.
//
//   node scripts/openu.mjs           generate into site/.generated/openu-content/ (gitignored)
//   node scripts/openu.mjs --dev     generate, regenerate on every change in openu, and run `astro dev`
//   node scripts/openu.mjs --build   generate (skipped with a warning if openu is missing) and run `astro build`
//
// The openu repo is read from OPENU_DIR (default ../../openu, relative to site/).
// Never edit the generated files: edit openu and regenerate.
//
// Mapping (STRUCTURE.md): openu/<course>/README.md → openu-cs/<course>/ guide, split into
// NN-<chapter>/ by its top headings. Other .md files in the course folder become guide pages.
// Images are copied into the chapter's _files/. Links to code, PDFs and folders point to GitHub.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const siteDir = fileURLToPath(new URL('..', import.meta.url));
const openuDir = path.resolve(siteDir, process.env.OPENU_DIR ?? '../../openu');
const outRoot = path.join(siteDir, '.generated', 'openu-content');
const AREA = 'openu-cs';
const GITHUB = 'https://github.com/Barakkol33/openu';
const SKIP_MD = new Set(['README.md', 'CLAUDE.md', 'LICENSE.md']);
const IMAGE = /\.(png|jpe?g|gif|svg|webp)$/i;

const hebrew = (s) => /[֐-׿]/.test(s);
/** `{ lang: 'en' }` for mostly-English text (prose only: code, math and links are ignored), else `{}`. */
function langOf(text) {
	const prose = text
		.replace(/^\s*(```|~~~)[\s\S]*?^\s*\1\s*$/gm, '')
		.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$|`[^`\n]*`|\]\([^)]*\)|https?:\S+/g, '');
	const he = (prose.match(/[֐-׿]/g) ?? []).length;
	const en = (prose.match(/[A-Za-z]/g) ?? []).length;
	return en > 4 * he ? { lang: 'en' } : {};
}
const frontmatter = (fm, body) => `---\n${YAML.stringify(fm).trimEnd()}\n---\n\n${body.trim()}\n`;
const ghUrl = (rel) => `${GITHUB}/${fs.existsSync(path.join(openuDir, rel)) && fs.statSync(path.join(openuDir, rel)).isDirectory() ? 'tree' : 'blob'}/main/${encodeURI(rel.replace(/\\/g, '/'))}`;

function slugify(text, n, used) {
	let slug = hebrew(text)
		? ''
		: text.toLowerCase().replace(/\$`[^`]*`\$/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	if (slug.length > 40) slug = slug.slice(0, 40).replace(/-[^-]*$/, '');
	if (!slug || used.has(slug)) slug = `chapter-${String(n).padStart(2, '0')}`;
	used.add(slug);
	return slug;
}

/** GitLab/GitHub math (`$`x`$`, ```math) → remark-math ($x$, $$…$$), outside code blocks. */
function convertMath(md) {
	const out = [];
	let fence = null; // { indent, math }
	for (const line of md.split(/\r?\n/)) {
		const open = line.match(/^(\s*)(```|~~~)\s*(\S*)/);
		if (!fence && open) {
			fence = { indent: open[1], math: open[3] === 'math', marker: open[2] };
			out.push(fence.math ? `${open[1]}$$` : line);
			continue;
		}
		if (fence && line.trim() === fence.marker) {
			out.push(fence.math ? `${fence.indent}$$` : line);
			fence = null;
			continue;
		}
		out.push(fence ? line : line.replace(/\$`([^`]+)`\$/g, (_, m) => `$${m}$`));
	}
	return out.join('\n');
}

/** Splits markdown into a title, an intro and chapters at the top heading level, outside code blocks. */
function split(md) {
	const lines = md.split(/\r?\n/);
	const headings = []; // { i, level, text }
	let inFence = false;
	lines.forEach((line, i) => {
		if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
		const h = !inFence && line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
		if (h) headings.push({ i, level: h[1].length, text: h[2] });
	});
	let title = null, start = 0;
	if (headings[0]?.level === 1 && !lines.slice(0, headings[0].i).some((l) => l.trim())) {
		title = headings[0].text;
		start = headings[0].i + 1;
		headings.shift();
	}
	const level = headings.some((h) => h.level === 1) ? 1 : 2;
	const tops = headings.filter((h) => h.level === level);
	const shift = level - 1;
	const body = (from, to) => {
		let inF = false;
		return lines.slice(from, to).map((l) => {
			if (/^\s*(```|~~~)/.test(l)) inF = !inF;
			return !inF && shift && /^#{2,6}\s/.test(l) ? l.slice(shift) : l;
		}).join('\n');
	};
	return {
		title,
		intro: lines.slice(start, tops[0]?.i ?? lines.length).join('\n'),
		chapters: tops.map((h, k) => ({ title: h.text, body: body(h.i + 1, tops[k + 1]?.i ?? lines.length) })),
	};
}

/**
 * Rewrites links and images of markdown from openu/<course>/ that is generated in outRelDir:
 * images are copied to its _files/ (added to `files`), course .md pages are linked relatively,
 * and everything else (code, PDFs, folders) links to GitHub.
 */
function rewriteLinks(md, course, outRelDir, files, pages) {
	const fix = (target, isImage) => {
		if (/^([a-z]+:|\/|#)/i.test(target)) return target;
		const [file, hash] = target.split('#');
		const src = path.join(course, decodeURI(file));
		if (isImage || IMAGE.test(file)) {
			const name = path.basename(file);
			files.set(path.join(outRelDir, '_files', name), path.join(openuDir, src));
			return `_files/${encodeURI(name)}`;
		}
		const page = pages.get(path.normalize(decodeURI(file)));
		if (page) return `${path.relative(outRelDir, page).replace(/\\/g, '/')}${hash ? `#${hash}` : ''}`;
		return ghUrl(src);
	};
	let inFence = false;
	return md.split('\n').map((line) => {
		if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
		if (inFence) return line;
		return line
			.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (_, bang, text, url, t = '') => `${bang}[${text}](${fix(url, !!bang)}${t})`)
			.replace(/(<img[^>]*\ssrc=")([^"]+)(")/g, (_, a, url, b) => `${a}${fix(url, true)}${b}`);
	}).join('\n');
}

function convertCourse(name, out, files) {
	const dir = path.join(openuDir, name);
	const readme = path.join(dir, 'README.md');
	if (!fs.existsSync(readme)) return null;
	const md = convertMath(fs.readFileSync(readme, 'utf8'));
	const { title, intro, chapters } = split(md);
	const unit = path.join(AREA, name);

	// Extra .md files in the course folder → unit pages.
	const pages = new Map();
	const extra = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !SKIP_MD.has(f));
	for (const f of extra) pages.set(f, path.join(unit, f.toLowerCase()));
	for (const f of extra) {
		const text = convertMath(fs.readFileSync(path.join(dir, f), 'utf8'));
		const { title: t } = split(text);
		const fm = { title: (t ?? f.replace(/\.md$/, '')).replace(/\$`([^`]+)`\$/g, '$$$1$$'), ...langOf(text) };
		out.set(path.join(unit, f.toLowerCase()), frontmatter(fm, rewriteLinks(text, name, unit, files, pages)));
	}

	// Attachments: the course PDFs, linked from GitHub.
	const pdfs = fs.readdirSync(dir).filter((f) => f.endsWith('.pdf'));
	const courseTitle = title ?? name;
	const lang = langOf(`${courseTitle}\n${intro}`);
	const pdfLines = pdfs.map((f) => `- [${f}](${ghUrl(path.join(name, f))})`).join('\n');
	out.set(path.join(unit, '_index.md'), frontmatter(
		{ title: courseTitle, kind: 'guide', institution: 'openu', ...lang },
		[rewriteLinks(intro, name, unit, files, pages), pdfLines && `## ${lang.lang ? 'Files' : 'קבצים'}\n\n${pdfLines}`].filter((s) => s?.trim()).join('\n\n'),
	));

	const used = new Set();
	chapters.forEach((c, k) => {
		const n = k + 1;
		const rel = path.join(unit, `${String(n).padStart(2, '0')}-${slugify(c.title, n, used)}`);
		const body = rewriteLinks(c.body, name, rel, files, pages);
		out.set(path.join(rel, '_index.md'), frontmatter({ title: c.title.replace(/\$`([^`]+)`\$/g, '$$$1$$'), kind: 'chapter', ...langOf(`${c.title}\n${c.body}`) }, body));
	});
	// A guide needs a chapter; a README without headings becomes one chapter.
	if (!chapters.length) out.set(path.join(unit, '01-summary', '_index.md'), frontmatter({ title: courseTitle, kind: 'chapter', ...lang }, ''));
	return courseTitle;
}

function generate() {
	if (!fs.existsSync(openuDir)) throw new Error(`openu repo not found at ${openuDir} (set OPENU_DIR)`);
	const out = new Map(); // relative path → text
	const files = new Map(); // relative path → source file to copy
	const courses = fs.readdirSync(openuDir, { withFileTypes: true })
		.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
		.map((e) => [e.name, convertCourse(e.name, out, files)])
		.filter(([, t]) => t);
	out.set(path.join(AREA, '_index.md'), frontmatter(
		{ title: 'האוניברסיטה הפתוחה - מדעי המחשב', kind: 'area', order: 5 },
		`> נוצר אוטומטית מהמאגר [openu](${GITHUB}). עורכים שם, לא כאן.`,
	));

	// Sync to disk: write only what changed and remove stale files, so the dev server reloads cleanly.
	const keep = new Set([...out.keys(), ...files.keys()].map((p) => path.join(outRoot, p)));
	for (const [rel, text] of out) {
		const abs = path.join(outRoot, rel);
		if (fs.existsSync(abs) && fs.readFileSync(abs, 'utf8') === text) continue;
		fs.mkdirSync(path.dirname(abs), { recursive: true });
		fs.writeFileSync(abs, text);
	}
	for (const [rel, src] of files) {
		const abs = path.join(outRoot, rel);
		if (!fs.existsSync(src)) continue;
		if (fs.existsSync(abs) && fs.statSync(abs).mtimeMs >= fs.statSync(src).mtimeMs) continue;
		fs.mkdirSync(path.dirname(abs), { recursive: true });
		fs.copyFileSync(src, abs);
	}
	const prune = (dir) => {
		if (!fs.existsSync(dir)) return;
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			const abs = path.join(dir, e.name);
			if (e.isDirectory()) {
				prune(abs);
				if (!fs.readdirSync(abs).length) fs.rmdirSync(abs);
			} else if (!keep.has(abs)) fs.rmSync(abs);
		}
	};
	prune(outRoot);
	console.log(`openu: ${courses.length} courses → ${path.relative(siteDir, outRoot)}`);
}

const mode = ['--dev', '--build'].find((a) => process.argv.includes(a));

if (mode === '--build' && !fs.existsSync(openuDir)) {
	console.warn(`openu: repo not found at ${openuDir}, building without it`);
	fs.rmSync(outRoot, { recursive: true, force: true });
} else {
	generate();
}

if (mode === '--dev') {
	let timer;
	fs.watch(openuDir, { recursive: true }, (_, file) => {
		if (file && /(^|[\\/])\.git([\\/]|$)/.test(file)) return;
		clearTimeout(timer);
		timer = setTimeout(() => {
			try { generate(); } catch (e) { console.error(e.message); }
		}, 300);
	});
}

if (mode) {
	const extra = [process.env.BLEARNING_EXTRA_CONTENT, path.relative(siteDir, outRoot)].filter(Boolean).join(';');
	spawn('npx', ['astro', mode.slice(2), ...process.argv.slice(2).filter((a) => a !== mode)], {
		stdio: 'inherit',
		shell: true,
		env: { ...process.env, BLEARNING_EXTRA_CONTENT: extra },
	}).on('exit', (code) => process.exit(code ?? 0));
}
