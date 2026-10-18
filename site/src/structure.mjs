// Reads content/ according to STRUCTURE.md: computes page ids (URLs), validates the
// structure rules and builds the Starlight sidebar.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const contentDir = fileURLToPath(new URL('../../content/', import.meta.url));
// Extra content roots shown together with content/ (local preview of the private repo):
// BLEARNING_EXTRA_CONTENT=../../blearning/content (relative to site/, ';'-separated)
export const contentDirs = [
	contentDir,
	...(process.env.BLEARNING_EXTRA_CONTENT ?? '').split(';').filter(Boolean).map((d) => path.resolve(fileURLToPath(new URL('..', import.meta.url)), d)),
].filter((d) => fs.existsSync(d));

/** The content root that contains an absolute path, and the path relative to it. */
export function locate(abs) {
	for (const root of contentDirs) {
		const rel = path.relative(root, abs);
		if (!rel.startsWith('..') && !path.isAbsolute(rel)) return { root, rel };
	}
	return null;
}

const PREFIX = /^\d{2}-/;
const SECTIONS = ['material', 'assignments', 'summaries', 'exams'];
// Fixed order of unit children (STRUCTURE.md §5); anything else comes after.
const UNIT_ORDER = ['tips', 'allowed-aids', ...SECTIONS];

/** Strip ordering prefixes and `_index`, so `a/01-b/_index.md` → `a/b`. */
export function idFromPath(relPath) {
	const parts = relPath.replace(/\\/g, '/').replace(/\.mdx?$/, '').split('/');
	if (parts.at(-1) === '_index') parts.pop();
	return parts.map((p) => p.replace(PREFIX, '')).join('/') || 'index';
}

/** URL path of a content folder (used for `_files/`). */
export function dirId(relDir) {
	return relDir.replace(/\\/g, '/').split('/').filter(Boolean).map((p) => p.replace(PREFIX, '')).join('/');
}

function frontmatter(file) {
	const m = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
	return m ? YAML.parse(m[1]) ?? {} : {};
}

const isPage = (name) => /\.mdx?$/.test(name) && name !== '_index.md' && name !== '_index.mdx';

function readNode(dirs, rel, errors) {
	dirs = dirs.filter((d) => fs.existsSync(d));
	const indexFile = dirs.flatMap((d) => ['_index.md', '_index.mdx'].map((f) => path.join(d, f))).find((f) => fs.existsSync(f));
	if (!indexFile) {
		errors.push(`${rel || '.'}: folder without _index.md`);
		return null;
	}
	const fm = frontmatter(indexFile);
	const node = { rel, name: path.basename(rel || '.'), fm, kind: fm.kind, pages: [], children: [] };
	if (rel && !fm.kind) errors.push(`${rel}/_index.md: missing "kind"`);
	const seen = new Set();
	for (const dir of dirs) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (entry.name.startsWith('_') || entry.name.startsWith('.') || seen.has(entry.name)) continue;
			seen.add(entry.name);
			const childRel = rel ? `${rel}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				const child = readNode(dirs.map((d) => path.join(d, entry.name)), childRel, errors);
				if (child) node.children.push(child);
			} else if (isPage(entry.name)) {
				node.pages.push({ rel: childRel, name: entry.name.replace(/\.mdx?$/, ''), fm: frontmatter(path.join(dir, entry.name)) });
			}
		}
	}
	return node;
}

function validate(node, errors, inSummaries = false) {
	if (node.kind === 'unit') {
		if (!node.pages.some((p) => p.name === 'allowed-aids')) errors.push(`${node.rel}: unit without allowed-aids.md`);
		if (!node.children.some((c) => SECTIONS.includes(c.name))) errors.push(`${node.rel}: unit without any section (${SECTIONS.join(', ')})`);
	}
	const summaries = inSummaries || (node.kind === 'section' && node.name === 'summaries');
	if (summaries && node.pages.some((p) => p.name === 'solutions')) errors.push(`${node.rel}: summaries never contain exercises (solutions.md)`);
	if ((node.kind === 'chapter' || node.kind === 'part') && !PREFIX.test(node.name)) errors.push(`${node.rel}: ${node.kind} folder needs a two-digit prefix`);
	for (const c of node.children) validate(c, errors, summaries);
}

function sortKey(item, parentKind) {
	if (parentKind === 'unit') {
		const i = UNIT_ORDER.indexOf(item.name);
		if (i >= 0) return [0, i, ''];
	}
	if (item.name === 'solutions') return [9, 0, ''];
	const prefix = item.name.match(/^(\d{2})-/);
	if (prefix) return [1, Number(prefix[1]), ''];
	return [2, item.fm.order ?? 1e9, item.fm.title ?? item.name];
}

function compare(a, b, parentKind) {
	const ka = sortKey(a, parentKind), kb = sortKey(b, parentKind);
	for (let i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
	return 0;
}

function toSidebar(node, includeDrafts) {
	const items = [...node.pages.map((p) => ({ ...p, page: true })), ...node.children]
		.filter((i) => includeDrafts || !i.fm.draft)
		.sort((a, b) => compare(a, b, node.kind))
		.map((i) =>
			i.page
				? { label: i.fm.title ?? i.name, slug: idFromPath(i.rel) }
				: toSidebar(i, includeDrafts),
		);
	const badge = node.fm.status === 'stub' ? { badge: { text: 'בבנייה', variant: 'caution' } } : {};
	if (!items.length) return { label: node.fm.title ?? node.name, slug: idFromPath(node.rel), ...badge };
	return {
		label: node.fm.title ?? node.name,
		...badge,
		collapsed: true,
		items: [{ label: 'סקירה', slug: idFromPath(node.rel) }, ...items],
	};
}

/** Validate content/ and return the Starlight sidebar. Throws on structure errors. */
export function buildSidebar({ includeDrafts = true } = {}) {
	const errors = [];
	const root = readNode(contentDirs, '', errors);
	if (root) validate(root, errors);
	if (errors.length) throw new Error(`content/ breaks STRUCTURE.md:\n  - ${errors.join('\n  - ')}`);
	return root.children
		.filter((c) => includeDrafts || !c.fm.draft)
		.sort((a, b) => compare(a, b, root.kind))
		.map((c) => toSidebar(c, includeDrafts));
}

