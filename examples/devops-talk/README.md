---
title: From Code to the Real World - presenter guide
tags: [devops, kubernetes, architecture, talk]
---

# From Code to the Real World - presenter guide

A talk for high school students: DevOps, Kubernetes and architecture, in a world where AI writes the code. Based on the blearning [DevOps guide](https://barakkol33.github.io/blearning/tech/software-development/devops/).

- **The deck:** [devops-slides.md](devops-slides.md). On the site it's the page [From Code to the Real World](https://barakkol33.github.io/blearning/tech/software-development/devops/talk/) (source: `content/tech/software-development/devops/talk.md`), which shows the rendered deck and links the demo files.
- **The notes are for students:** every slide has a full explanation for a student going through the deck alone (press `?` in the deck). They double as your script for what each slide means. The presenter cues - timing, what to ask, what to run - are in this guide, under "Presenting, slide by slide".
- **The demo:** [demo/](demo/), explained below.

## The map

The talk (slides 1-25) is the intro level. It starts where the students are - they can write code, and some build with AI - and builds DevOps one step at a time: pack the code (containers), run many copies (architecture), let a machine manage them (Kubernetes), then a live demo told as one story, where every scene adds one DevOps idea. Each idea is named **after** the students see it work; the recap (slide 18) puts the definitions together. It's about 33 minutes, leaving ~10 for questions plus a small buffer in a 45-minute slot. Slides 26-50 are a **self-study** appendix at basic level, for students to go over at home. Every slide has full notes, so the HTML file works as a handout.

| | part | min | slides |
| --- | --- | --- | --- |
| 0 | Raise your hand: who knows / who has done | 2 | 2 |
| 1 | You wrote code. Now what? | 4 | 3-5 |
| 2 | From laptop to millions: what DevOps is, then step 1 containers, step 2 many copies, step 3 Kubernetes | 6 | 6-9 |
| 3 | Live demo - results day: IaC, automation, HA, CI/CD (x2), observability, then the recap with the names | 13 | 10-18 |
| 4 | Know what is in the code | 3 | 19-21 |
| 5 | Build with AI: go build something, the blearning example | 2 | 22-23 |
| 6 | Wrap-up: the base, the important ideas | 3 | 24-25 |
| | **Talk** | **33** | |
| | Self-study: the DevOps loop, guardrails, copies, Kafka, Kubernetes words, bugs/lag/cost, six traps, AI and infrastructure (Terraform, spot the bug, the July 2025 story, why it's harder), try at home, blearning links | at home | 26-50 |

The first slide of each part has "Part N · name" as its header, with its own title as the subheader. The three steps of part 2 have "Step N · ..." headers, and the demo scenes are titled by the problem ("3 AM: copies crash"), not by the idea - the idea's name is the last bullet.

- The opening questions tell you what the room knows; "Presenting, slide by slide" below says how to adapt.
- **Running late:** part 4 (slides 19-21) can be a single sentence - "AI writes the code; you have to know what is in it" - with the iceberg on screen, then skip to slide 22. The rest stays for students to read. Part 4 is the place to cut; keep the demo whole.
- **Running early:** open the guardrails (slide 28) or Kafka (slide 29) after questions.

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
| 2 | ~2 min. Row by row, two questions each: "who knows what it is, even roughly?" then "who has done it?". Count roughly: none / a few / half / most. "No hands is a perfectly good answer." Remember who built something with AI. |
| 2 → adapt | **Most built with AI:** lean into part 4, refer back on slide 22. **Many know Docker/K8s:** move fast through steps 1 and 3. **Someone put something online:** use their project on slide 8 ("what if 10,000 people open it?"). |
| 3 | Ask one or two who built something with AI: "what did you build? did it work the first time?" Leave "is it done?" hanging. |
| 4 | Pick one row and make it vivid: "3 AM, the app is down, millions can't pay - who wakes up?" |
| 5 | Tell one or two stories, not all four. End with: "the code was fine - the *change* went wrong." |
| 6 | Short - one minute. Dev + Ops in one sentence, then walk the road: "we'll take your code down this road, one step at a time. I won't define the words - you'll see them first." |
| 7 | "Your code works on your laptop - how do you get it to run on a server?" The Dockerfile is code they can read: one line each. |
| 8 | "Now 10,000 people open it." Walk the diagram left to right; end on "100 copies - who manages them?" |
| 9 | Keep it to one slide - the demo shows it better. |
| 10 | Switch to the terminals: left `./demo.sh watch`, right the commands, browser visible. Anything strange: `./demo.sh reset`. |
| 11 | Tell the story: "this cluster is the Bagrut results site; results come out tomorrow at 9:00." Read the problems, not the commands. |
| 12 | "100,000 students are coming - we need 6 copies." Run `iac 6`. Point at the PLAN (3 → 6) before the apply. Name it at the end: "that's called Infrastructure as Code." |
| 13 | "3 AM." Run `kill`, ask "who restarted it?" - nobody. Then `chaos`; point at the dashboard: copies stopping and starting, and no red in the traffic strip. "That's automation." |
| 14 | Run `node-down`; point at **machine down** and the few red X marks in the traffic strip; then the copies appear on the other machine. Ctrl+C, then `node-up`. "That's high availability." |
| 15 | "9:00, everyone is checking, a fix must ship." Run `update`. Point at the stage banners and at green copies replacing blue ones on the dashboard. "That's CI/CD." |
| 16 | Run `break`. Point at the typo, the failed VERIFY, the automatic ROLLBACK - and the traffic strip that never went red, while the broken copy is stuck in `ErrImagePull`. "Rollback is a guardrail." |
| 17 | "The morning after - what happened?" Run `events` (the kill, the image that doesn't exist, the scale-down), then `logs`. "That's observability." |
| 18 | Now the definitions - one breath per row, pointing at the scene number. Then the guardrails line. "Look back at the road on slide 6: that road is DevOps." |
| 19 | Say the quote slowly. Running late: this one sentence is the whole part - skip to slide 22. |
| 20 | One sentence per row; the last column is where it ends: bugs, lag or cost. |
| 22 | Say the quote plainly, as your own opinion. Refer back to who raised their hands on slide 2. |
| 23 | If time: open blearning live - a physics animation, then a dad joke. |
| 24 | Slow down - the most important idea. |
| 25 | The five ideas - one breath each. End with "Anyone can write code now - knowing what is in it, and running it safely for millions, is engineering." Then questions (~10 min). "Everything we skipped is at the end of the file - press ? on any slide." If time is left: guardrails (slide 28) or Kafka (slide 29). After: `./demo.sh down`, or leave the cluster for next time. |

## The live demo

### Files

| file | what it is |
| --- | --- |
| [demo/kind-cluster.yaml](demo/kind-cluster.yaml) | the cluster: 1 control plane + 2 workers; laptop port 8080 → the app; tuned to notice a dead machine in ~10s |
| [demo/app.yaml](demo/app.yaml) | the app: a ConfigMap (the page), a Deployment (3 copies of nginx, spread over both workers), a Service |
| [demo/demo.sh](demo/demo.sh) | one command per scene; each prints which DevOps idea it shows. Always uses the `kind-devops-demo` cluster, whatever kubectl's current context is |
| [demo/rehearse.sh](demo/rehearse.sh) | runs every scene start to end, checks each one, prints PASS/FAIL, and ends with `reset` |

The app needs no image build: it's the standard `nginx:1.27-alpine` image, with a page that nginx fills in from environment variables (version, color, pod name, machine name). Changing those variables is a new version.

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

`rehearse.sh` takes ~5 minutes. It checks the tools and the limit above, builds the cluster if it doesn't exist (`./demo.sh up`, which copies the nginx image into the cluster, so the talk doesn't depend on the room's wifi), runs every scene in the talk's order with a watch in the background, checks each one, and ends with `./demo.sh reset`. It must end with **ALL PASSED**. The full output is in `/tmp/devops-demo-rehearse.log`.

If `kind-cluster.yaml` changed since the cluster was created, recreate it first: `./demo.sh down && ./demo.sh up`.

### On the day, 10 minutes before

1. Open **two** terminals (Windows Terminal: split with `Alt+Shift+D`). In each one: `wsl`, then `cd` to the demo folder.
2. Right terminal: `export PS1="$ "; ./demo.sh reset`. **Yes, always reset first** - it puts the cluster back to v1 with 3 copies, spread over both workers. WSL shuts down when idle and the cluster sleeps with it; `reset` wakes it too. If a machine is missing, run `./demo.sh node-up` first.
3. Left terminal: `./demo.sh watch` - leave it running. The dashboard should say **UP - v1**, with 3 ready copies over both machines.
4. Browser: `http://localhost:8080` - the blue v1 page.
5. Slides: `F` for full screen.

### During the talk

Two terminals side by side, plus a browser at `http://localhost:8080`. Left: `./demo.sh watch` - the live dashboard (the site, the copies, the machines), running the whole time. `./demo.sh requests` is the old one-line-per-request view. Right, in order:

| scene | DevOps idea | command |
| --- | --- | --- |
| Demo 1 | Infrastructure as Code | `./demo.sh iac 6` |
| Demo 2 | Automation (self-healing) | `./demo.sh kill`, then `./demo.sh chaos` |
| Demo 3 | High availability | `./demo.sh node-down` (Ctrl+C once the copies moved), then `./demo.sh node-up` |
| Demo 4 | CI/CD | `./demo.sh update` |
| Demo 5 | CI/CD catches a mistake | `./demo.sh break` |
| Demo 6 | Observability | `./demo.sh events`, then `./demo.sh logs` |
| after | | `./demo.sh reset`: back to v1 with 3 copies - also after any scene that went wrong |

Run `iac` before `update`: applying `app.yaml` resets the version to the file's v1, so doing it after `update` would undo v2. `./demo.sh` with no arguments prints every command. `./demo.sh ship v4 '#8250df'` ships any version and color through the same pipeline.

### What was tested

On WSL 2 (Ubuntu), Docker 27, kind 0.26 (Kubernetes 1.32), with requests going out ~3 times a second, by `rehearse.sh` (November 2026, with a second kind cluster running):

- `iac 6`, `kill`, `chaos`, `update` and `break`: **0 failed requests**. `break` failed VERIFY after 40s and rolled back by itself, without users noticing.
- `node-down`: **9 failed requests over ~12 seconds** (other runs: 6-11), and the copies had left the dead worker after ~30s. Say "a few seconds of errors", not a number.
- `events` showed the kill, the failed image pull and the scale-down of the broken version; `logs` showed the requests.

### Troubleshooting

- `$'\r': command not found`: Windows changed the script's line endings. Run `sed -i 's/\r$//' demo.sh`.
- Something is in a strange state: `./demo.sh reset`. Still broken: `./demo.sh down && ./demo.sh up`.
- A machine stays `NotReady` after `node-up`, and `docker exec devops-demo-worker journalctl -u kubelet` says "too many open files": the file-watch limit (see "Once: set up WSL"). Raise it, then `docker restart devops-demo-worker devops-demo-worker2`.
- The commands seem to change a different cluster: they can't any more - `demo.sh` always uses `kind-devops-demo`. If you run `kubectl` by hand, add `--context kind-devops-demo`.
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
