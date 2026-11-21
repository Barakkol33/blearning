---
title: From Code to the Real World - a talk
order: 0
lang: en
attachments: [_files/devops-talk.html, _files/devops-talk-demo/kind-cluster.yaml, _files/devops-talk-demo/demo.sh, _files/devops-talk-demo/present.sh, _files/devops-talk-demo/rehearse.sh]
---

# From Code to the Real World - a talk

A talk for high school students: Git, Docker, CI/CD and Kubernetes - in a world where AI writes the code. It follows one small project - 4096 in Python, built with AI - from a laptop to 100,000 players, one step at a time - with real commands on one laptop, and the real output of every step on the slides.

<div style="position:relative; width:100%; aspect-ratio:16/9; margin:1rem 0; border:1px solid var(--sl-color-gray-5); border-radius:6px; overflow:hidden">
<iframe src="/blearning/tech/software-development/devops/_files/devops-talk.html" title="From Code to the Real World - slides" loading="lazy" allowfullscreen style="position:absolute; inset:0; width:100%; height:100%; border:0"></iframe>
</div>

[Open the slides in a full window](_files/devops-talk.html) - better for reading and for presenting.

**How to use the slides:** click the slides first, then use the arrow keys to move. Press **?** (or the **?** button at the top right) to open the notes - every slide has a full explanation, written for reading on your own. `F` is full screen.

## What's inside

**The talk** (slides 1-20, about 30 minutes):

1. **Why?** - a team project for school: working together on one version that works (Git), sending it to the teacher so it runs on her computer (Docker), and knowing every change works (CI/CD).
2. **You built a game** - 4096 in Python, built with AI; tonight, 100,000 players. Writing the code is half the job: **DevOps** is the tools to ship and manage applications. Then the whole road in one picture: laptop → Git → a CI/CD pipeline (with Docker) → Kubernetes.
3. **Save it: Git** - commits, history, a way back; branches - each one a version, merged into main when it's ready.
4. **Package it: Docker** - one image that runs the same anywhere.
5. **Check it, ship it: CI/CD** - does it work? then ship it: build, test, deploy - automatically, on every push.
6. **Many copies: Kubernetes** - a load balancer and three copies, the Deployment file; infrastructure as code, high availability, and a copy that heals itself.
7. **Build with AI** - go build something, but know what it does.
8. **Wrap-up** - the base that doesn't change, and the important ideas.

**After the talk** (slide 21 is the map; slides 22-58), by subject: the pipeline for real (a new level, and a bug that passes every test and is rolled back), outages, the DevOps loop and guardrails; more Kubernetes (scale with a file, kill every copy, unplug a machine, observability, architecture); Kafka; infrastructure as code; knowing what the code does (six questions, six traps); and how to run the demo at home.

## The live demo

Everything runs on one laptop: a local clone of the game's repository, Docker, and a real Kubernetes cluster with [kind](https://kind.sigs.k8s.io/) (Kubernetes in Docker). No cloud, and no internet after the first setup.

The game is a real project: **[github.com/Barakkol33/devops-example](https://github.com/Barakkol33/devops-example)** - 4096 in Python (FastAPI), with its tests, a Dockerfile, its Kubernetes files and a CI/CD pipeline. The demo clones it by itself; you can also run it on its own: `pip install -r requirements.txt`, then `python main.py` (see its README).

| file | what it is |
| --- | --- |
| [kind-cluster.yaml](_files/devops-talk-demo/kind-cluster.yaml) | the cluster: one control plane and two workers |
| [demo.sh](_files/devops-talk-demo/demo.sh) | one command per scene |
| [present.sh](_files/devops-talk-demo/present.sh) | the show: each scene's headline, every command typed out, Enter to go on |
| [rehearse.sh](_files/devops-talk-demo/rehearse.sh) | runs every scene start to end and checks each one - PASS or FAIL |

**To run it:**

1. Install WSL (on Windows), Docker, `kind` and `kubectl` - see [Prerequisites](prerequisites.md).
2. Put the files in one folder, and in a Linux shell (WSL) run `chmod +x *.sh` and `./demo.sh up`. It downloads the game, builds the cluster and the game's first image, in a few minutes.
3. In a second terminal, run `./demo.sh watch` (a live dashboard: is the game up, which version, how many copies on which machine), and open `http://localhost:8080` in a browser - the game.
4. Run the scenes, in this order - or `./present.sh`, which runs them for you:

| step | command |
| --- | --- |
| Git: save the new level | `./demo.sh git` |
| Docker: build it, run it | `./demo.sh docker` - the game at `http://localhost:8081` |
| Kubernetes: a copy dies | `./demo.sh pods`, then `./demo.sh kill` |
| CI/CD: ship the new level | `./demo.sh update` |
| CI/CD: a bug, rolled back | `./demo.sh break` |
| more: scale, kill all, unplug a machine, observability | `./demo.sh iac 6`, `chaos`, `node-down` / `node-up`, `events`, `logs` |

`./demo.sh` with no arguments lists every command; `./demo.sh reset` goes back to the start; `./demo.sh down` deletes the cluster.

**On GitHub:** the same pipeline runs in GitHub Actions on every push and pull request of [devops-example](https://github.com/Barakkol33/devops-example), in a real Kubernetes cluster that GitHub starts for each run - and the bug is a pull request with a red X ([PR #2](https://github.com/Barakkol33/devops-example/pull/2)).

## Next steps

The talk is the big picture. This guide goes deeper, step by step:

- [What is DevOps](01-get-started/intro.md) - the core ideas
- [Git](06-delivery/git.md) - commits, branches, pull requests
- [Docker](02-containers/docker.md) - images and containers
- [Kubernetes](02-containers/kubernetes.md) - build a cluster on your laptop and learn every object
- [Kafka](08-services/kafka.md) - producers, consumers, lag
- [The final exercise](12-exercise/instructions.md) - deploy a real app to Kubernetes

The talk's source - the slides, the diagrams, the demo and a presenter guide - is in [examples/devops-talk](https://github.com/Barakkol33/blearning/tree/main/examples/devops-talk) on GitHub, or as a [zip](https://github.com/Barakkol33/blearning/releases/download/devops-talk-latest/devops-talk.zip).
