---
title: From Code to the Real World - presenter guide
tags: [devops, kubernetes, architecture, talk]
---

# From Code to the Real World - presenter guide

A talk for high school students: DevOps, Kubernetes and architecture, in a world where AI writes the code. Based on the blearning [DevOps guide](https://barakkol33.github.io/blearning/tech/software-development/devops/).

- **The deck:** [devops-slides.md](devops-slides.md). On the site it's the page [From Code to the Real World](https://barakkol33.github.io/blearning/tech/software-development/devops/talk/) (source: `content/tech/software-development/devops/talk.md`), which shows the rendered deck and links the demo files.
- **The notes are for students:** every slide has a full explanation for a student going through the deck alone (press `?` in the deck). They double as your script for what each slide means. The presenter cues - timing, what to ask, what to run - are in this guide, under "Presenting, slide by slide".
- **The demo:** [demo/](demo/), explained below.

## The parts

The talk (slides 1-28) is the intro level: the big picture, built around a live demo where every DevOps idea is practiced on a real cluster. It's about 38 minutes, leaving ~7 for questions in a 45-minute slot. Slides 29-52 are a **self-study** appendix at basic level, for students to go over at home. Every slide has full notes, so the HTML file works as a handout.

| | part | min | slides |
| --- | --- | --- | --- |
| 0 | Raise your hand: who knows / who has done | 2 | 2 |
| 1 | The real job | 5 | 4-6 |
| 2 | DevOps: the five ideas, guardrails, the base | 6 | 7-9 |
| 3 | Architecture | 3 | 10 |
| 4 | Containers and Kubernetes | 3 | 11 |
| 5 | Live demo: IaC, automation, HA, CI/CD (x2), observability, recap | 12 | 12-20 |
| 6 | Know what is in the code | 3 | 21-25 |
| 7 | Build with AI: go build something, the blearning example | 2 | 26-27 |
| 8 | Wrap-up: the important ideas | 2 | 28 |
| | **Talk** | **38** | |
| | Self-study: the DevOps loop, copies, Kafka, containers, Kubernetes words, six traps, AI and infrastructure (Terraform, spot the bug, the July 2025 story, why it's harder), try at home, blearning links | at home | 29-52 |

The first slide of each part has "Part N · name" as its header, with its own title as the subheader.

**Guardrails** (slide 8) are deliberately visited twice: they come back in the demo recap (slide 20). The base (slide 9) is summed up again as point 4 of the wrap-up.

- The opening questions tell you what the room knows; "Presenting, slide by slide" below says how to adapt.
- **Running late:** part 6 (slides 21-25) can be a single sentence - "AI writes the code; you have to know what is in it" - with the iceberg on screen, then skip to slide 26. The rest stays for students to read.
- **Running early:** open the Kafka part (slide 32) after questions.

## Keys

| key | |
| --- | --- |
| `→` `Space` / `←` | next / previous slide |
| `?` | notes on/off (`Esc` closes) |
| `F` | full screen |
| dots, bottom right | jump to any slide |

## Presenting, slide by slide

What each slide *means* is in its notes. This is what to *do*.

| slide | cue |
| --- | --- |
| 1 | Before: `./demo.sh pods` (wakes WSL; or `./demo.sh up` if the cluster is gone), browser on `http://localhost:8080`, two terminals in `demo/`, `F` for full screen. Introduce yourself in one line. |
| 2 | ~2 min. Row by row, two questions each: "who knows what a container is, even roughly?" then "who has run one?". Count roughly: none / a few / half / most. "No hands is a perfectly good answer." Remember who built something with AI. |
| 2 → adapt | **Few have written code:** keep part 6 to one sentence, more time on the demo. **Most built with AI:** lean into part 6, refer back on slide 26. **Many know Docker/K8s:** move fast through part 4; Kafka (slide 32) after questions. **Someone put something online:** use their project on slide 10 ("what if 10,000 people open it?"). |
| 3 | Don't read the table: "from the problem, to how real systems are built, to a live demo, to what it means for you." |
| 4 | Ask one or two who built something with AI: "what did you build? did it work the first time?" Leave "is it done?" hanging. |
| 5 | Pick one row and make it vivid: "3 AM, the app is down, millions can't pay - who wakes up?" |
| 6 | Tell one or two stories, not all four. Amazon's report is short enough to open live if asked. |
| 7 | Say: "you'll see every one of these five live in the demo." |
| 8 | Briefly - "we'll come back to these after the demo." |
| 9 | Slow down - the most important idea. |
| 10 | Walk the diagram left to right. |
| 11 | Keep it to one slide - the demo explains Kubernetes better. |
| 12 | Switch to the terminals: left `./demo.sh watch`, right the commands, browser visible. Anything strange: `./demo.sh reset`. |
| 13 | The demo's agenda - one line per row. |
| 14 | Run `iac 6`. Point at the PLAN (3 → 6) before the apply: "look before you change - that's a guardrail." |
| 15 | Run `kill`, ask "who restarted it?" - nobody. Then `chaos`; point at the `watch`: no red. |
| 16 | Run `node-down`; point at the few red `DOWN` lines, then green again. Ctrl+C, then `node-up`. |
| 17 | Run `update`. Point at the stage banners and at blue and green mixing in the `watch`. |
| 18 | Run `break`. Point at the typo, the failed VERIFY, the automatic ROLLBACK - and the `watch` that never went red. |
| 19 | Run `events` (the kill, the image that doesn't exist, the scale-down), then `logs`. |
| 20 | Tick the five rows, then the three guardrails - "slide 8, remember?" |
| 21 | Say the quote slowly. Running late: this one sentence is the whole part - skip to slide 26. |
| 23 | One sentence per row; the last column links each question to bugs, lag or cost on the next slide. |
| 26 | Say the quote plainly, as your own opinion. Refer back to who raised their hands on slide 2. |
| 27 | If time: open blearning live - a physics animation, then a dad joke. |
| 28 | The five ideas - one breath each. Point 4 is the base from slide 9: "remember?" End with "Anyone can write code now - knowing what is in it, and running it safely for millions, is engineering." Then questions. "Everything we skipped is at the end of the file - press ? on any slide." If time is left: Kafka (slide 32). After: `./demo.sh down`, or leave the cluster for next time. |

## The live demo

### Files

| file | what it is |
| --- | --- |
| [demo/kind-cluster.yaml](demo/kind-cluster.yaml) | the cluster: 1 control plane + 2 workers; laptop port 8080 → the app; tuned to notice a dead machine in ~10s |
| [demo/app.yaml](demo/app.yaml) | the app: a ConfigMap (the page), a Deployment (3 copies of nginx, spread over both workers), a Service |
| [demo/demo.sh](demo/demo.sh) | one command per scene; each prints which DevOps idea it shows |

The app needs no image build: it's the standard `nginx:1.27-alpine` image, with a page that nginx fills in from environment variables (version, color, pod name, machine name). Changing those variables is a new version.

### Before the talk (with internet)

From WSL, in the `demo/` folder:

```bash
./demo.sh up      # creates the cluster, loads the nginx image into it, deploys
```

`up` copies the image into the cluster (`kind load`), so the demo doesn't depend on the room's wifi once the cluster exists. If `kind-cluster.yaml` changed since the cluster was created, recreate it: `./demo.sh down && ./demo.sh up`.

WSL shuts down when idle, and the cluster sleeps with it. A few minutes before you go on, run `./demo.sh pods` once: it wakes WSL, and Kubernetes restarts the pods by itself within seconds.

### During the talk

Two terminals side by side, plus a browser at `http://localhost:8080`. Left: `./demo.sh watch`, running the whole time. Right, in order:

| scene | DevOps idea | command |
| --- | --- | --- |
| Demo 1 | Infrastructure as Code | `./demo.sh iac 6` |
| Demo 2 | Automation (self-healing) | `./demo.sh kill`, then `./demo.sh chaos` |
| Demo 3 | High availability | `./demo.sh node-down` (Ctrl+C once the copies moved), then `./demo.sh node-up` |
| Demo 4 | CI/CD | `./demo.sh update` |
| Demo 5 | CI/CD catches a mistake | `./demo.sh break` |
| Demo 6 | Observability | `./demo.sh events`, then `./demo.sh logs` |
| after | | `./demo.sh reset`: back to v1 with 3 copies |

Run `iac` before `update`: applying `app.yaml` resets the version to the file's v1, so doing it after `update` would undo v2. `./demo.sh` with no arguments prints every command. `./demo.sh ship v4 '#8250df'` ships any version and color through the same pipeline.

### What was tested

On WSL 2 (Ubuntu), Docker 27, kind 0.26 (Kubernetes 1.32), with `watch` sending ~3 requests a second:

- `iac 6`, `kill`, `chaos`, `update` and `break`: **0 failed requests out of 223**. `break` failed VERIFY after 40s and rolled back by itself, without users noticing.
- `node-down`: **6 failed requests over ~7 seconds**, then the copy moved to the other worker (it was ~50s before the cluster was tuned).
- `events` showed the kill, the failed image pull and the scale-down of the broken version.

### Troubleshooting

- `$'\r': command not found`: Windows changed the script's line endings. Run `sed -i 's/\r$//' demo.sh`.
- Something is in a strange state: `./demo.sh reset`. Still broken: `./demo.sh down && ./demo.sh up`.
- After `node-down`, always run `node-up` - otherwise the next scenes run on one worker.

## Building and publishing the deck

```bash
pip install pypresent
python build.py
```

`build.py` checks the deck (too many bullets, too-long lines), renders it into one HTML file at `content/tech/software-development/devops/_files/devops-talk.html`, and copies the three demo files next to it (`_files/devops-talk-demo/`, with Unix line endings) so the talk page can link to them. Commit the generated files together with the source - the site serves them as they are.

For a quick local look, `pypresent render devops-slides.md` writes the same HTML file, and `cd site && npm run dev` shows the page at `/blearning/tech/software-development/devops/talk/`.

The diagrams are SVG files in [img/](img/), embedded into the HTML when it's rendered, so the output stays one file. Edit an SVG, build again.

Speaker notes are written in the slide file as comments, and never appear on the slide:

```markdown
<!-- notes:
What to say, in paragraphs and - bullets.
-->
```
