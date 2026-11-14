---
title: TODO
lang: en
draft: true
order: 99
---

# TODO - DevOps advanced guide

Working list for this guide. The page is a draft, so it shows in local preview and never on the published site.

## Rules

- Levels: intro (terms + small example), beginner (simple hands-on), advanced (deep). The list of pages and levels is in the [overview](_index.md).
- When a page moves up a level: update the table in the overview, the level line on the page and its `tags`.
- The guide is public. New pages can be written here directly, or in the private repo first when they should not be public yet.

## Done

- [x] Guide skeleton: 11 chapters, 29 pages, all at intro level (2026-11-13)
- [x] Moved to the public repo (2026-11-14)

## Next: raise to beginner (hands-on)

Suggested order, most useful first:

- [ ] Terraform: a real cloud resource, remote state, a module, `import`
- [ ] AWS: account setup, IAM role, VPC with public and private subnets, EC2, S3, all with the CLI
- [ ] CI/CD: a full pipeline for the guestbook app from the DevOps guide exercise (test, image, deploy)
- [ ] PostgreSQL: install, roles, backup and restore, reading `EXPLAIN`
- [ ] Kubernetes in production: probes, requests and limits, HPA, Ingress on a kind cluster
- [ ] GitOps: Argo CD on kind, deploying the guestbook from Git
- [ ] Azure and GCP: the same small project as AWS, to compare
- [ ] Caching and Redis, Messaging (RabbitMQ), Search, Object storage, Proxies (nginx)
- [ ] Observability: instrument an app with OpenTelemetry, see a trace
- [ ] Security: Vault dev server, Trivy in CI, OIDC from CI to a cloud

## Later: raise to advanced (deep)

- [ ] Databases first (the goal is deep understanding and maintenance):
  - [ ] Internals: B-tree vs LSM in detail, WAL and crash recovery, MVCC, the query planner
  - [ ] PostgreSQL: vacuum and bloat, locks, tuning, `pg_stat_statements`, partitioning, connection pooling
  - [ ] Replication: streaming and logical replication, Patroni, failover drills, sharding
  - [ ] Operations: PITR with pgBackRest, zero-downtime migrations, major version upgrades
- [ ] Cloud: networking in depth (peering, transit, private endpoints), multi-account layout, IAM in depth
- [ ] Terraform: state internals, module design, testing, policy as code, large-repo layout
- [ ] Kubernetes: scheduler, networking (CNI, eBPF), operators, multi-cluster, upgrades
- [ ] Kafka in depth (the DevOps guide has the intro): replication, KRaft, tuning, operations
- [ ] Runtimes: JVM garbage collectors and tuning, Go and Node profiling
- [ ] SRE: capacity planning, load testing, disaster recovery exercises

## Pages to add

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

## Open questions

- [ ] Merge with the existing DevOps guide later, or keep two guides (hands-on and advanced)?
