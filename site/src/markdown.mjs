// Remark plugin for content/ pages:
// - drops the leading `# Title` (Starlight already renders the title),
// - rewrites relative links so they work on the site:
//     other pages  `../x/page.md`  → `/<base>/<id>/`
//     attachments  `_files/a.pdf`  → `/<base>/<dir-id>/_files/a.pdf`
import path from 'node:path';
import { visit } from 'unist-util-visit';
import { locate, idFromPath, dirId } from './structure.mjs';

export function remarkContent({ base = '/' } = {}) {
	const root = base.endsWith('/') ? base : `${base}/`;
	return (tree, file) => {
		const abs = file.history?.[0] ?? file.path;
		if (!abs) return;
		const where = locate(abs);
		if (!where) return;
		const { rel } = where;

		const first = tree.children.find((n) => n.type !== 'yaml' && n.type !== 'html');
		if (first?.type === 'heading' && first.depth === 1) tree.children.splice(tree.children.indexOf(first), 1);

		visit(tree, 'link', (node) => {
			const url = node.url;
			if (/^([a-z]+:|\/|#)/i.test(url)) return;
			const [target, hash] = url.split('#');
			const resolved = path.join(path.dirname(rel), decodeURI(target));
			if (/\.mdx?$/.test(target)) {
				node.url = `${root}${idFromPath(resolved)}/${hash ? `#${hash}` : ''}`;
			} else {
				node.url = `${root}${dirId(path.dirname(resolved))}/${path.basename(resolved)}`;
			}
		});
	};
}
