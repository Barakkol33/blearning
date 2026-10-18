// Astro integration that publishes every content/**/_files/ folder at its page URL
// (e.g. content/bagrut/01-x/_files/a.pdf → /<base>/bagrut/x/_files/a.pdf), in dev and build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentDirs, dirId } from './structure.mjs';

function* filesDirs(dir, rel = '') {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!e.isDirectory()) continue;
		const childRel = rel ? `${rel}/${e.name}` : e.name;
		if (e.name === '_files') yield { abs: path.join(dir, e.name), url: `${dirId(rel)}/_files`.replace(/^\//, '') };
		else yield* filesDirs(path.join(dir, e.name), childRel);
	}
}

export function contentFiles({ base = '/' } = {}) {
	const root = base.endsWith('/') ? base : `${base}/`;
	return {
		name: 'blearning-content-files',
		hooks: {
			'astro:server:setup': ({ server }) => {
				server.middlewares.use((req, res, next) => {
					const url = decodeURIComponent((req.url ?? '').split('?')[0]);
					if (!url.startsWith(root) || !url.includes('/_files/')) return next();
					const want = url.slice(root.length);
					for (const d of contentDirs.flatMap((r) => [...filesDirs(r)])) {
						if (want.startsWith(`${d.url}/`)) {
							const file = path.join(d.abs, want.slice(d.url.length + 1));
							if (fs.existsSync(file)) return fs.createReadStream(file).pipe(res);
						}
					}
					next();
				});
			},
			'astro:build:done': ({ dir }) => {
				const out = fileURLToPath(dir);
				for (const d of contentDirs.flatMap((r) => [...filesDirs(r)])) fs.cpSync(d.abs, path.join(out, d.url), { recursive: true });
			},
		},
	};
}
