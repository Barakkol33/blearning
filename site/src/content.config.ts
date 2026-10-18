import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsSchema } from '@astrojs/starlight/schema';
import path from 'node:path';
import { contentDirs, idFromPath } from './structure.mjs';

// One glob over all content roots: base is their common parent.
const parts = contentDirs.map((d) => path.resolve(d).split(path.sep));
const common = parts[0].slice(0, parts.reduce((n, p) => { let i = 0; while (i < n && p[i] === parts[0][i]) i++; return i; }, parts[0].length));
// relative to the project root (site/), like the default '../content'
const base = path.relative(process.cwd(), common.join(path.sep)).split(path.sep).join('/') || '.';
const roots = contentDirs.map((d) => path.relative(base, d).split(path.sep).join('/'));
const strip = (entry: string) => {
	const root = roots.find((r) => !r || entry.startsWith(`${r}/`)) ?? '';
	return root ? entry.slice(root.length + 1) : entry;
};

// Front matter fields from STRUCTURE.md §7, on top of Starlight's own (title, description, draft…).
const blearning = z.object({
	kind: z.enum(['area', 'group', 'unit', 'guide', 'section', 'part', 'chapter', 'home']).optional(),
	order: z.number().optional(),
	status: z.enum(['stub', 'draft', 'in-progress', 'solid']).optional(),
	level: z.number().optional(),
	questionnaire: z.string().optional(),
	institution: z.string().optional(),
	'course-code': z.string().optional(),
	aids: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
	related: z.array(z.string()).optional(),
	attachments: z.array(z.string()).optional(),
	updated: z.coerce.date().optional(),
	lang: z.string().optional(),
});

export const collections = {
	docs: defineCollection({
		loader: glob({
			base,
			pattern: [...roots.map((r) => `${r ? `${r}/` : ''}**/*.{md,mdx}`), '!**/_files/**', '!**/node_modules/**'],
			generateId: ({ entry }) => idFromPath(strip(entry)),
		}),
		schema: docsSchema({ extend: blearning }),
	}),
};
