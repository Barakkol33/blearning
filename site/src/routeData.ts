// Sidebar per page: the home page lists every area; inside an area the sidebar shows only that area, expanded.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

type Entry = { type: 'link'; isCurrent: boolean } | { type: 'group'; entries: Entry[]; collapsed: boolean };

const containsCurrent = (e: Entry): boolean =>
	e.type === 'link' ? e.isCurrent : e.entries.some(containsCurrent);

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	const sidebar = route.sidebar as Entry[];
	const area = sidebar.find(containsCurrent);
	// The home page (and anything outside the areas) is not in the sidebar, so it keeps the full list.
	if (!area) return;
	route.sidebar = [area.type === 'group' ? { ...area, collapsed: false } : area] as typeof route.sidebar;
});
