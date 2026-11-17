---
title: "Roadmap: what the industry expects, and where it is in the guide"
sidebar:
  label: Roadmap
order: 1
lang: en
updated: 2026-11-17
---

# Roadmap: what the industry expects, and where it is in the guide

The best-known public list of what a DevOps engineer is expected to know is the [DevOps roadmap of roadmap.sh](https://roadmap.sh/devops), a community-maintained map of about 160 topics. This page follows its sections in order, and shows for each one where the guide covers it, at which level, and whether it can be practiced in the [lab](13-lab/_index.md).

Use it in two ways: as a study order, from top to bottom, and as a check of what the guide does not cover yet.

## The roadmap, section by section

"Level" is the deepest level the guide has for the section today. The levels are explained in the [overview](_index.md#levels).

| # | Roadmap section | Its topics | In the guide | Level | In the lab |
|---|---|---|---|---|---|
| 1 | A programming language | Python, Go, JavaScript, Ruby, Rust | [Languages](05-code/languages.md), [Runtimes](05-code/runtimes.md) | intro | The application is Node.js, the infrastructure is TypeScript |
| 2 | Operating system | Linux distributions, BSD, Windows | [Linux](01-get-started/linux.md), [Linux internals](01-get-started/linux-internals.md) | beginner | The CPU problem of the lab's first run was found with these tools |
| 3 | Terminal knowledge | Bash, text tools, process and performance monitoring, networking tools, editors | [Linux](01-get-started/linux.md) (text tools, Bash), [Linux internals](01-get-started/linux-internals.md#troubleshooting-a-server) (process, memory, disk monitoring, `strace`, systemd), [cheatsheet](cheatsheet.md) | beginner | `lab.sh` is a Bash script worth reading |
| 4 | Version control and hosting | Git, GitHub, GitLab, Bitbucket | [Git and code hosting](06-delivery/git.md) (rebase, conflicts, `reflog`, hooks, protected branches, force push with a lease) | beginner | The lab's workflow: path filters, the jobs a protected branch would require |
| 5 | Containers | Docker, LXC | [Docker](02-containers/docker.md) (images, Compose, [small and safe images](02-containers/docker.md#small-and-safe-images): build cache, multi-stage, non-root, scanning with Trivy, pinning, run-time limits) | beginner | One image, three roles. Its Dockerfile [checked](02-containers/docker.md#the-labs-dockerfile-checked) and npm removed from it |
| 6 | Setting up servers | Reverse and forward proxy, load balancer, caching server, firewall, nginx, Apache, Caddy | [Proxies and load balancers](08-services/proxies.md), [Caching](08-services/caching.md) | intro | Traefik as the door, Redis as the cache |
| 7 | Networking and protocols | OSI model, DNS, HTTP, HTTPS, TLS, SSH, FTP, email protocols | [Networking](01-get-started/networking.md) (DNS, TLS and a CA, HTTP timing, SSH through a bastion, a firewall), [APIs](05-code/apis.md) | beginner | Routing by host name, cluster DNS |
| 8 | Cloud providers | AWS, Azure, GCP and smaller providers | [Cloud concepts](03-cloud/concepts.md), [AWS](03-cloud/aws.md), [Azure](03-cloud/azure.md), [GCP](03-cloud/gcp.md) | intro | [The lab in a cloud](13-lab/cloud.md), as a plan |
| 9 | Serverless | Lambda, Azure Functions, Cloud Run functions, Cloudflare, Vercel, Netlify | [Serverless](03-cloud/serverless.md) | intro | |
| 10 | Provisioning | Terraform, Pulumi, CloudFormation, CDK | [Terraform](04-infrastructure-as-code/terraform.md), [Pulumi in the lab](13-lab/pulumi.md) | beginner | The whole lab is one Pulumi program |
| 11 | Configuration management | Ansible, Chef, Puppet, Salt | [Configuration and images](04-infrastructure-as-code/configuration.md) | intro | |
| 12 | CI/CD tools | GitHub Actions, GitLab CI, Jenkins, CircleCI and others | [CI/CD](06-delivery/ci-cd.md), [Deployment strategies](06-delivery/deployment-strategies.md) | intro | A workflow deploys and tests the lab. Rolling update and rollback |
| 13 | Secret management | Vault, SOPS, Sealed Secrets, External Secrets, cloud secret managers | [Security](10-security/_index.md) | intro | |
| 14 | Infrastructure monitoring | Prometheus, Grafana, Datadog, Zabbix | [Observability](09-observability/concepts.md), [Metrics](09-observability/metrics.md), [Monitoring](09-observability/monitoring.md) | beginner | Prometheus, Grafana, a dashboard, 19 alert rules |
| 15 | Logs management | Elastic Stack, Loki, Graylog, Splunk | [Loki](09-observability/loki.md), [Search](08-services/search.md), [Elasticsearch](07-databases/elasticsearch.md) | beginner | JSON logs from the application. No log store yet |
| 16 | Application monitoring | OpenTelemetry, Jaeger, Datadog, New Relic, Dynatrace | [Observability](09-observability/concepts.md) | intro | Application metrics. No tracing yet |
| 17 | Container orchestration | Kubernetes, managed Kubernetes (EKS, GKE, AKS), ECS, OpenShift, Docker Swarm | [Kubernetes](02-containers/kubernetes.md), [Kubernetes in production](02-containers/kubernetes-production.md), [exercise](12-exercise/instructions.md) | beginner | A three-node cluster: probes, autoscaling, disruption budgets, a drain |
| 18 | Artifact management | Artifactory, Nexus, Cloudsmith | [Artifacts and registries](06-delivery/artifacts.md) | intro | |
| 19 | GitOps | Argo CD, Flux | [GitOps](06-delivery/gitops.md) | intro | |
| 20 | Service mesh | Istio, Linkerd, Consul, Envoy | [Service mesh](08-services/service-mesh.md) | intro | |
| 21 | Cloud design patterns | Availability, data management, design and implementation, management and monitoring | [What is DevOps](01-get-started/intro.md), [SRE](11-reliability/sre.md), [Replication and scaling](07-databases/replication.md) | intro | Failure experiments: pods, a database, a node |

## What the guide adds to the roadmap

The roadmap lists tools. A DevOps engineer is also expected to keep the data layer alive and to reason about cost and reliability, and that is where much of the day goes. The guide therefore has chapters the roadmap does not:

| Topic | In the guide | In the lab |
|---|---|---|
| How databases work, and how to operate them | [Internals](07-databases/internals.md), [Replication](07-databases/replication.md), [Operations](07-databases/operations.md) | Query plans and an index |
| A page per database, with what to watch and the common incidents | [PostgreSQL](07-databases/postgres.md), [Elasticsearch](07-databases/elasticsearch.md), [Redis](07-databases/redis.md), [MongoDB](07-databases/mongodb.md), [ClickHouse](07-databases/clickhouse.md), [Database health](07-databases/health.md) | Lock queues, connection limits, evictions, a yellow cluster |
| Messaging | [Messaging and queues](08-services/messaging.md), [Kafka](08-services/kafka.md) | Consumer lag and its fix |
| Object storage | [Object storage](08-services/object-storage.md) | |
| The code you operate | [Runtimes](05-code/runtimes.md), [Frameworks](05-code/frameworks.md), [APIs](05-code/apis.md) | An application built to be operated |
| Security as a whole | [Security](10-security/_index.md) | |
| Reliability and cost | [SRE](11-reliability/sre.md), [FinOps](11-reliability/finops.md) | An alert on what users feel |

## What is not covered

Roadmap topics that the guide does not have, by choice or not yet:

| Topic | Status |
|---|---|
| Email protocols (SMTP, IMAP, POP3, SPF, DKIM, DMARC) | Not planned. Few DevOps roles run mail servers today |
| FTP and SFTP | Not planned beyond a mention |
| BSD systems, LXC, Docker Swarm | Not planned. Rare in new systems |
| Terminal editors (vim, nano) | Not planned as a page |
| Smaller cloud and hosting providers (DigitalOcean, Hetzner, Heroku, Vercel, Netlify) | Mentioned only |
| Windows as a server, IIS | Only a command cheatsheet |
| OpenShift | Not yet |
| Secret management as its own page, with a hands-on example | Planned |
| Tracing with OpenTelemetry, hands-on | Planned, in the lab |
| A log store in the lab | Planned |
| Beginner and Advanced sections for most pages | Most pages have only Intro today. See the table in the [overview](_index.md#chapters-pages-and-levels) |

## A study order

For someone starting from zero, the order of the roadmap is a good one, and it matches the chapters:

1. [Linux](01-get-started/linux.md) and the terminal, then [Networking](01-get-started/networking.md).
2. [Git](06-delivery/git.md).
3. [Docker](02-containers/docker.md), then [Kubernetes](02-containers/kubernetes.md) and the [exercise](12-exercise/instructions.md).
4. One cloud: [Cloud concepts](03-cloud/concepts.md) and one provider page.
5. [Infrastructure as code](04-infrastructure-as-code/terraform.md) and [CI/CD](06-delivery/ci-cd.md), with [Artifacts](06-delivery/artifacts.md).
6. [Observability](09-observability/concepts.md).
7. The [lab](13-lab/_index.md): everything above running together, and its [experiments](13-lab/experiments.md).
8. Then by need: [databases](07-databases/_index.md), [services](08-services/_index.md), [security](10-security/_index.md), [reliability](11-reliability/sre.md).
