---
title: What is DevOps
order: 1
lang: en
tags: [intro]
updated: 2026-11-15
---

# What is DevOps

DevOps is the set of practices that take software from a developer's editor to users, and keep it working there. It is not a tool and not only a job title: it is a way of working in which the people who write software and the people who run it share one goal, small changes that reach production often and safely. This page gives the ideas and the map. Every other page of the guide goes deeper into one part.

**Levels on this page:** [Intro](#intro)

## Intro

### Why it exists: from code to production

You wrote an application and it works on your laptop. Each next need leads to one part of the DevOps stack:

| The need | The answer | In the guide |
|---|---|---|
| It must run the same way on every machine | Package it in a **container** | [Docker](../02-containers/docker.md) |
| Many containers must run reliably, restart when they fail, and scale | An **orchestrator** | [Kubernetes](../02-containers/kubernetes.md) |
| The orchestrator needs machines and a network | A **cloud**, or your own hardware | [Cloud concepts](../03-cloud/concepts.md) |
| The machines and the network must be reproducible and reviewable | **Infrastructure as code** | [Terraform](../04-infrastructure-as-code/terraform.md) |
| Every change must reach users quickly and safely | Version control and a **CI/CD pipeline** | [Git](../06-delivery/git.md), [CI/CD](../06-delivery/ci-cd.md) |
| The application keeps data, and talks to other services | **Databases**, queues, caches | [Databases](../07-databases/_index.md), [Services](../08-services/_index.md) |
| You must know when it breaks, and why | **Observability** | [Observability](../09-observability/concepts.md) |
| It must not be broken into | **Security** in every step | [Security](../10-security/_index.md) |
| It must stay up, at a cost that makes sense | **Reliability** work | [SRE](../11-reliability/sre.md), [Cost](../11-reliability/finops.md) |

Each layer solves a problem that the one before it created. Together they are the stack that this guide walks through, and the [lab](../13-lab/_index.md) runs all of them together on a laptop.

### Terms

| Term | Meaning |
|---|---|
| Automation | A machine does the repeated work: builds, tests, deployments, backups, creating environments. The same way every time |
| Infrastructure as code (IaC) | Servers, networks and settings described in files that are reviewed and versioned like application code |
| CI/CD | Every change is built and tested automatically, and released by the same automatic path |
| Observability | Understanding what a running system does from its metrics, logs and traces |
| High availability (HA) | The system keeps serving when a part fails: several copies, and automatic failover between them |
| Shift left | Find problems earlier: tests, static checks and security scans run in the pipeline, before production |
| Shift right | Learn from production: gradual rollouts, feature flags, experiments on real traffic |
| Recovery | Being ready for failure: backups that were restored in a drill, runbooks, clear ownership in an incident |
| Toil | Manual, repeated work that grows with the system. The first thing to automate |
| SLI / SLO | A measured signal of health (99.2% of requests succeeded) / the target for it (99.9% over 30 days) |
| Error budget | The failure the SLO allows. While there is budget, release fast. When it is spent, work on stability |
| RPO / RTO | How much data you may lose in a disaster / how long recovery may take |
| Platform engineering | Building the internal tools that let developers deploy and operate their own services |
| SRE | Site reliability engineering: running production with software engineering methods. A close relative of DevOps |

### Why automation is the center

Automation is more than saving time:

- **You can start again from nothing.** When an environment is broken in a way nobody understands, you delete it and create it again, because everything that built it is in code.
- **Growing is repeating.** A second region or a tenth cluster is the same code with other parameters.
- **A change is reviewed before it happens.** A pull request shows exactly what will change, and Git remembers who changed what and why.

### How the industry measures it

The DORA research program has measured software delivery in thousands of organizations for over a decade. Its four key metrics are the common language for "how good is our delivery":

| Metric | The question | Kind |
|---|---|---|
| Deployment frequency | How often do we release to production? | Speed |
| Lead time for changes | How long from a commit to running in production? | Speed |
| Change failure rate | What share of releases cause a failure that needs a fix? | Stability |
| Time to restore service | How long does recovery from such a failure take? | Stability |

The main finding is that speed and stability go together. Teams that release small changes often also fail less and recover faster, because a small change is easy to review, easy to test and easy to undo. That finding is the argument behind most of the practices in this guide.

### Getting a change to users

A typical pipeline, from a commit to production. Not every stage is needed on the first day:

| Stage | What happens |
|---|---|
| Validate | Formatting and static checks, unit tests, type checks |
| Build | Compile, build the container image, list its components (SBOM) |
| Security | Scan the code, the dependencies and the image. Look for secrets |
| Deploy to staging | Automatic, to an environment that is safe to break |
| Test in staging | Smoke and integration tests, basic performance checks |
| Promote to production | An approval, or automatic promotion with a gradual rollout |
| Roll back | Automatic, when error rates rise or health checks fail |

How the new version takes over from the old one is a choice:

| Strategy | How | Trade-off |
|---|---|---|
| Rolling update | Replace instances a few at a time | The default. Old and new versions run together for a while |
| Blue-green | Two full environments. Switch all traffic at once, and switch back to undo | Fast rollback, double the cost |
| Canary | Send a small share of traffic to the new version, and raise it while the metrics stay healthy | A failure reaches few users. Needs good metrics |
| A/B test | Show different variants to groups of users, and measure which does better | A product experiment, and not a release safety measure. Needs enough users and one clear metric |

The details are in [CI/CD](../06-delivery/ci-cd.md) and [Deployment strategies](../06-delivery/deployment-strategies.md).

### Staying up

High availability comes from a small number of building blocks, used again and again:

| Building block | What it does | Where |
|---|---|---|
| Replication | Several copies of the data or the service, so one can fail | [Replication and scaling](../07-databases/replication.md) |
| Load balancing | Spreads traffic over the copies, and skips the failed ones | [Proxies and load balancers](../08-services/proxies.md) |
| Sharding / partitioning | Splits the data or the work over nodes | [Replication and scaling](../07-databases/replication.md), [Kafka](../08-services/kafka.md) |
| Health checks and self-healing | Failed instances are detected and replaced automatically | [Kubernetes in production](../02-containers/kubernetes-production.md) |

And three patterns protect services from each other when something is slow or down:

- **Retries with backoff and jitter.** A call that failed for a passing reason is tried again. The wait grows between attempts and has a random part, so that many clients do not retry at the same moment and turn a small failure into a large one. Retries are limited in number and always paired with a timeout.
- **Circuit breaker.** After enough failures, the caller stops calling the failing service for a while and fails fast. The failing service gets room to recover, and the caller does not pile up waiting requests.
- **Rate limiting.** A cap on requests per user, per key or per endpoint, so that one client or one spike cannot take the service down for everyone.

Backups belong here too: a backup that was never restored is a hope. Schedule restore drills, and decide the RPO and RTO before the disaster.

### Security, early and late

- **Before production (shift left):** tests, static analysis, scans of dependencies and images, and secret detection, all in the pipeline. A problem found here costs minutes.
- **In production (shift right):** runtime security watches running workloads: unexpected system calls, file access or network connections inside a container (Falco is the common tool), and agents inside the application that block attacks such as SQL injection as they happen (RASP).

See [Security](../10-security/_index.md).

### A small example: the whole idea in one loop

The shortest demonstration of DevOps is a change that reaches a running system without anyone touching a server:

```bash
git commit -am "Fix the greeting" && git push
```

and then, with nobody involved:

1. The pipeline runs the tests and builds an image tagged with the commit's hash.
2. The image is pushed to a registry.
3. The deployment is updated to the new tag, and the orchestrator replaces the running pods one at a time, sending traffic only to pods that pass their health check.
4. Dashboards show the new version, and an alert fires if the error rate rises.
5. If it does, `git revert` and a push run the same path backwards.

The [lab](../13-lab/_index.md) has this loop for real: [experiment 11](../13-lab/experiments.md#11-a-bad-release-and-a-rollback) releases a new version, measures that no request is lost, and rolls back a broken one.

## In the lab

- The [lab](../13-lab/_index.md) is the stack of this page running together: containers on Kubernetes, infrastructure as code, databases, a queue, a cache, metrics, dashboards and alerts.
- Its [experiments](../13-lab/experiments.md) show the ideas of this page happening: self-healing, autoscaling, a rollback, and alerts on what users feel.

## See also

- [From Code to the Real World](../talk.md): the same story as a talk, with a live demo
- [Roadmap](../roadmap.md): what to learn, in what order
- [Linux](linux.md): where the hands-on part starts
