---
title: From Code to the Real World - presenter guide
tags: [devops, git, docker, ci-cd, kubernetes, talk]
---

# From Code to the Real World - presenter guide

A talk for high school students: Git, Docker, CI/CD and Kubernetes - in a world where AI writes the code. Based on the blearning [DevOps guide](https://barakkol33.github.io/blearning/tech/software-development/devops/).

- **The deck:** [devops-slides.md](devops-slides.md). On the site it's the page [From Code to the Real World](https://barakkol33.github.io/blearning/tech/software-development/devops/talk/) (source: `content/tech/software-development/devops/talk.md`), which shows the rendered deck and links the demo files.
- **The notes are for students:** every slide has a full explanation for a student going through the deck alone (press `?` in the deck). They double as your script for what each slide means. The presenter cues - timing, what to ask, what to run - are in this guide, under "Presenting, slide by slide".
- **The demo:** [demo/](demo/), explained below.

## The map

The talk (slides 1-16, ~30 minutes) follows one small project - **2048 in Python** ([github.com/Barakkol33/devops-example](https://github.com/Barakkol33/devops-example)), built with AI - from a laptop to 100,000 players: save it (Git), pack it (Docker), check and ship it (CI/CD), run many copies (Kubernetes). Then: build with AI - but know what it does. Everything runs locally, and the commands are the visuals: every live moment has a slide with the command and its **real output**, so the talk works with no demo at all. Each idea is named **after** the students see it work.

| | part | min | slides | live (right terminal: `./present.sh`) |
| --- | --- | --- | --- | --- |
| 0 | Raise your hand | 2 | 2 | |
| 1 | You built a game | 2 | 3 | |
| 2 | Save it: **Git** | 4 | 4-5 | scene 1: `./demo.sh git` |
| 3 | Package it: **Docker** | 4 | 6-7 | scene 2: `./demo.sh docker` |
| 4 | Check it, ship it: **CI/CD** (the pipeline's four steps) | 2 | 8 | |
| 5 | Many copies: **Kubernetes** (load balancer, the Deployment file, IaC, HA, self-healing) | 6 | 9-11 | scene 3: `./demo.sh pods`, `kill` |
| | The road you just saw | 1 | 12 | |
| 6 | Build with AI - but know what it does (the iceberg) | 4 | 13-14 | |
| 7 | Wrap-up: the base of everything, the important ideas | 3 | 15-16 | |
| | More interesting topics - the map of what comes after the talk | | 17 | |
| | **Talk** | **~29** | | |

After the wrap-up, slide 17 maps the rest of the deck, which goes on **by subject**, in the road's order - for time left over, questions, or students at home:

| subject | slides | live (`./present.sh extras`) |
| --- | --- | --- |
| CI/CD: ship the new level, the bug + automatic rollback, when a change goes wrong (outages), the DevOps loop, guardrails | 18-22 | `update`, `break` |
| Kubernetes: the demo cluster, scale with a file (IaC), all the copies at once, a machine dies (HA), observability, the loop, the words, why so many copies, architecture | 23-31 | `iac 6`, `chaos`, `node-down`/`up`, `events`, `logs` |
| Kafka | 32-38 | |
| Infrastructure as code: Terraform, spot the bug, the July 2025 story, why it's harder | 39-42 | |
| Know what the code does: your laptop vs the real world, six questions, bugs/lag/cost, six traps | 43-52 | |
| Try it at home, learn more | 53-54 | |

- **No demo** (no laptop, no WSL, a broken cluster): just present the slides. Slides 5, 7 and 11 show the real output, and their notes explain it line by line.
- **Running late:** skip the live scenes - the output slides tell the same story. Then slide 14 (the iceberg) can be one sentence.
- **Running early, or a question about it:** the pipeline for real - slides 18-19 with `./present.sh extras` (the new level, then the bug that passes every test and is rolled back).

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
| 1 | Before: see "On the day" below - `./demo.sh reset`, the dashboard, the browser on `http://localhost:8080`. Introduce yourself in one line. |
| 2 | ~2 min. Row by row, two questions each: "who knows what it is, even roughly?" then "who has done it?". "No hands is a perfectly good answer." Remember who built something with AI. |
| 3 | "You built a game with AI in an evening." Show it: the browser at `http://localhost:8080` - play a few moves. "Tonight a streamer shares it: 100,000 players. Now what?" |
| 4 | Commit, history, together - one sentence each. |
| 5 | Right terminal: `./present.sh` (scene 1). Point at the red and green lines in `git diff`, then the two commits. No demo: walk the slide top to bottom. |
| 6 | The Dockerfile is code they can read: one line each. |
| 7 | Scene 2: the build, the images, then open `http://localhost:8081` - the game in a container on this laptop. |
| 8 | Read the five steps. "It needs somewhere to ship to - that's the next step." |
| 9 | Walk the diagram left to right. Then the two names: the wish is a file - Infrastructure as Code; two machines - high availability. |
| 10 | The wish, as a file. Point at three lines: `replicas: 3`, `image:`, and the readiness check on `/healthz` - "remember this one". |
| 11 | Scene 3: `pods`, then `kill`. Point at the dashboard (left): the copy disappears and a new one is ready in seconds, no red. Ask "who restarted it?" - nobody. |
| 12 | Tick the four rows. "That road is DevOps." |
| 13 | Say the quote plainly, as your own opinion. Refer back to who raised their hands on slide 2. The blearning bullet: if time, open it live. Leave "is it done?" hanging. |
| 14 | The central message - slow down. Running late: this one sentence is the whole slide. |
| 15 | Slow down - the tools change, these three don't. And English. |
| 16 | The five ideas - one breath each. End with "Anyone can write code now - knowing what it does, and running it safely for many people, is engineering." Then questions. "Everything we skipped is in the slides after this one - press ? on any slide." If time is left: slides 18-19 with `./present.sh extras`. After: `./demo.sh reset`. |
| 17 | Leave it on screen during questions - it's the map of everything you skipped. |

## The live demo

### Files

| file | what it is |
| --- | --- |
| [demo/kind-cluster.yaml](demo/kind-cluster.yaml) | the cluster: 1 control plane + 2 workers; laptop port 8080 → the game; tuned to notice a dead machine in ~10s |
| [demo/demo.sh](demo/demo.sh) | one command per scene. Always uses the `kind-devops-demo` cluster, whatever kubectl's current context is |
| [demo/present.sh](demo/present.sh) | the show, for the right terminal: a headline per scene, every command typed out, Enter to go on |
| [demo/rehearse.sh](demo/rehearse.sh) | runs every scene start to end, checks each one, prints PASS/FAIL, and ends with `reset` |

**The game is a real project:** [github.com/Barakkol33/devops-example](https://github.com/Barakkol33/devops-example) - 2048 in Python (FastAPI), with its tests, a Dockerfile, its Kubernetes files and a pipeline. `./demo.sh up` clones it once into `~/.devops-talk/devops-example` (the only step that needs internet - with the Python base image and the libraries), builds its first image and deploys its own `k8s/` files. Every scene works on a fresh local clone at `/tmp/game-site`, on a branch `talk` that starts at the project's tag `v1` - the GitHub repo and the blearning repo are never touched.

`./demo.sh git` makes the v2 change (`SIZE = 4` → `5`, a bigger board) and commits it. `./demo.sh docker` builds that commit into `game-site:v2` and runs it on port 8081. `./demo.sh update` is a real pipeline from the clone: build → test (pytest in the image's test stage, then `tests/smoke.sh`) → upload the image to the cluster (`kind load`) → rolling update → verify → rollback. `./demo.sh break` commits v3 - an AI "tidy-up" that renames `/healthz` to `/health` and updates the test to match: every test passes, but the copies never become ready, so VERIFY fails and it rolls back. `./demo.sh iac 6` changes the project's own `k8s/deployment.yaml`.

On GitHub, the same project runs the same pipeline in GitHub Actions on every push and pull request - and the bug is a pull request with a red X: [PR #1](https://github.com/Barakkol33/devops-example/pull/1).

### Once: set up WSL

Two kind clusters on one machine (this demo and the DevOps guide's lab, say) run out of Linux's file-watch limit, and then a machine that was stopped - by `node-down`, or by WSL going to sleep - can't come back ("too many open files"). Raise the limit once; it survives restarts:

```bash
echo fs.inotify.max_user_instances=512 | sudo tee /etc/sysctl.d/99-kind.conf && sudo sysctl --system
```

### The day before (with internet): rehearse

Open PowerShell or Windows Terminal, enter Linux and go to the demo folder:

```powershell
wsl
```

```bash
cd /mnt/c/<path to blearning>/examples/devops-talk/demo
./rehearse.sh
```

`rehearse.sh` takes ~5 minutes. It checks the tools and the limit above, builds the cluster if it doesn't exist (`./demo.sh up`, which builds the game's first image and copies it into the cluster, so the talk doesn't depend on the room's wifi), runs the talk's scenes, then the extras, with a watch in the background, checks each one, and ends with `./demo.sh reset`. It must end with **ALL PASSED**. The full output is in `/tmp/devops-demo-rehearse.log`.

If `kind-cluster.yaml` changed since the cluster was created, recreate it first: `./demo.sh down && ./demo.sh up`.

### On the day, 10 minutes before

1. Open **two** terminals (Windows Terminal: split with `Alt+Shift+D`). In each one: `wsl`, then `cd` to the demo folder.
2. Right terminal: `export PS1="$ "; ./demo.sh reset`. **Yes, always reset first** - it puts the cluster back to v1 with 3 copies, spread over both workers. WSL shuts down when idle and the cluster sleeps with it; `reset` wakes it too. If a machine is missing, run `./demo.sh node-up` first.
3. Left terminal: `./demo.sh watch` - leave it running. The dashboard should say **UP - v1**, with 3 ready copies over both machines.
4. Browser: `http://localhost:8080` - the game, blue (v1).
5. Right terminal: `./present.sh` when you reach slide 5. It stops at every step; Enter goes on.
6. Slides: `F` for full screen.

### During the talk

Two terminals side by side, plus a browser. Left: `./demo.sh watch` - the live dashboard (the game, the copies, the machines), running the whole time. Right: `./present.sh` - it clears the screen per scene, shows the headline, types each command and waits for Enter. `./present.sh 3` starts at scene 3. Or run the commands by hand:

| scene | slide | command |
| --- | --- | --- |
| 1 · Save it | 5 | `./demo.sh git` |
| 2 · It works on my machine | 7 | `./demo.sh docker`, then `http://localhost:8081` |
| 3 · Many copies | 11 | `./demo.sh pods`, `./demo.sh kill` |
| extra · Ship the new level | 18 | `./demo.sh update` |
| extra · The next commit has a bug | 19 | `./demo.sh break` |
| extra · Scale with a file | 24 | `./demo.sh iac 6` |
| extra · All the copies at once | 25 | `./demo.sh chaos` |
| extra · A whole machine dies | 26 | `./demo.sh node-down` (Ctrl+C once the copies moved), then `./demo.sh node-up` |
| extra · Observability | 27 | `./demo.sh events`, then `./demo.sh logs` |
| after | | `./demo.sh reset`: back to v1, 3 copies, a fresh repo - also after any scene that went wrong |

`./present.sh extras` runs all the extras in this order. `./demo.sh` with no arguments prints every command.

### What was tested

On WSL 2 (Ubuntu), Docker 27, kind 0.26 (Kubernetes 1.32), with requests going out ~3 times a second, by `rehearse.sh` (November 2026, the game: 2048 in Python, with a second kind cluster running) - all 13 checks passed:

- `git`, `docker`, `kill`, `update`, `iac 6` and `chaos`: **0 failed requests**. `update` ran 19 tests (pytest) and the smoke test, then a rolling update to v2.
- `break`: all 19 tests passed (the AI updated the test too), VERIFY failed after 30s, and it rolled back to v2 by itself. The watch saw **2 failed requests** this time (0 in earlier runs).
- `node-down`: **12 failed requests**, and the copies had left the dead worker after ~32s (other runs: 6-13 failed, 23-32s). Say "a few seconds of errors", not a number.
- `events` showed the failed readiness check (`/healthz` → 404) and the rollback; `logs` showed the requests.
- `./demo.sh up` the first time downloads the project, the Python base image and the libraries - a few minutes with internet. After that, everything is cached and works offline.

### Troubleshooting

- `$'\r': command not found`: Windows changed the scripts' line endings. Run `sed -i 's/\r$//' *.sh`.
- `docker: ... port is already allocated` on 8081: an old game container is still running - `docker rm -f game-local`.
- Something is in a strange state: `./demo.sh reset`. Still broken: `./demo.sh down && ./demo.sh up`.
- A machine stays `NotReady` after `node-up`, and `docker exec devops-demo-worker journalctl -u kubelet` says "too many open files": the file-watch limit (see "Once: set up WSL"). Raise it, then `docker restart devops-demo-worker devops-demo-worker2`.
- The commands seem to change a different cluster: they can't any more - `demo.sh` always uses `kind-devops-demo`. If you run `kubectl` by hand, add `--context kind-devops-demo`.
- After `node-down`, always run `node-up` - otherwise the next scenes run on one worker.

## Building and publishing the deck

```bash
pip install pypresent
python build.py
```

`build.py` checks the deck (too many bullets, too-long lines), renders it into one HTML file at `content/tech/software-development/devops/_files/devops-talk.html`, and copies the demo files next to it (`_files/devops-talk-demo/`, with Unix line endings) so the talk page can link to them. Commit the generated files together with the source - the site serves them as they are.

For a quick local look, `pypresent render devops-slides.md` writes the same HTML file, and `cd site && npm run dev` shows the page at `/blearning/tech/software-development/devops/talk/`.

The diagrams are SVG files in [img/](img/), embedded into the HTML when it's rendered, so the output stays one file. Edit an SVG, build again.

Speaker notes are written in the slide file as comments, and never appear on the slide:

```markdown
<!-- notes:
What to say, in paragraphs and - bullets.
-->
```
