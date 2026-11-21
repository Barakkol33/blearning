---
title: DevOps Guide
kind: guide
order: 2
lang: en
description: From Linux basics to running production systems, topic by topic. Every page is divided into intro, beginner and advanced sections.
---

# DevOps Guide

What a good DevOps engineer needs to know today, from the first Linux command to running production systems: containers and Kubernetes, clouds, infrastructure as code, the code and runtimes you operate, delivery, databases, the common backing services, observability, security and reliability. It ends with a hands-on exercise that deploys a real application to a local Kubernetes cluster.

**New here? Start with the talk:** [From Code to the Real World](talk.md) - the big picture in 40 minutes of slides, with a live Kubernetes demo you can run yourself.

**Not technical?** [Hi-tech & DevOps 101](hitech-devops-101.md) - slides for everyone who is not a developer: the words, the process, the cloud, cyber and the people, without any code. There is also a version that adds one company's products: [Hi-tech, DevOps & JFrog 101](devops-101.md).

## How to use this guide

- **What is there to know?** [Topics to know](topics.md) lists, on one page, the advanced topics and technologies of every page, each with a line on what it is, so you can see what belongs to the field and look up what you do not know.
- **What should I know, and in what order?** The [roadmap](roadmap.md) follows the industry's best-known list of DevOps topics, and shows where each one is in the guide and in the lab.
- **Learning from zero:** read chapters 1 and 2 in order, then do the [exercise](12-exercise/_index.md). After that, take the other chapters in any order.
- **Theory and practice:** the pages are the theory. The more useful parts can also be practiced, and a page whose topic is practiced ends with a section "In the lab". The [lab](13-lab/_index.md) is a complete small platform on your laptop (applications, PostgreSQL, Redis, Kafka, Elasticsearch, Prometheus and Grafana), deployed with Pulumi, with a list of things to load and break.
- **Filling gaps:** every page stands on its own, and is divided into levels. Pick the page and the level you need from the table below.
- **Before the hands-on pages:** follow the [prerequisites](prerequisites.md) to install the tools and pre-pull the Docker images. This matters most if you will work without internet access.
- **While working:** keep the [cheatsheet](cheatsheet.md) open (Linux, Docker, Kubernetes). There is also a [Windows version](cheatsheet-windows.md).

## Levels

Every topic page is divided into level sections, so you can choose a level for each topic and each chapter: read only the Intro sections of a chapter for the big picture, or go straight to Advanced on a topic you already work with. A page has only the levels that are written, and each page lists its levels at the top.

| Level | What the section gives you |
|---|---|
| **Intro** | The terms, why the topic matters, and one small example |
| **Beginner** | Simple hands-on: enough to set it up and use it yourself |
| **Advanced** | Deep: how it works inside, how to run it in production, how it fails. Every page's Advanced section starts or ends with "Topics to know": the names to know at this level |

## Chapters, pages and levels

A link in a level column opens that section of the page. An empty cell means the level is not written yet. **topics** in the Advanced column means that the Advanced section is, for now, only a list of the topics and technologies to know at that level, to look up by name.

| # | Chapter | Page | Intro | Beginner | Advanced |
|---|---|---|---|---|---|
| 1 | Get started | [What is DevOps](01-get-started/intro.md): the ideas, the stack and how delivery is measured | [intro](01-get-started/intro.md#intro) |  | [topics](01-get-started/intro.md#advanced) |
| 1 | Get started | [Linux and the command line](01-get-started/linux.md): filesystem, text processing, networking, bash scripting | [intro](01-get-started/linux.md#intro) | [beginner](01-get-started/linux.md#beginner) | [topics](01-get-started/linux.md#advanced) |
| 1 | Get started | [Networking](01-get-started/networking.md): DNS, TLS, HTTP, SSH, firewalls | [intro](01-get-started/networking.md#intro) | [beginner](01-get-started/networking.md#beginner) | [topics](01-get-started/networking.md#advanced) |
| 1 | Get started | [Linux internals](01-get-started/linux-internals.md): processes, cgroups, troubleshooting a server | [intro](01-get-started/linux-internals.md#intro) | [beginner](01-get-started/linux-internals.md#beginner) | [topics](01-get-started/linux-internals.md#advanced) |
| 2 | Containers | [Docker](02-containers/docker.md): images, containers, volumes, networking, Dockerfile, Compose, small and safe images | [intro](02-containers/docker.md#intro) | [beginner](02-containers/docker.md#beginner) | [topics](02-containers/docker.md#advanced) |
| 2 | Containers | [Kubernetes](02-containers/kubernetes.md): architecture, objects, kubectl, Helm, kind |  | [beginner](02-containers/kubernetes.md#beginner) | [topics](02-containers/kubernetes.md#advanced) |
| 2 | Containers | [Kubernetes in production](02-containers/kubernetes-production.md) | [intro](02-containers/kubernetes-production.md#intro) |  | [topics](02-containers/kubernetes-production.md#advanced) |
| 3 | Cloud | [Cloud concepts](03-cloud/concepts.md) | [intro](03-cloud/concepts.md#intro) |  | [topics](03-cloud/concepts.md#advanced) |
| 3 | Cloud | [AWS](03-cloud/aws.md) | [intro](03-cloud/aws.md#intro) |  | [topics](03-cloud/aws.md#advanced) |
| 3 | Cloud | [Azure](03-cloud/azure.md) | [intro](03-cloud/azure.md#intro) |  | [topics](03-cloud/azure.md#advanced) |
| 3 | Cloud | [GCP](03-cloud/gcp.md) | [intro](03-cloud/gcp.md#intro) |  | [topics](03-cloud/gcp.md#advanced) |
| 3 | Cloud | [Serverless](03-cloud/serverless.md) | [intro](03-cloud/serverless.md#intro) |  | [topics](03-cloud/serverless.md#advanced) |
| 4 | Infrastructure as code | [Terraform](04-infrastructure-as-code/terraform.md) | [intro](04-infrastructure-as-code/terraform.md#intro) |  |  |
| 4 | Infrastructure as code | [Configuration and images](04-infrastructure-as-code/configuration.md) | [intro](04-infrastructure-as-code/configuration.md#intro) |  | [topics](04-infrastructure-as-code/configuration.md#advanced) |
| 5 | Code | [Languages](05-code/languages.md) | [intro](05-code/languages.md#intro) |  | [topics](05-code/languages.md#advanced) |
| 5 | Code | [Runtimes and engines](05-code/runtimes.md) | [intro](05-code/runtimes.md#intro) |  | [topics](05-code/runtimes.md#advanced) |
| 5 | Code | [Frameworks](05-code/frameworks.md) | [intro](05-code/frameworks.md#intro) |  | [topics](05-code/frameworks.md#advanced) |
| 5 | Code | [APIs](05-code/apis.md) | [intro](05-code/apis.md#intro) |  | [topics](05-code/apis.md#advanced) |
| 6 | Delivery | [Git and code hosting](06-delivery/git.md) | [intro](06-delivery/git.md#intro) | [beginner](06-delivery/git.md#beginner) | [topics](06-delivery/git.md#advanced) |
| 6 | Delivery | [CI/CD](06-delivery/ci-cd.md) | [intro](06-delivery/ci-cd.md#intro) |  | [topics](06-delivery/ci-cd.md#advanced) |
| 6 | Delivery | [Artifacts and registries](06-delivery/artifacts.md) | [intro](06-delivery/artifacts.md#intro) |  | [topics](06-delivery/artifacts.md#advanced) |
| 6 | Delivery | [Deployment strategies](06-delivery/deployment-strategies.md) | [intro](06-delivery/deployment-strategies.md#intro) |  | [topics](06-delivery/deployment-strategies.md#advanced) |
| 6 | Delivery | [GitOps](06-delivery/gitops.md) | [intro](06-delivery/gitops.md#intro) |  | [topics](06-delivery/gitops.md#advanced) |
| 7 | Databases | [How databases work](07-databases/internals.md) | [intro](07-databases/internals.md#intro) |  | [topics](07-databases/internals.md#advanced) |
| 7 | Databases | [Replication and scaling](07-databases/replication.md) | [intro](07-databases/replication.md#intro) |  | [topics](07-databases/replication.md#advanced) |
| 7 | Databases | [Operating a database](07-databases/operations.md) | [intro](07-databases/operations.md#intro) |  | [topics](07-databases/operations.md#advanced) |
| 7 | Databases | [Database health](07-databases/health.md): the questions for every data system |  |  | [advanced](07-databases/health.md#advanced) |
| 7 | Databases | [PostgreSQL](07-databases/postgres.md) | [intro](07-databases/postgres.md#intro) |  | [advanced](07-databases/postgres.md#advanced) |
| 7 | Databases | [Elasticsearch](07-databases/elasticsearch.md) | [intro](07-databases/elasticsearch.md#intro) |  | [advanced](07-databases/elasticsearch.md#advanced) |
| 7 | Databases | [Redis](07-databases/redis.md) | [intro](07-databases/redis.md#intro) |  | [advanced](07-databases/redis.md#advanced) |
| 7 | Databases | [MongoDB](07-databases/mongodb.md) | [intro](07-databases/mongodb.md#intro) |  | [advanced](07-databases/mongodb.md#advanced) |
| 7 | Databases | [ClickHouse](07-databases/clickhouse.md) | [intro](07-databases/clickhouse.md#intro) |  | [topics](07-databases/clickhouse.md#advanced) |
| 8 | Services | [Messaging and queues](08-services/messaging.md) | [intro](08-services/messaging.md#intro) |  | [topics](08-services/messaging.md#advanced) |
| 8 | Services | [Kafka](08-services/kafka.md) | [intro](08-services/kafka.md#intro) |  | [advanced](08-services/kafka.md#advanced) |
| 8 | Services | [Caching and Redis](08-services/caching.md) | [intro](08-services/caching.md#intro) |  | [topics](08-services/caching.md#advanced) |
| 8 | Services | [Search](08-services/search.md) | [intro](08-services/search.md#intro) |  | [topics](08-services/search.md#advanced) |
| 8 | Services | [Object storage](08-services/object-storage.md) | [intro](08-services/object-storage.md#intro) |  | [topics](08-services/object-storage.md#advanced) |
| 8 | Services | [Proxies and load balancers](08-services/proxies.md) | [intro](08-services/proxies.md#intro) |  | [topics](08-services/proxies.md#advanced) |
| 8 | Services | [Service mesh](08-services/service-mesh.md) | [intro](08-services/service-mesh.md#intro) |  | [topics](08-services/service-mesh.md#advanced) |
| 9 | Observability | [Observability](09-observability/concepts.md): metrics, logs, traces, alerts | [intro](09-observability/concepts.md#intro) |  | [topics](09-observability/concepts.md#advanced) |
| 9 | Observability | [Metrics and Prometheus](09-observability/metrics.md) | [intro](09-observability/metrics.md#intro) |  | [topics](09-observability/metrics.md#advanced) |
| 9 | Observability | [Monitoring with Prometheus, Loki and Grafana](09-observability/monitoring.md) |  | [beginner](09-observability/monitoring.md#beginner) | [topics](09-observability/monitoring.md#advanced) |
| 9 | Observability | [Loki and LogQL](09-observability/loki.md) |  | [beginner](09-observability/loki.md#beginner) | [topics](09-observability/loki.md#advanced) |
| 10 | Security | [Security](10-security/_index.md) | [intro](10-security/_index.md#intro) |  | [topics](10-security/_index.md#advanced) |
| 11 | Reliability | [SRE](11-reliability/sre.md) | [intro](11-reliability/sre.md#intro) |  | [topics](11-reliability/sre.md#advanced) |
| 11 | Reliability | [Cost (FinOps)](11-reliability/finops.md) | [intro](11-reliability/finops.md#intro) |  | [topics](11-reliability/finops.md#advanced) |

Two chapters are practice and are not divided into levels:

| # | Chapter | Page |
|---|---|---|
| 12 | Exercise | [Guestbook on Kubernetes](12-exercise/instructions.md), with a [solution](12-exercise/solutions.md). Beginner level |
| 13 | Lab | [A platform on your laptop](13-lab/_index.md): a cluster with apps, databases and monitoring. Beginner level |
| 13 | Lab | [Pulumi: how the lab is deployed](13-lab/pulumi.md) |
| 13 | Lab | [Experiments](13-lab/experiments.md): load, failures and database incidents |
| 13 | Lab | [The lab in a cloud](13-lab/cloud.md): AWS, GCP, Azure |

## How a page is built

```text
# Title
What it is and why you care, and the list of levels on the page
## Intro        terms, what is special about it, one small example
## Beginner     a hands-on walkthrough you can run on a laptop or a free cloud tier
## Advanced     internals, production practice, what to watch, failure modes, tuning
## See also
```

## Exercise

[Guestbook on Kubernetes](12-exercise/_index.md): build a web app, containerize it, deploy it to a kind cluster with the Kubernetes objects from chapter 2 (Namespace, ConfigMap, Secret, StatefulSet, Deployment, Service, Job), and package it as a Helm chart.

The plan for what to deepen next is in [todo.md](https://github.com/Barakkol33/blearning/blob/main/content/tech/software-development/devops/todo.md) on GitHub.
