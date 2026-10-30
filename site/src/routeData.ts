// Sidebar per page: the home page lists every area, an area's home page lists that area, and
// inside a subject (a guide, unit or group of the area) the sidebar shows only that subject.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

type Link = { type: 'link'; label: string; isCurrent: boolean };
type Group = { type: 'group'; label: string; entries: Entry[]; collapsed: boolean };
type Entry = Link | Group;

const containsCurrent = (e: Entry): boolean =>
	e.type === 'link' ? e.isCurrent : e.entries.some(containsCurrent);

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	const sidebar = route.sidebar as Entry[];
	const area = sidebar.find(containsCurrent);
	// The home page (and anything outside the areas) is not in the sidebar, so it keeps the full list.
	if (!area) return;
	if (area.type === 'link') {
		route.sidebar = [area] as typeof route.sidebar;
		return;
	}
	const subject = area.entries.find(containsCurrent);
	// A page directly in the area (its home page, or a page of a flat area such as fun/) keeps the whole area.
	const entries = subject?.type === 'group'
		? [{ ...area.entries[0], label: `חזרה אל ${area.label}` }, { ...subject, collapsed: false }]
		: area.entries;
	route.sidebar = [{ ...area, collapsed: false, entries }] as typeof route.sidebar;
});
