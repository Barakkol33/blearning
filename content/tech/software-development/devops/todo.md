---
title: TODO
lang: en
draft: true
order: 99
---

# TODO - DevOps guide

Working list for this guide. The page is a draft, so it shows in local preview and never on the published site.

**To continue the work:** say "continue the DevOps guide". Take the first open item under [Next up](#next-up), unless a specific item is named. When an item is done, tick it, move it to [Done](#done) with the date, and update the level table in the [overview](_index.md) if a page got a new level section.

## Goal

A knowledge hub (Barak, 2026-11-15): someone reads the theoretical material in the guide, and sees part of it practiced in the example, the [lab](13-lab/_index.md). Not everything can be practiced. The lab gets the more useful things first: what a DevOps engineer does or meets most often.

## Rules

- **Levels are sections inside each topic page** (Barak, 2026-11-15): `## Intro` (terms + small example), `## Beginner` (simple hands-on), `## Advanced` (deep), so a reader chooses a level per topic and per chapter. A level section exists only when it has content: no empty sections, no stubs and no "planned" notes on the page. What is planned is listed here, under [Planned per page](#planned-per-page).
- **Page pattern:** `# Title`, what it is and why you care, the line "Levels on this page" with links, the level sections, then `## See also`. Everything inside a level is `###` or deeper.
- When a page gets a new level section: add it to the "Levels on this page" line and to the page's `tags`, and link it in the table in the [overview](_index.md).
- Chapters 12 (exercise) and 13 (lab) are practice and are not divided into levels.
- **One page per database** (Barak, 2026-11-15), in chapter 7: Intro has its concepts, Advanced has its health. What is common to all systems is in `health.md`.
- **Health** in an Advanced section uses two tables: "what to watch" (signal, where, healthy, worry when) and "common cases" (what happens, how it shows, what to do), then "alert rules" when the lab has them.
- **Theory points to practice:** a page whose topic the lab practices has a section `## In the lab` before `## See also`, with links to the experiments. Add or update it whenever the lab gains something.
- **Choosing what goes into the lab:** usefulness first. Before adding a piece, ask how often an engineer meets it, and prefer that over completeness.
- **The roadmap is the coverage check** (Barak, 2026-11-15): [roadmap.md](roadmap.md) maps the roadmap.sh DevOps roadmap to the guide's pages, levels and the lab. When a page or a level is added, or the lab gains something, update its row. Choose what to write next from its gaps.
- **Examples are run before they are written.** Every command and every output on a page comes from a real run (Docker in WSL is enough for most). An example that could not be run says so on the page.
- **Practical first:** a new hands-on topic is added to the lab (`examples/devops-lab`) and gets an experiment in [Experiments](13-lab/experiments.md), in preference to a separate small example.
- **Lab code is tested before it is described.** Type-check and `pulumi preview` at least. An experiment is written up only after it was run.
- **Terraform stays at intro/beginner.** No advanced Terraform (Barak, 2026-11-14). The lab uses Pulumi with TypeScript.
- A page is never named like its folder (STRUCTURE.md). When a URL changes, add a redirect.
- The guide is public. New pages can be written here directly, or in the private repo first when they should not be public yet.

## Next up

In this order:

- [ ] **Lab on a cloud, step 1:** push the image to a registry from a GitHub Actions workflow (CI for `examples/devops-lab`: test, build, scan with Trivy, push to ghcr.io).
- [ ] **Database health, deeper:** a runbook per case with the exact commands in order, in the Advanced section of each database page. The alert rules are written and load (`infra/monitoring.ts`, listed on each page). Add an experiment that makes each remaining one fire.
- [ ] **PostgreSQL, more in Advanced:** vacuum and bloat, locks, `pg_stat_statements`, connection pooling with PgBouncer (add PgBouncer to the lab).
- [ ] **Replication in the lab:** a PostgreSQL primary and replica (CloudNativePG operator), a failover experiment, replication lag on the dashboard.
- [ ] **Kubernetes in production, a Beginner section:** point every term at where the lab uses it. Add NetworkPolicies and RBAC to the lab.

## Lab status

`examples/devops-lab`, written 2026-11-14, run in full on 2026-11-15.

Verified on a three-node kind cluster (WSL, 8 GB):

- `./lab.sh up` from nothing, `./lab.sh test` (26 checks, all pass), a release with `./lab.sh images && ./lab.sh deploy` (in-place update, no replacement).
- All 13 experiments. The text of experiments 2, 3, 4, 8, 11, 12 and 13 was corrected to what happened.
- All 19 alert rules load and evaluate without errors, and every metric they use exists. Seen firing: `ShopHighErrorRate`, `ShopOrdersLagging`, `PostgresConnectionsNearLimit`, `ElasticsearchYellow`.
- Five problems found and fixed. They are listed under Status on the [lab page](13-lab/_index.md).

Not verified yet:

- The other data alert rules were not made to fire (idle in transaction, deadlocks, dead rows, cache hit ratio, Redis evictions and rejected connections, Kafka broker, Elasticsearch heap, disk and write rejections).
- `LAB_SMALL=1` (the single-node layout), and the settings `search false` and `monitoring false`.
- The GitHub Actions workflow `.github/workflows/devops-lab.yml` with the changes of 2026-11-15.
- The Grafana dashboard was checked through its API (it loads, and its queries return data in Prometheus), not by eye.

Notes for the next run on this machine:

- WSL has 8 GB, enough for one cluster. Stop the `devops-demo` kind cluster first (`docker stop devops-demo-control-plane devops-demo-worker devops-demo-worker2`), and start it again afterwards.
- The WSL distribution shuts down when no session is open, which restarts Docker and every container. Keep a terminal open in WSL while the lab runs.
- `./lab.sh psql`, `redis`, `kafka` use `kubectl exec -it` and need a real terminal.
- The Kafka client fix in `apps/shop/src/common.js` replaces a method of kafkajs 2.2.4, which is no longer maintained. Moving to a maintained client is in the list below.

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
- [ ] The outbox pattern, so that accepting an order does not depend on Kafka (experiment 12 shows the order that gets stuck without it)
- [ ] Replace kafkajs (unmaintained, needs the fix in `common.js`) with a maintained Kafka client
- [ ] A second replica of Traefik, so a node drain does not close the door

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

## Beginner sections to write (hands-on)

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

## Advanced sections to write (deep)

Databases first: the goal is deep understanding and maintenance.

- [ ] Internals: B-tree vs LSM in detail, WAL and crash recovery, MVCC, the query planner
- [ ] PostgreSQL: vacuum and bloat, locks, tuning, partitioning, connection pooling
- [ ] Replication: streaming and logical replication, Patroni, failover drills, sharding
- [ ] Operations: PITR with pgBackRest, zero-downtime migrations, major version upgrades
- [ ] Elasticsearch: shard sizing, tiers, lifecycle management, upgrades
- [ ] Redis: persistence, Sentinel, Cluster
- [ ] Kafka: replication, KRaft, tuning, operations
- [ ] Health (what to watch, common cases) for ClickHouse, and pages for MySQL and Cassandra
- [ ] Cloud: networking in depth (peering, transit, private endpoints), multi-account layout, IAM in depth
- [ ] Kubernetes: scheduler, networking (CNI, eBPF), operators, multi-cluster, upgrades
- [ ] Runtimes: JVM garbage collectors and tuning, Go and Node profiling
- [ ] SRE: capacity planning, load testing, disaster recovery exercises

## Planned per page

What each page's missing level sections should hold. These lists were the "Where it goes next" section of each page, and were moved here when the pages were divided into levels.

- `01-get-started/linux-internals.md`
  - Beginner: systemd units and `journalctl`, reading `top`, `vmstat` and `iostat`, tracing a process with `strace`.
  - Advanced: the scheduler, memory management and the page cache, the I/O stack, eBPF, kernel tuning.
- `01-get-started/networking.md`
  - Beginner: build a small network yourself, with subnets, routing and a firewall, and capture packets with `tcpdump`.
  - Advanced: TCP in depth, HTTP/2 and HTTP/3, BGP and how cloud networks are built, Kubernetes networking.
- `02-containers/kubernetes-production.md`
  - Beginner: probes, HPA and Ingress on a kind cluster, with a load test.
  - Advanced: the scheduler, networking (CNI, eBPF), storage, writing an operator, cluster upgrades, multi-cluster.
- `03-cloud/aws.md`
  - Beginner: a VPC with public and private subnets, an instance behind a load balancer, a role instead of keys.
  - Advanced: Organizations and multi-account design, IAM evaluation logic, networking between VPCs, EKS in depth.
- `03-cloud/azure.md`
  - Beginner: a VNet with a VM and a managed identity that reads a secret from Key Vault.
  - Advanced: landing zones, Azure Policy, private endpoints, hybrid identity with on-premises Active Directory.
- `03-cloud/concepts.md`
  - Beginner: build the diagram above in one cloud, by hand and then with [Terraform](04-infrastructure-as-code/terraform.md).
  - Advanced: multi-account layout, network design across regions, identity federation, [cost](11-reliability/finops.md), multi-cloud trade-offs.
- `03-cloud/gcp.md`
  - Beginner: a Cloud Run service that reads from Cloud SQL through a service account.
  - Advanced: organization policies, Shared VPC, Workload Identity, GKE in depth, BigQuery cost control.
- `04-infrastructure-as-code/configuration.md`
  - Beginner: roles, variables and templates in Ansible, a Packer image, a Helm chart.
  - Advanced: testing infrastructure code, image pipelines, comparing Terraform, Pulumi and Crossplane on a real project.
- `04-infrastructure-as-code/terraform.md`
  - Beginner: a real cloud resource, a remote backend, a module, `terraform import`, workspaces or folders per environment.
  - Advanced: state surgery, module design, testing, policy as code, running Terraform from [CI](06-delivery/ci-cd.md), large-repo layout.
- `05-code/apis.md`
  - Beginner: write an OpenAPI file, call a gRPC service with `grpcurl`, issue and verify a JWT.
  - Advanced: API gateways, versioning, circuit breakers, service-to-service authentication with mTLS.
- `05-code/frameworks.md`
  - Beginner: add metrics, structured logs and graceful shutdown to the example, and deploy it to Kubernetes.
  - Advanced: connection pools, async versus threads under load, framework-specific tuning (Spring Boot, Django).
- `05-code/languages.md`
  - Beginner: a real CLI tool in Python and the same one in Go, packaged in a container.
  - Advanced: writing a Kubernetes operator, a Terraform provider, performance profiling.
- `05-code/runtimes.md`
  - Beginner: watch a JVM and a Go service under load, reading heap and GC metrics.
  - Advanced: garbage collectors and their tuning, profiling (flame graphs), thread dumps and heap dumps, GraalVM native images, WebAssembly.
- `06-delivery/ci-cd.md`
  - Beginner: a full pipeline for a real app, with tests, image scan, and deployment to a cluster.
  - Advanced: self-hosted runners, caching strategy, monorepo pipelines, supply-chain hardening, measuring delivery (DORA metrics).
- `06-delivery/deployment-strategies.md`
  - Beginner: a blue-green switch with two Deployments and one Service, a canary with weights at the ingress.
  - Advanced: progressive delivery with automatic analysis (Argo Rollouts, Flagger), feature-flag systems, zero-downtime [database migrations](07-databases/operations.md).
- `06-delivery/gitops.md`
  - Beginner: install Argo CD on a kind cluster and deploy an app from your own repository, with two environments.
  - Advanced: app-of-apps and ApplicationSets, secrets in GitOps (External Secrets, SOPS), promotion between environments, many clusters.
- `07-databases/internals.md`
  - Beginner: reading plans, composite and partial indexes, transactions and isolation levels in practice.
  - Advanced: B-tree and LSM internals, WAL and crash recovery in detail, MVCC and vacuum, lock analysis, the planner's statistics and cost model.
- `07-databases/operations.md`
  - Beginner: scheduled backups to object storage, a migration tool in a pipeline, a monitoring dashboard with alerts.
  - Advanced: PITR with pgBackRest or WAL-G, zero-downtime migrations on large tables, major upgrades with logical replication, capacity planning, incident playbooks.
- `07-databases/postgres.md`
  - Beginner: roles and permissions, `pg_stat_statements`, PgBouncer, basic configuration.
  - Advanced: vacuum and bloat in depth, locks, memory and checkpoint tuning, partitioning, upgrades.
- `07-databases/replication.md`
  - Beginner: a primary and a streaming replica with Docker Compose, a manual failover.
  - Advanced: synchronous replication and quorum commits, logical replication, Patroni internals, failover drills, sharding strategies, how Raft works.
- `08-services/caching.md`
  - Beginner: sessions and rate limiting with Redis, measuring the effect of a cache on a slow endpoint.
  - Advanced: persistence (RDB, AOF), replication and Sentinel, Redis Cluster, stampede protection, cache design for consistency.
- `08-services/messaging.md`
  - Beginner: exchanges and routing in RabbitMQ, a dead-letter queue, the same flow on SQS.
  - Advanced: Kafka in depth (replication, KRaft, tuning), exactly-once semantics, the outbox pattern, schema registries, running brokers in production.
- `08-services/object-storage.md`
  - Beginner: a static website from a bucket, database backups to a bucket from a scheduled job.
  - Advanced: bucket policies and encryption, cross-region replication, object lock for compliance, performance with many small objects, running your own store.
- `08-services/proxies.md`
  - Beginner: TLS with a real certificate, path-based routing, rate limiting, an Ingress on Kubernetes.
  - Advanced: Envoy and its configuration API, connection draining, HTTP/2 and gRPC balancing, global load balancing, service mesh.
- `08-services/search.md`
  - Beginner: ship container logs with Fluent Bit and explore them in Kibana, write queries and aggregations.
  - Advanced: shard sizing, hot-warm-cold tiers, cluster upgrades, performance tuning, comparing to Loki and ClickHouse for logs.
- `09-observability/concepts.md`
  - Beginner: instrument an application with OpenTelemetry, see its traces in Jaeger or Tempo, build a RED dashboard.
  - Advanced: SLO-based alerting with burn rates, cardinality and cost control, sampling strategies, running Prometheus at scale, eBPF-based observability.
- `10-security/_index.md`
  - Beginner: a Vault dev server and an application that reads a secret from it, Trivy and gitleaks in a pipeline, OIDC from GitHub Actions to a cloud.
  - Advanced: threat modeling, supply-chain hardening (SLSA, signing, admission policies), network segmentation and mTLS, incident response, compliance frameworks (SOC 2, ISO 27001).
- `11-reliability/finops.md`
  - Beginner: read a real bill, set budgets and tags, add Infracost to a Terraform pipeline.
  - Advanced: commitment strategy, spot at scale, Kubernetes cost allocation, unit economics, cost as part of architecture review.
- `11-reliability/sre.md`
  - Beginner: define SLIs and SLOs for a real service and build the dashboard, write a runbook, run a practice incident.
  - Advanced: burn-rate alerting, capacity planning and load testing, disaster-recovery exercises, chaos experiments, on-call health.

## Make the older pages even

- [ ] Older pages (Linux, Docker, Kubernetes, Kafka, monitoring, Loki) are wrapped in one level section as they were. Give each a terms table and a small example in Intro, and move the long hands-on parts to Beginner
- [ ] Redis and Elasticsearch each have two pages (the database page in chapter 7, and Caching / Search in chapter 8). Check that nothing repeats
- [ ] Metrics page is very short: fold it into Observability or grow it
- [ ] Prerequisites: check the steps against the current chapter layout, and add the lab's tools (Node.js, Pulumi)
- [ ] Exercise and lab overlap in purpose: say on both pages when to use which

## Pages to add

- [ ] Pulumi at intro level in chapter 4 (the lab page is the hands-on one)
- [ ] Other databases, a page each: MySQL, Cassandra, time-series and vector databases
- [ ] Git, a Beginner section: rebase, conflicts, recovering with `reflog`, hooks, a protected branch with required checks
- [ ] Build systems (Maven, Gradle, npm) at intro level. Artifacts, a Beginner section: Artifactory or Nexus in a container with a remote repository in front of Docker Hub and npmjs, promotion between repositories, a retention policy
- [ ] Service mesh, a Beginner section: Linkerd on the lab's cluster, mTLS and a traffic split that were really run (the example on the page was not)
- [ ] Serverless, a Beginner section: a function behind a queue in a real account, with its IAM role, deployed from code
- [ ] Secret management as its own page in chapter 10 (Vault or OpenBao, SOPS, External Secrets), with a hands-on example. It turns Security into a chapter of two pages, so `_index.md` content moves to its own page with a redirect
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
- [x] Alert rules for the data layer in the lab (PostgreSQL, Redis, Kafka, Elasticsearch): they load and their metrics exist. Most were not yet made to fire (2026-11-15)
- [x] Every topic page divided into level sections (Intro, Beginner, Advanced), and the overview table links to each level (2026-11-15)
- [x] One page per database: PostgreSQL, Elasticsearch, Redis, MongoDB, ClickHouse. Database health keeps what is common, Kafka's health moved to the Kafka page, "Beyond relational" removed with a redirect (2026-11-15)
- [x] The lab run end to end on a kind cluster: smoke test, all 13 experiments, a release. Five problems found and fixed, experiment text corrected (2026-11-15)
- [x] "In the lab" sections on the theory pages that the lab practices, and the hub goal written into the rules (2026-11-15)
- [x] Roadmap page: the roadmap.sh DevOps roadmap mapped to the guide's pages, levels and the lab, with what is not covered (2026-11-15)
- [x] New pages from the roadmap's gaps: Git and code hosting, Artifacts and registries, Serverless, Service mesh (2026-11-15)
- [x] Elasticsearch, Redis, MongoDB and ClickHouse: Intro sections rewritten with a terms table, "what is different" and an example that was run (2026-11-15)
- [x] "DevOps overview" and "DevOps intro" merged into one page, "What is DevOps", in the page pattern, with the DORA metrics. The GitLab CI example moved to CI/CD, the SOPS note to Security (2026-11-15)
