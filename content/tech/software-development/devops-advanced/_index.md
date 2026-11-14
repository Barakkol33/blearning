---
title: DevOps - Advanced Guide
kind: guide
order: 3
lang: en
status: in-progress
description: What a good DevOps engineer needs to know today, topic by topic, each at a marked level.
---

# DevOps - Advanced Guide

What a good DevOps engineer needs to know today: clouds, infrastructure as code, the code and runtimes you operate, delivery, databases, the common backing services, observability, security and reliability.

It continues the hands-on [DevOps self-learning guide](../devops/_index.md) (Linux, Docker, Kubernetes, Kafka, monitoring). Read that one first if those are new to you.

## Levels

Every page is written at one level, marked at the top of the page and in its `tags`. Pages start at intro and are deepened over time.

| Level | What the page gives you |
|---|---|
| **intro** | The terms, why the topic matters, and one small example |
| **beginner** | Simple hands-on: enough to set it up and use it yourself |
| **advanced** | Deep: how it works inside, how to run it in production, how it fails |

## Pages and their levels

| # | Chapter | Page | Level |
|---|---|---|---|
| 1 | Foundations | [Networking](01-foundations/networking.md) | intro |
| 1 | Foundations | [Linux internals](01-foundations/linux-internals.md) | intro |
| 2 | Cloud | [Cloud concepts](02-cloud/concepts.md) | intro |
| 2 | Cloud | [AWS](02-cloud/aws.md) | intro |
| 2 | Cloud | [Azure](02-cloud/azure.md) | intro |
| 2 | Cloud | [GCP](02-cloud/gcp.md) | intro |
| 3 | Infrastructure as code | [Terraform](03-infrastructure-as-code/terraform.md) | intro |
| 3 | Infrastructure as code | [Configuration and images](03-infrastructure-as-code/configuration.md) | intro |
| 4 | Code | [Languages](04-code/languages.md) | intro |
| 4 | Code | [Runtimes and engines](04-code/runtimes.md) | intro |
| 4 | Code | [Frameworks](04-code/frameworks.md) | intro |
| 4 | Code | [APIs](04-code/apis.md) | intro |
| 5 | Delivery | [CI/CD](05-delivery/ci-cd.md) | intro |
| 5 | Delivery | [Deployment strategies](05-delivery/deployment-strategies.md) | intro |
| 5 | Delivery | [GitOps](05-delivery/gitops.md) | intro |
| 6 | Kubernetes | [Kubernetes in production](06-kubernetes/production.md) | intro |
| 7 | Databases | [How databases work](07-databases/internals.md) | intro |
| 7 | Databases | [PostgreSQL](07-databases/postgres.md) | intro |
| 7 | Databases | [Replication and scaling](07-databases/replication.md) | intro |
| 7 | Databases | [Operating a database](07-databases/operations.md) | intro |
| 8 | Services | [Messaging and queues](08-services/messaging.md) | intro |
| 8 | Services | [Caching and Redis](08-services/caching.md) | intro |
| 8 | Services | [Search](08-services/search.md) | intro |
| 8 | Services | [Object storage](08-services/object-storage.md) | intro |
| 8 | Services | [Proxies and load balancers](08-services/proxies.md) | intro |
| 9 | Observability | [Observability](09-observability/observability.md) | intro |
| 10 | Security | [Security](10-security/security.md) | intro |
| 11 | Reliability | [SRE](11-reliability/sre.md) | intro |
| 11 | Reliability | [Cost (FinOps)](11-reliability/finops.md) | intro |

When a page moves up a level, update its row here, the level line at the top of the page and its `tags`.

## How a page is built

- **intro**: what it is and why you care, a table of terms, one small example, and where it goes next.
- **beginner** adds a hands-on walkthrough you can run on a laptop or a free cloud tier.
- **advanced** adds internals, production practice, failure modes and tuning.

The plan for what to deepen next is in [TODO](todo.md).
