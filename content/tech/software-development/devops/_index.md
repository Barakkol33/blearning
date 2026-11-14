---
title: DevOps Guide
kind: guide
order: 2
lang: en
description: From Linux basics to running production systems, topic by topic, each page at a marked level.
---

# DevOps Guide

What a good DevOps engineer needs to know today, from the first Linux command to running production systems: containers and Kubernetes, clouds, infrastructure as code, the code and runtimes you operate, delivery, databases, the common backing services, observability, security and reliability. It ends with a hands-on exercise that deploys a real application to a local Kubernetes cluster.

**New here? Start with the talk:** [From Code to the Real World](talk.md) - the big picture in 40 minutes of slides, with a live Kubernetes demo you can run yourself.

**Not technical?** [Hi-tech, DevOps & JFrog 101](devops-101.md) - slides that explain the words, the people and the process without any code.

## How to use this guide

- **Learning from zero:** read chapters 1 and 2 in order, then do the [exercise](12-exercise/_index.md). After that, take the other chapters in any order.
- **Filling gaps:** every page stands on its own. Pick what you need from the table below.
- **Before the hands-on pages:** follow the [prerequisites](prerequisites.md) to install the tools and pre-pull the Docker images. This matters most if you will work without internet access.
- **While working:** keep the [cheatsheet](cheatsheet.md) open (Linux, Docker, Kubernetes). There is also a [Windows version](cheatsheet-windows.md).

## Levels

Every page is written at one level, marked at the top of the page and in its `tags`. Pages are deepened over time.

| Level | What the page gives you |
|---|---|
| **intro** | The terms, why the topic matters, and one small example |
| **beginner** | Simple hands-on: enough to set it up and use it yourself |
| **advanced** | Deep: how it works inside, how to run it in production, how it fails |

## Chapters, pages and levels

| # | Chapter | Page | Level |
|---|---|---|---|
| 1 | Get started | [DevOps overview](01-get-started/overview.md): core concepts and the tools landscape | intro |
| 1 | Get started | [DevOps intro](01-get-started/intro.md): motivation, reliability, IaC, CI/CD | intro |
| 1 | Get started | [Linux](01-get-started/linux.md): filesystem, text processing, networking, bash scripting | beginner |
| 1 | Get started | [Networking](01-get-started/networking.md) | intro |
| 1 | Get started | [Linux internals](01-get-started/linux-internals.md) | intro |
| 2 | Containers | [Docker](02-containers/docker.md): images, containers, volumes, networking, Dockerfile, Compose | beginner |
| 2 | Containers | [Kubernetes](02-containers/kubernetes.md): architecture, objects, kubectl, Helm, kind | beginner |
| 2 | Containers | [Kubernetes in production](02-containers/kubernetes-production.md) | intro |
| 3 | Cloud | [Cloud concepts](03-cloud/concepts.md) | intro |
| 3 | Cloud | [AWS](03-cloud/aws.md) | intro |
| 3 | Cloud | [Azure](03-cloud/azure.md) | intro |
| 3 | Cloud | [GCP](03-cloud/gcp.md) | intro |
| 4 | Infrastructure as code | [Terraform](04-infrastructure-as-code/terraform.md) | intro |
| 4 | Infrastructure as code | [Configuration and images](04-infrastructure-as-code/configuration.md) | intro |
| 5 | Code | [Languages](05-code/languages.md) | intro |
| 5 | Code | [Runtimes and engines](05-code/runtimes.md) | intro |
| 5 | Code | [Frameworks](05-code/frameworks.md) | intro |
| 5 | Code | [APIs](05-code/apis.md) | intro |
| 6 | Delivery | [CI/CD](06-delivery/ci-cd.md) | intro |
| 6 | Delivery | [Deployment strategies](06-delivery/deployment-strategies.md) | intro |
| 6 | Delivery | [GitOps](06-delivery/gitops.md) | intro |
| 7 | Databases | [How databases work](07-databases/internals.md) | intro |
| 7 | Databases | [PostgreSQL](07-databases/postgres.md) | intro |
| 7 | Databases | [Replication and scaling](07-databases/replication.md) | intro |
| 7 | Databases | [Operating a database](07-databases/operations.md) | intro |
| 7 | Databases | [Beyond relational](07-databases/databases.md): Elasticsearch, MongoDB, Redis, ClickHouse | intro |
| 8 | Services | [Messaging and queues](08-services/messaging.md) | intro |
| 8 | Services | [Kafka](08-services/kafka.md) | intro |
| 8 | Services | [Caching and Redis](08-services/caching.md) | intro |
| 8 | Services | [Search](08-services/search.md) | intro |
| 8 | Services | [Object storage](08-services/object-storage.md) | intro |
| 8 | Services | [Proxies and load balancers](08-services/proxies.md) | intro |
| 9 | Observability | [Observability](09-observability/observability.md): metrics, logs, traces, alerts | intro |
| 9 | Observability | [Metrics and Prometheus](09-observability/metrics.md) | intro |
| 9 | Observability | [Monitoring with Prometheus, Loki and Grafana](09-observability/monitoring.md) | beginner |
| 9 | Observability | [Loki and LogQL](09-observability/loki.md) | beginner |
| 10 | Security | [Security](10-security/security.md) | intro |
| 11 | Reliability | [SRE](11-reliability/sre.md) | intro |
| 11 | Reliability | [Cost (FinOps)](11-reliability/finops.md) | intro |
| 12 | Exercise | [Guestbook on Kubernetes](12-exercise/exercise.md), with a [solution](12-exercise/solutions.md) | beginner |

When a page moves up a level, update its row here, the level line at the top of the page and its `tags`.

## How a page is built

- **intro**: what it is and why you care, a table of terms, one small example, and where it goes next.
- **beginner** adds a hands-on walkthrough you can run on a laptop or a free cloud tier.
- **advanced** adds internals, production practice, failure modes and tuning.

## Exercise

[Guestbook on Kubernetes](12-exercise/_index.md): build a web app, containerize it, deploy it to a kind cluster with the Kubernetes objects from chapter 2 (Namespace, ConfigMap, Secret, StatefulSet, Deployment, Service, Job), and package it as a Helm chart.

The plan for what to deepen next is in [todo.md](https://github.com/Barakkol33/blearning/blob/main/content/tech/software-development/devops/todo.md) on GitHub.
