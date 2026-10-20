# blearning: technical specification

What the site has to do, which technologies can do it, what it costs, and the recommended stack.
For where content goes, see [STRUCTURE.md](STRUCTURE.md).

Prices are as of October 2026, in USD unless marked ₪. Check them again before paying for anything.

---

## 1. Guiding constraints

1. **Controlled through Claude Code and git.** Content, configuration and deployment are all files in the repo. Day-to-day work is "edit, commit, push". Web dashboards are used only for one-time setup.
2. **Cheap.** Target ₪0 per month. The only expected cost is a domain.
3. **Simple to use.** No database, no CMS and no server to maintain for the static phase.
4. **No lock-in.** Content is plain Markdown/MDX in the [STRUCTURE.md](STRUCTURE.md) layout and must survive a change of framework.
5. **Ready to grow into a dynamic site.** Animations and interactive pages are a key future tool.

---

## 2. Requirements

Priority: **M** = must have at launch, **S** = should have soon after, **F** = future.

### Content and reading

| # | Requirement | Pri |
|---|---|---|
| R1 | Hebrew RTL pages next to English LTR pages, with correct mixed-direction text | M |
| R2 | Math rendering (LaTeX: inline and block) | M |
| R3 | Code blocks with syntax highlighting | M |
| R4 | Images and downloadable attachments (`_files/`) | M |
| R5 | Navigation generated from the folder hierarchy (sidebar, breadcrumbs, prev/next within a chapter) | M |
| R6 | Hierarchies of any depth and shape (unit / guide / part / chapter, see STRUCTURE.md) | M |
| R7 | Full-text search, including Hebrew | M |
| R8 | Mobile-friendly, dark mode | M |
| R9 | Diagrams from text (Mermaid or similar) | S |
| R10 | Tags pages, "related pages" and backlinks | S |
| R11 | Unit badges from front matter (e.g. "calculator allowed") | S |
| R12 | Interactive components and animations embedded in pages (MDX) | F |
| R13 | Interactive exercises and quizzes | F |
| R14 | User accounts, progress tracking and comments (needs a backend) | F |

### Authoring and operations

| # | Requirement | Pri |
|---|---|---|
| R15 | Content is Markdown files in git, editable by Claude Code | M |
| R16 | Structure validation: the build fails if a file breaks STRUCTURE.md (missing `kind`, a unit without `allowed-aids.md` or without any section…) | M |
| R17 | Local preview with live reload (`npm run dev`) | M |
| R18 | Automatic deploy on push to `main` | M |
| R19 | Preview URL for every branch or PR | S |
| R20 | `sources/` is never published | M |
| R21 | Private source repo possible | S |
| R22 | Custom domain with HTTPS | S |
| R23 | Privacy-friendly analytics | F |
| R24 | Good SEO: sitemap, per-page titles and descriptions | S |

---

## 3. Options

### 3.1 Site framework (static site generator)

| Option | Strong points | Weak points |
|---|---|---|
| **Astro + Starlight** | Built for docs: sidebar, search (Pagefind), dark mode, i18n and RTL built in. Content collections with Zod schemas give structure validation (R16). MDX and "islands" (React/Svelte/Vue components) give animations without changing framework (R12). Can switch to server rendering later (R14). | Younger than Docusaurus. The sidebar has to be generated from our `kind`/prefix rules (a small script). |
| **Docusaurus** | Mature, MDX, versioning, large ecosystem | React-only. RTL works but is less polished. Validation is more manual. Heavier. |
| **MkDocs Material** | Very fast to set up, great search, simple. Python. | No real component model, so animations are limited to embedded JS/iframes. Moving into maintenance mode. |
| **VitePress** | Simple, fast, Vue components in Markdown | Smaller docs feature set. RTL needs work. |
| **Hugo** | Extremely fast builds, single binary | Go templates are awkward. Interactive components are hard. |
| **Next.js (Nextra / Fumadocs)** | Most powerful path to a fully dynamic app | More moving parts. Overkill for the static phase. |

Not git-based, so ruled out by constraint 1: GitBook, Notion + Super, Obsidian Publish ($8–10/month), Wiki.js / BookStack (need a server and a database).

### 3.2 Hosting

| Option | Free tier | Limits that matter | Paid |
|---|---|---|---|
| **Cloudflare Pages** | Free, unlimited bandwidth and requests for static files | 500 builds/month, 20,000 files per deploy, 25 MB per file | Workers Paid $5/month only if the backend outgrows the free tier |
| **GitHub Pages** | Free for public repos | Private repo needs GitHub Pro ($4/month). 1 GB site, soft 100 GB/month bandwidth. No branch previews. | — |
| **Netlify** | Free | 300 build minutes/month, about 100 GB bandwidth | $19/month |
| **Vercel Hobby** | Free | **Non-commercial use only**, so it is out if the site ever has ads or paid content | $20/month |

### 3.3 Supporting pieces

| Need | Option | Cost |
|---|---|---|
| Search (R7) | **Pagefind**: static index built at build time, no server, works for Hebrew (whitespace-separated words) | Free |
| Math (R2) | **KaTeX** via remark-math / rehype-katex | Free |
| Diagrams (R9) | **Mermaid** (rendered at build time) | Free |
| Animations (R12) | Motion, GSAP (free), Mafs / JSXGraph (math), p5.js, Three.js, embedded GeoGebra, or Manim (pre-rendered videos) | Free |
| Backend (R14) | **Cloudflare Workers + D1** (SQLite), or Supabase | Free tiers cover a personal site |
| Analytics (R23) | Cloudflare Web Analytics | Free |
| Domain (R22) | `.com` at Cloudflare Registrar (at cost) | about $10–11/year |
| | `.co.il` (any ISOC-accredited registrar) | about ₪50–90/year |
| Large binaries | Git LFS, if PDFs/videos grow past a few hundred MB | GitHub includes a free quota |

### 3.4 Coverage matrix

✅ built in · 🔧 possible with config or a small amount of code · ❌ not realistic

| Req | Starlight | Docusaurus | MkDocs Material | VitePress | Hugo | Next.js |
|---|---|---|---|---|---|---|
| R1 RTL | ✅ | 🔧 | ✅ | 🔧 | 🔧 | 🔧 |
| R2 Math | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 |
| R5 Nav from hierarchy | ✅ / 🔧 | ✅ | ✅ | 🔧 | 🔧 | 🔧 |
| R7 Search | ✅ | 🔧 | ✅ | ✅ | 🔧 | 🔧 |
| R12 Interactive components | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| R14 Backend features | 🔧 | 🔧 | ❌ | 🔧 | ❌ | ✅ |
| R16 Structure validation | ✅ | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 |
| Simplicity | high | medium | very high | high | medium | low |

---

## 4. Decision (2026-10-18): two repos + GitHub Pages

| Repo | Visibility | Holds |
|---|---|---|
| `Barakkol33/blearning` | public | published `content/`, `site/`, docs. Built by GitHub Actions and served at https://barakkol33.github.io/blearning/ |
| `Barakkol33/blearning-private` | private | `content/` that is not public yet, `sources/` |

- **Publishing = moving files** from the private `content/` to the public one (see STRUCTURE.md §1). Nothing is duplicated, and nothing from `sources/` or the private history reaches the public repo.
- Every push to `main` in the public repo runs `.github/workflows/deploy.yml` (withastro/action), which builds `site/` and deploys to GitHub Pages.
- `npm run dev:all` previews public + private content together. The site reads extra content roots from `BLEARNING_EXTRA_CONTENT`.
- The [openu](https://github.com/Barakkol33/openu) repo is published as the `openu/` area. `site/scripts/openu.mjs` converts each course README into a guide whose chapters sit directly under the course, in the gitignored `site/.generated/`. openu stays the source of truth: the generated files are never edited or committed.
  - `npm run build` generates it first (from `OPENU_DIR`, default `../../openu`; skipped with a warning if missing). `npm run dev:openu` previews it, regenerated live on every change in openu.
  - The deploy workflow checks out openu next to the site, and also runs daily so pushes to openu reach the site within a day (or run the workflow by hand).
- Stack: Astro 7 + Starlight 0.42 on Node 24 LTS. KaTeX for math, Pagefind for search. Animations are custom elements (`site/src/animations/`) used as `<bl-*>` tags in Markdown.
- `site/src/structure.mjs` enforces STRUCTURE.md at build time (R16): ids without numeric prefixes, the sidebar from `kind` and ordering, and the unit rules.
- `site/src/routeData.ts` (Starlight route middleware) scopes the sidebar: the home page lists every area; a page inside an area shows only that area, expanded.
- Cloudflare Pages remains the fallback if branch previews are needed.

## 5. Recommended stack (original analysis)

| Layer | Choice |
|---|---|
| Source of truth | GitHub repo (`blearning`, private is fine) |
| Framework | **Astro + Starlight**, content read from `content/` |
| Validation | Zod schema per `kind`, plus a check script for the unit rules |
| Math / diagrams | KaTeX, Mermaid |
| Search | Pagefind (built into Starlight) |
| Hosting | **Cloudflare Pages**, connected to the GitHub repo |
| Domain | Optional, through Cloudflare |
| Future dynamic layer | MDX + React/Svelte islands for animations. Cloudflare Workers + D1 if accounts or progress tracking are ever needed. |

Why: it is the only option that covers every M requirement and also has a direct path to R12–R14 **without changing framework or host**. It also costs nothing beyond the domain.

### How it is operated (all through Claude Code)

```
"add the content of X"   →  Claude edits content/ according to STRUCTURE.md
npm run dev              →  local preview at http://localhost:4321
npm run check            →  structure validation and build
git push (branch)        →  Cloudflare preview URL
merge to main            →  production deploy
```

One-time manual setup: connect the repo in the Cloudflare dashboard, and optionally buy a domain. Nothing after that needs a dashboard.

### Cost estimate

| Item | Monthly | Yearly |
|---|---|---|
| Hosting (Cloudflare Pages) | ₪0 | ₪0 |
| GitHub (private repo) | ₪0 | ₪0 |
| Search, math, analytics | ₪0 | ₪0 |
| Domain (optional) | — | about ₪40 (`.com`) / ₪50–90 (`.co.il`) |
| Backend later (Workers + D1) | ₪0 (free tier), at most $5 | ₪0–220 |
| **Total** | **₪0** | **₪0–90 now** |

Claude Code itself is not counted. It is the existing subscription.

---

## 6. Risks and open questions

- **Content rights.** Some sources were written by others (teachers, classmates, "שיתוף חומרים"). Publish only material that is my own or that I have permission for, and add credits.
- **Curriculum freshness.** Bagrut syllabi change, so each unit should record which year it matches.
- **Repo size.** PDFs in `sources/` are fine at the current ~11 MB. Move to Git LFS if they grow large.
- **Public or private.** Decide whether the site is public (indexed by Google) or private behind Cloudflare Access (free for up to 50 users).

---

## 7. Roadmap

1. [x] Set up Astro + Starlight reading `content/`, with RTL, KaTeX and Pagefind
2. [x] Sidebar generated from `kind` and numeric prefixes. Zod schemas and a unit check script.
3. [ ] Convert the first unit end to end (physics), to validate STRUCTURE.md
4. [x] Deploy to GitHub Pages (public repo `blearning`, GitHub Actions)
5. [ ] Tags, related pages, unit badges, Mermaid
6. [x] First interactive components (27 animations, `site/src/animations/`)
7. [ ] Domain, analytics
8. [ ] Backend features, if needed
