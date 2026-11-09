---
title: From Code to the Real World - a talk
order: 0
lang: en
attachments: [_files/devops-talk.html, _files/devops-talk-demo/kind-cluster.yaml, _files/devops-talk-demo/app.yaml, _files/devops-talk-demo/demo.sh]
---

# From Code to the Real World - a talk

A talk for high school students: DevOps, Kubernetes and architecture - in a world where AI writes the code. It shows why running software for millions of people is the real job, practices every DevOps idea live on a Kubernetes cluster, and ends with what to know and do when AI writes the code.

<div style="position:relative; width:100%; aspect-ratio:16/9; margin:1rem 0; border:1px solid var(--sl-color-gray-5); border-radius:6px; overflow:hidden">
<iframe src="/blearning/tech/software-development/devops/_files/devops-talk.html" title="From Code to the Real World - slides" loading="lazy" allowfullscreen style="position:absolute; inset:0; width:100%; height:100%; border:0"></iframe>
</div>

[Open the slides in a full window](_files/devops-talk.html) - better for reading and for presenting.

**How to use the slides:** click the slides first, then use the arrow keys to move. Press **?** (or the **?** button at the top right) to open the notes - every slide has a full explanation, written for reading on your own. `F` is full screen.

## What's inside

**The talk** (slides 1-28, about 40 minutes):

1. **The real job** - AI writes code in seconds; running it for millions of people is the hard part.
2. **DevOps** - automation, CI/CD, infrastructure as code, observability, high availability; guardrails; and the base that doesn't change.
3. **Architecture** - what's behind an app you use every day.
4. **Containers and Kubernetes** - you say *what*, it figures out *how*.
5. **Live demo** - every DevOps idea, practiced on a real cluster.
6. **Know what is in the code** - six questions to ask about any code, whoever wrote it.
7. **Build with AI** - go build something.
8. **Wrap-up** - the important ideas.

**Self-study** (slides 29-52): the DevOps loop, Kafka, containers and the Kubernetes words, six traps hidden in code that "works", AI and infrastructure as code, and how to run the demo at home.

## The live demo

The demo is a real Kubernetes cluster that runs on one laptop, with [kind](https://kind.sigs.k8s.io/) (Kubernetes in Docker). Three files:

| file | what it is |
| --- | --- |
| [kind-cluster.yaml](_files/devops-talk-demo/kind-cluster.yaml) | the cluster: one control plane and two workers |
| [app.yaml](_files/devops-talk-demo/app.yaml) | the app: three copies of a small web page, spread over both workers |
| [demo.sh](_files/devops-talk-demo/demo.sh) | one command per scene - each one prints which DevOps idea it shows |

**To run it:**

1. Install WSL (on Windows), Docker, `kind` and `kubectl` - see [Prerequisites](prerequisites.md).
2. Put the three files in one folder, and in a Linux shell (WSL) run `chmod +x demo.sh` and `./demo.sh up`. It builds the whole cluster in a minute or two.
3. In a second terminal, run `./demo.sh watch`, and open `http://localhost:8080` in a browser.
4. Run the scenes, in this order:

| DevOps idea | command |
| --- | --- |
| Infrastructure as Code | `./demo.sh iac 6` |
| Automation (self-healing) | `./demo.sh kill`, then `./demo.sh chaos` |
| High availability | `./demo.sh node-down`, then `./demo.sh node-up` |
| CI/CD | `./demo.sh update` |
| CI/CD catches a mistake | `./demo.sh break` |
| Observability | `./demo.sh events`, then `./demo.sh logs` |

`./demo.sh` with no arguments lists every command; `./demo.sh reset` goes back to the start; `./demo.sh down` deletes the cluster.

## Next steps

The talk is the big picture. This guide goes deeper, step by step:

- [What is DevOps](01-get-started/intro.md) - the core ideas
- [Kubernetes](02-containers/kubernetes.md) - build a cluster on your laptop and learn every object
- [Kafka](03-data-sources/kafka.md) - producers, consumers, lag
- [The final exercise](06-exercise/exercise.md) - deploy a real app to Kubernetes

The talk's source - the slides, the diagrams, the demo and a presenter guide - is in [examples/devops-talk](https://github.com/Barakkol33/blearning/tree/main/examples/devops-talk) on GitHub, or as a [zip](https://github.com/Barakkol33/blearning/releases/download/devops-talk-latest/devops-talk.zip).
