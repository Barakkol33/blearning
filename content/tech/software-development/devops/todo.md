---
title: TODO
lang: en
draft: true
order: 99
---

# TODO - DevOps guide

Working list for this guide. The page is a draft, so it shows in local preview and never on the published site.

**To continue the work:** say "continue the DevOps guide". Take the first open item under [Next up](#next-up), unless a specific item is named. When an item is done, tick it, move it to [Done](#done) with the date, and update the level table in the [overview](_index.md) if a level changed.

## Goal

The guide should hold the knowledge needed to work as a good DevOps engineer today, and the [lab](13-lab/_index.md) should let every topic be practiced on a laptop.

## Rules

- **Levels:** intro (terms + small example), beginner (simple hands-on), advanced (deep). The list of pages and levels is in the [overview](_index.md).
- When a page moves up a level: update the table in the overview, the level line on the page and its `tags`.
- **Page pattern:** what it is and why you care, a terms table, a small example, "where it goes next", "see also".
- **Health pages** use two tables per system: "what to watch" (signal, where, healthy, worry when) and "common cases" (what happens, how it shows, what to do).
- **Practical first:** a new hands-on topic is added to the lab (`examples/devops-lab`) and gets an experiment in [Experiments](13-lab/experiments.md), in preference to a separate small example.
- **Lab code is tested before it is described.** Type-check and `pulumi preview` at least. An experiment is written up only after it was run.
- **Terraform stays at intro/beginner.** No advanced Terraform (Barak, 2026-11-14). The lab uses Pulumi with TypeScript.
- A page is never named like its folder (STRUCTURE.md). When a URL changes, add a redirect.
- The guide is public. New pages can be written here directly, or in the private repo first when they should not be public yet.

## Next up

In this order:

- [ ] **Run the lab end to end on a real kind cluster and fix what breaks.** It was verified in parts only (see [Lab status](#lab-status)). Go through all 13 experiments and correct the text where reality differs.
- [ ] **Lab on a cloud, step 1:** push the image to a registry from a GitHub Actions workflow (CI for `examples/devops-lab`: test, build, scan with Trivy, push to ghcr.io).
- [ ] **Database health, deeper:** a runbook per case with the exact commands in order, and a Prometheus alert rule for every "worry when". Add the rules to `infra/monitoring.ts`.
- [ ] **PostgreSQL to advanced:** vacuum and bloat, locks, `pg_stat_statements`, connection pooling with PgBouncer (add PgBouncer to the lab).
- [ ] **Replication in the lab:** a PostgreSQL primary and replica (CloudNativePG operator), a failover experiment, replication lag on the dashboard.
- [ ] **Kubernetes in production to beginner:** point every term at where the lab uses it. Add NetworkPolicies and RBAC to the lab.

## Lab status

`examples/devops-lab`, written 2026-11-14.

Verified:

- The Pulumi program type-checks, and `pulumi preview` plans all 34 resources against a cluster API.
- The three Helm charts render with the lab's values (versions pinned: traefik 42.4.0, metrics-server 3.14.0, kube-prometheus-stack 93.3.0).
- The application, as Docker containers with real PostgreSQL, Redis, Kafka and Elasticsearch: orders, cache hit and miss, the worker, search, metrics, lag building under load, Redis evictions.
- All container images and tags exist.

Not verified yet:

- A full `./lab.sh up` on a kind cluster, and therefore: the ingress routing, the autoscaler, the PodMonitor scraping, the Grafana dashboard panels, the alert rules, and experiments 2, 3, 7 to 13 as written.
- Reason: the machine already runs the `devops-demo` kind cluster, and WSL's inotify limit (128 instances) does not allow a second cluster. Fix with `sudo sysctl fs.inotify.max_user_instances=512`, or stop the demo cluster while the lab runs.

## Lab: what can be added

Each item is a new piece in `examples/devops-lab` plus an experiment.

Delivery:

- [ ] CI workflow: test, build, Trivy scan, push to ghcr.io
- [ ] Argo CD in the cluster, deploying the shop from Git (GitOps), with Pulumi installing only the platform
- [ ] Canary release with Argo Rollouts, driven by the error-rate metric
- [ ] A database migration tool (node-pg-migrate) run as a Job before the rollout, with an expand-and-contract example

Data:

- [ ] PgBouncer in front of PostgreSQL
- [ ] PostgreSQL primary + replica with CloudNativePG, failover, read replica for `/api/orders`
- [ ] Scheduled backups to object storage (MinIO or SeaweedFS in the cluster), and a restore drill
- [ ] A 3-node Elasticsearch cluster with several indexes, to reproduce a hot shard and a disk watermark
- [ ] A 3-broker Kafka cluster: under-replicated partitions, a broker loss, a hot partition from a skewed key
- [ ] Redis with a replica and Sentinel, a failover
- [ ] MongoDB replica set and ClickHouse, with a second small service that uses them (analytics of orders)
- [ ] The outbox pattern, so that accepting an order does not depend on Kafka

Observability:

- [ ] Loki and a log collector (Grafana Alloy), logs next to metrics in Grafana
- [ ] OpenTelemetry tracing through api, Kafka and worker, with Tempo
- [ ] Alertmanager with a webhook receiver, so alerts arrive somewhere
- [ ] SLO dashboard with an error budget and burn-rate alerts
- [ ] Dashboards for each data service (PostgreSQL, Redis, Kafka, Elasticsearch)

Security:

- [ ] NetworkPolicies: only `apps` reaches `data`
- [ ] RBAC: a read-only user and a deployer ServiceAccount
- [ ] Secrets from Vault (or OpenBao) through External Secrets Operator
- [ ] Kyverno policies: no `latest` tag, requests required, non-root
- [ ] cert-manager with a local CA, HTTPS on the ingress
- [ ] Image signing with cosign and verification at admission

Reliability and cost:

- [ ] A load test with k6 and a capacity question to answer
- [ ] Chaos experiments with Chaos Mesh (pod kill, network delay, disk fill)
- [ ] OpenCost: cost per namespace
- [ ] A second application in another language (Go or Java) to compare runtimes: memory, start-up time, behavior at the limit

Cloud:

- [ ] `infra-aws/`: the same lab on EKS with RDS, ElastiCache and MSK, in the steps listed in [The lab in a cloud](13-lab/cloud.md)
- [ ] The same for GCP (GKE, Cloud SQL, Memorystore) and Azure (AKS, Database for PostgreSQL, Event Hubs)
- [ ] Cost estimate of each, and a teardown script that leaves nothing running

Platform:

- [ ] A Windows-native way to run the lab (PowerShell script), or a dev container
- [ ] A `lab.sh doctor` command that checks the tools, memory, ports and inotify limits before `up`

## Raise to beginner (hands-on)

- [ ] Terraform: a real cloud resource, remote state, a module, `import`. This is the last Terraform item
- [ ] AWS: account setup, IAM role, VPC with public and private subnets, EC2, S3, all with the CLI
- [ ] Azure and GCP: the same small project as AWS, to compare
- [ ] CI/CD: a full pipeline (the lab's CI workflow, explained)
- [ ] PostgreSQL: roles, backup and restore, reading `EXPLAIN`, using the lab's database
- [ ] GitOps: Argo CD on the lab's cluster
- [ ] Caching and Redis, Messaging, Search, Proxies: rewrite each small example to use the lab
- [ ] Object storage: add an S3-compatible store to the lab
- [ ] Observability: instrument the lab's app with OpenTelemetry, see a trace
- [ ] Security: Vault, Trivy in CI, OIDC from CI to a cloud

## Raise to advanced (deep)

Databases first: the goal is deep understanding and maintenance.

- [ ] Internals: B-tree vs LSM in detail, WAL and crash recovery, MVCC, the query planner
- [ ] PostgreSQL: vacuum and bloat, locks, tuning, partitioning, connection pooling
- [ ] Replication: streaming and logical replication, Patroni, failover drills, sharding
- [ ] Operations: PITR with pgBackRest, zero-downtime migrations, major version upgrades
- [ ] Elasticsearch: shard sizing, tiers, lifecycle management, upgrades
- [ ] Redis: persistence, Sentinel, Cluster
- [ ] Kafka: replication, KRaft, tuning, operations
- [ ] Database health: add MySQL, ClickHouse, Cassandra
- [ ] Cloud: networking in depth (peering, transit, private endpoints), multi-account layout, IAM in depth
- [ ] Kubernetes: scheduler, networking (CNI, eBPF), operators, multi-cluster, upgrades
- [ ] Runtimes: JVM garbage collectors and tuning, Go and Node profiling
- [ ] SRE: capacity planning, load testing, disaster recovery exercises

## Make the older pages even

- [ ] Older pages (overview, intro, Linux, Docker, Kubernetes, Kafka, monitoring, Loki, Beyond relational) do not follow the page pattern yet: add a terms table, a small example and "where it goes next" where missing
- [ ] DevOps overview and DevOps intro overlap: merge into one page
- [ ] Beyond relational: add "when to use which", and move the Redis and Elasticsearch details that repeat the Services pages
- [ ] Metrics page is very short: fold it into Observability or grow it
- [ ] Prerequisites: check the steps against the current chapter layout, and add the lab's tools (Node.js, Pulumi)
- [ ] Exercise and lab overlap in purpose: say on both pages when to use which

## Pages to add

- [ ] Pulumi at intro level in chapter 4 (the lab page is the hands-on one)
- [ ] Other databases: MySQL, MongoDB, Cassandra, ClickHouse, time-series and vector databases
- [ ] Git in depth and branching models
- [ ] Build systems and artifact repositories (Maven, npm, Artifactory, Nexus)
- [ ] Service mesh (Istio, Linkerd, Cilium)
- [ ] Serverless (Lambda, Cloud Run, event-driven design)
- [ ] Data pipelines (Airflow, Spark, dbt) at intro level
- [ ] Platform engineering and internal developer platforms (Backstage)
- [ ] AI in operations: running models (GPUs, inference servers), AI coding agents in the workflow
- [ ] Windows and Active Directory basics for mixed environments
- [ ] An interview-style question list per chapter

## Done

- [x] Guide skeleton: 11 chapters, 29 pages, all at intro level (2026-11-13)
- [x] Moved to the public repo (2026-11-14)
- [x] Merged with the older hands-on guide into one guide of 12 chapters (2026-11-14)
- [x] The lab: `examples/devops-lab` (kind, Pulumi with TypeScript, shop app, PostgreSQL, Redis, Kafka, Elasticsearch, Prometheus, Grafana) and chapter 13 with four pages (2026-11-14)
- [x] The lab in a cloud: what changes on AWS, GCP and Azure (2026-11-14)
- [x] Database health: what to watch and common cases, for PostgreSQL, Elasticsearch, Redis, MongoDB and Kafka (2026-11-14)
