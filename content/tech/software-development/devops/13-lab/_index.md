---
title: "Lab: a platform on your laptop"
kind: chapter
lang: en
description: One project that puts the guide into practice - a Kubernetes cluster with applications, databases and monitoring, deployed with Pulumi.
tags: [beginner]
updated: 2026-11-14
---

# Lab: a platform on your laptop

**Level: beginner**

One project that puts the whole guide into practice. A local Kubernetes cluster runs a small shop: a web page, an API, a background worker, PostgreSQL, Redis, Kafka and Elasticsearch, with Prometheus and Grafana watching all of it. Everything is deployed by one [Pulumi](pulumi.md) program in TypeScript, and built to be changed, loaded and broken.

The [exercise](../12-exercise/_index.md) has you build one application step by step. The lab gives you a finished system to operate.

- Source: [examples/devops-lab](https://github.com/Barakkol33/blearning/tree/main/examples/devops-lab) on GitHub, or as a [zip](https://github.com/Barakkol33/blearning/releases/download/devops-lab-latest/devops-lab.zip).

## What runs

```text
        your browser: http://localhost:8090
                      │
              ┌───────▼────────┐
              │    Traefik     │  ingress controller              namespace: platform
              └───┬────────┬───┘
            /     │        │  /api
          ┌───────▼──┐  ┌──▼─────────┐      ┌───────────┐
          │   web    │  │    api     │◄─────│  loadgen  │      namespace: apps
          │  nginx   │  │  Node.js   │      │ (off by   │
          │  x2      │  │  x2 to x6  │      │  default) │
          └──────────┘  └─┬───┬───┬──┘      └───────────┘
                          │   │   │ order events
              orders      │   │   └────────►┌───────────┐     ┌───────────┐
              ┌───────────▼┐ ┌▼───────┐     │   Kafka   │────►│  worker   │
              │ PostgreSQL │ │ Redis  │     └───────────┘     │  Node.js  │
              │            │ │ cache  │                       └──┬─────┬──┘
              └─────▲──────┘ └────────┘                          │     │
                    │              marks orders "processed"      │     │ indexes orders
                    └────────────────────────────────────────────┘     ▼
                                                              ┌───────────────┐
                              namespace: data                 │ Elasticsearch │
                                                              └───────────────┘

   Prometheus scrapes every pod that exposes metrics. Grafana shows them.    namespace: monitoring
```

What happens when you place an order:

1. The page (from nginx) sends `POST /api/orders` through the ingress to one of the API pods.
2. The API inserts the order into **PostgreSQL** with status `new`, publishes an event to **Kafka**, and clears the cached list in **Redis**.
3. The **worker** reads the event, takes 100 ms to "process" it, sets the status to `processed` and indexes the order in **Elasticsearch**.
4. The page asks for the list every two seconds. The API answers from Redis when it can (`x-cache: hit`), and from PostgreSQL otherwise.

## Where each chapter of the guide shows up

The guide is the theory, and the lab is where part of it is practiced. A page whose topic the lab practices ends with a section "In the lab" that points to the experiment.

| Chapter | In the lab |
|---|---|
| [Containers](../02-containers/_index.md) | One image for three roles. Deployments, StatefulSets, Services, probes, requests and limits, an autoscaler, a disruption budget, an Ingress |
| [Infrastructure as code](../04-infrastructure-as-code/_index.md) | The whole system is one [Pulumi program](pulumi.md), with Helm charts for third-party software |
| [Code](../05-code/_index.md) | The app follows the rules for an operable service: config from the environment, JSON logs, health endpoints, metrics, graceful shutdown |
| [Delivery](../06-delivery/_index.md) | Image tags from a content hash, rolling updates, rollback |
| [Databases](../07-databases/_index.md) | PostgreSQL, Redis and Elasticsearch with exporters and alert rules. Several of the common cases on each database's page can be reproduced |
| [Services](../08-services/_index.md) | Kafka with a consumer group and lag, Redis as a cache-aside cache, Elasticsearch, a reverse proxy |
| [Observability](../09-observability/_index.md) | Prometheus, a Grafana dashboard built on the RED method, four alert rules |
| [Reliability](../11-reliability/_index.md) | Kill pods, drain a node, exhaust connections, and watch what users would feel |
| [Cloud](../03-cloud/_index.md) | [The lab in a cloud](cloud.md): what changes on AWS, GCP and Azure |

## Run it

You need Docker, [kind](https://kind.sigs.k8s.io/), kubectl, Node.js 20 or newer and the [Pulumi CLI](https://www.pulumi.com/docs/install/), on Linux, macOS or WSL. Docker needs about 6 GB of memory for the full lab, or about 4 GB with search and monitoring switched off.

```bash
git clone https://github.com/Barakkol33/blearning.git
cd blearning/examples/devops-lab

./lab.sh up        # creates the cluster, builds the image, deploys. 5 to 10 minutes the first time
./lab.sh status    # nodes, pods, and the URLs
```

| What | Where |
|---|---|
| The shop | http://localhost:8090 |
| Grafana (dashboard "Shop") | http://grafana.localhost:8090, user `admin`, password `admin` |
| Prometheus | http://prometheus.localhost:8090 |

```bash
./lab.sh load on   # start a stream of customers
./lab.sh load off

./lab.sh psql      # a PostgreSQL shell
./lab.sh redis     # redis-cli
./lab.sh down      # delete the cluster and everything in it
```

When memory is short, or another kind cluster is already running, use a single-node cluster: `LAB_SMALL=1 ./lab.sh up`. If the cluster is not created at all, see Troubleshooting in the project's README (usually the machine's inotify limits).

On a smaller machine, also switch off the heavy parts before `up`. In `infra/config.ts`, change the defaults of `search` and `monitoring` to `false`, or after the first deploy:

```bash
cd infra
export PULUMI_BACKEND_URL="file://$PWD/../.pulumi-state" PULUMI_CONFIG_PASSPHRASE=""
pulumi config set search false
pulumi config set monitoring false
cd .. && ./lab.sh deploy
```

## The pages of this chapter

1. [Pulumi: how the lab is deployed](pulumi.md): the code, layer by layer, and exercises in changing it.
2. [Experiments](experiments.md): load, failures and database incidents to cause and observe.
3. [The lab in a cloud](cloud.md): what changes on AWS, GCP and Azure.

## Status

First version, November 2026. The full lab was run from start to end on a three-node kind cluster on 2026-11-15 (WSL, 8 GB of memory): `./lab.sh up`, the smoke test (`./lab.sh test`, 26 checks), all 13 experiments, a release, and a restart of Docker under the running cluster, from which it recovered by itself.

That run found five problems that no review, type check or `pulumi preview` had shown. They are fixed, and each one is a lesson of its own:

| What was seen | The cause | Where it is now |
|---|---|---|
| With no traffic at all, the autoscaler raised the API to its maximum of 6 pods | The Kafka client library re-armed a 1 ms timer forever on an idle connection, so an idle pod used 80% of its CPU request. Found with `kubectl top pods`, then by measuring each library alone inside a pod | A fix in `apps/shop/src/common.js`. An idle pod now uses about 15% |
| A release deleted the Deployments and created them again | Pulumi replaces a changed ConfigMap by default, and everything that refers to it | [Pulumi page](pulumi.md#two-defaults-that-the-first-real-run-exposed) |
| Every deploy waited 10 minutes and ended with an error | Pulumi waited for the Ingress to get a load balancer address, which kind never gives | The same section |
| Under load, 2 pods were busy and the 4 new ones idle | The load generator kept its connections open, and a Service balances connections | [Experiment 3](experiments.md#3-load-and-autoscaling) |
| A rollout dropped a request now and then | A pod being deleted can still receive a request for a moment | [Experiment 11](experiments.md#11-a-bad-release-and-a-rollback) |

## What the lab is not

It is a place to practice, not a template for production. Every data service is a single instance with a small disk or none, there is no TLS, the password is a lab password, and nothing is backed up. [The lab in a cloud](cloud.md) lists what a real deployment replaces.
