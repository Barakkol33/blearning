// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { buildSidebar } from './src/structure.mjs';
import { remarkContent } from './src/markdown.mjs';
import { contentFiles } from './src/files.mjs';
// Old URLs → new pages, after the high-school units were flattened (2026-10).
import oldUrls from './src/redirects.json' with { type: 'json' };

const site = 'https://barakkol33.github.io';
const base = '/blearning';
const isBuild = process.argv.includes('build');

export default defineConfig({
	site,
	base,
	trailingSlash: 'always',
	redirects: Object.fromEntries(Object.entries(oldUrls).map(([from, to]) => [from, `${base}${to}`])),
	markdown: {
		remarkPlugins: [remarkMath, [remarkContent, { base }]],
		rehypePlugins: [rehypeKatex],
	},
	integrations: [
		starlight({
			title: 'blearning',
			defaultLocale: 'root',
			locales: { root: { label: 'עברית', lang: 'he', dir: 'rtl' } },
			customCss: ['katex/dist/katex.min.css', './src/styles/custom.css'],
			components: {
				Head: './src/overrides/Head.astro',
				MarkdownContent: './src/overrides/MarkdownContent.astro',
				PageTitle: './src/overrides/PageTitle.astro',
			},
			// Home lists all areas; a page inside an area shows only that area in the sidebar.
			routeMiddleware: './src/routeData.ts',
			// Drafts are shown in dev and left out of the published site.
			sidebar: buildSidebar({ includeDrafts: !isBuild }),
		}),
		contentFiles({ base }),
	],
});
