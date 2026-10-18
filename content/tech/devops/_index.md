---
title: DevOps — Self-Learning Guide
kind: guide
order: 2
lang: en
---

# DevOps — Self-Learning Guide

A hands-on guide to DevOps: from Linux basics through Docker and Kubernetes, to deploying a real application on a local cluster.

## Prerequisites

Before starting, follow [0-prerequisites.md](prerequisites.md) to install the required tools and pre-pull Docker images. This is especially important if you'll be working without internet access.

You'll also want a good markdown viewer to read these guides comfortably. Two recommended options:
- **Obsidian** — open the `docs/` folder as a vault for a clean reading experience with navigation
- **VS Code** — use the built-in markdown preview (`Ctrl+Shift+V` or the preview icon in the top-right corner of any `.md` file)

## Chapters

Read the chapters in order. Each one builds on the previous.

### 1. Get Started

| File | Topic |
|---|---|
| [1-index.md](01-get-started/overview.md) | DevOps overview — core concepts, architecture, tools landscape |
| [2-intro.md](01-get-started/intro.md) | DevOps intro — motivation, reliability fundamentals, IaC, CI/CD |
| [3-linux.md](01-get-started/linux.md) | Linux practical guide — filesystem, text processing, networking, bash scripting |

### 2. Containers

| File | Topic |
|---|---|
| [1-docker.md](02-containers/docker.md) | Docker — images, containers, volumes, networking, Dockerfile, Compose |
| [2-k8s.md](02-containers/kubernetes.md) | Kubernetes — architecture, objects, kubectl, Helm, kind, storage, MetalLB |

### 3. Data Sources

| File | Topic |
|---|---|
| [databases.md](03-data-sources/databases.md) | Databases — relational, document, key-value, columnar, when to use which |
| [kakfa.md](03-data-sources/kafka.md) | Kafka — event streaming, topics, partitions, consumers |

### 4. Observability

| File | Topic |
|---|---|
| [monitoring.md](04-observability/monitoring.md) | Monitoring with Prometheus, Loki, and Grafana |
| [metrics.md](04-observability/metrics.md) | Metrics — PromQL, scraping, alerting |
| [loki.md](04-observability/loki.md) | Loki — log aggregation and LogQL |

### 5. Cloud

| File | Topic |
|---|---|
| [cloud.md](05-cloud/cloud.md) | Cloud — compute, storage, managed services, AWS basics |

## Quick Reference

[1-cheatsheet.md](cheatsheet.md) — command cheatsheet for Linux, Docker, and Kubernetes. Keep this open while working through the guides and exercise.

## Exercise

[6-exercise/](06-exercise/_index.md) — **Guestbook on Kubernetes**: build a web app, containerize it, deploy to a kind cluster with all the K8s objects you learned (Namespace, ConfigMap, Secret, StatefulSet, Deployment, Service, Job), and package it as a Helm chart.

- [Exercise instructions](06-exercise/exercise.md)
- [Solution](06-exercise/solutions.md) — completed code + Helm chart
