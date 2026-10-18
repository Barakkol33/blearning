# blearning (public)

- This is the public repo `Barakkol33/blearning`. Its private twin is `Barakkol33/blearning-private` at `C:\projects\blearning`.
- Content placement and layout follow [STRUCTURE.md](STRUCTURE.md). "Add the content of X" → §9 workflow, in the **private** repo. "Move X to public" → STRUCTURE.md §1: move the files (no copies), commit both repos.
- Before moving anything to public, check rights: only material written by Barak (or with permission). No course booklets, assignment/exam questions, teachers' handouts or long quotes. `sources/` is never public.
- The site is in `site/`: `npm run dev` (public only), `npm run dev:all` (with private content), `npm run check` (build + structure validation). Pushing `main` deploys to GitHub Pages.
- Technical decisions are in [SPEC.md](SPEC.md). Keep it updated.
