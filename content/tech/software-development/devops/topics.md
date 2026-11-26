---
title: Topics to know
sidebar:
  label: Topics to know
order: 1
lang: en
updated: 2026-11-25
---

# Topics to know

Everything a DevOps engineer is expected to know beyond the basics, on one page: 598 topics and technologies from the Advanced sections of the guide, chapter by chapter. Each line is a name to search for, and what it is in a few words.

Use it as a map. Read down a chapter to see what belongs to it, mark what you have never heard of, and look it up. The heading of each page links to its Advanced section, where the list also appears. The basics (the Intro and Beginner levels) are in the pages themselves, and the [roadmap](roadmap.md) shows how the guide follows the industry's list of DevOps topics.

Terraform is the exception: the guide keeps it at the intro and beginner levels, so it has no list here.

## The chapters

What each chapter is about, before its list of topics:

| # | Chapter | What it is about |
|---|---|---|
| 1 | [Get started](#1-get-started) | What DevOps is and the ground under everything else: Linux and the shell, how the kernel runs processes, networking (IP, DNS, TLS, SSH) |
| 2 | [Containers](#2-containers) | Packaging an application with everything it needs (Docker) and running many of them on a cluster (Kubernetes), up to production concerns |
| 3 | [Cloud](#3-cloud) | Renting infrastructure: the shared concepts (accounts, IAM, networks, regions), the three big providers, and serverless |
| 4 | [Infrastructure as code](#4-infrastructure-as-code) | Describing servers, networks and configuration in files that are reviewed and applied by tools, not by hand |
| 5 | [Code](#5-code) | The software being operated: languages, runtimes, frameworks and APIs, and how each behaves in production |
| 6 | [Delivery](#6-delivery) | The path from a commit to production: Git, CI/CD pipelines, artifacts and registries, deployment strategies, GitOps |
| 7 | [Databases](#7-databases) | How databases work inside, replication, backups and upgrades, and a page per common database with what to watch |
| 8 | [Services](#8-services) | The backing services around an application: queues and Kafka, caches, search, object storage, proxies, the service mesh |
| 9 | [Observability](#9-observability) | Knowing what a system is doing: metrics, logs, traces and alerts, with Prometheus, Loki and Grafana |
| 10 | [Security](#10-security) | Security in the daily work: secrets, scanning and the supply chain, and how users and services authenticate |
| 11 | [Reliability](#11-reliability) | Keeping the system up and affordable: SLOs, incidents and on-call (SRE), and cost (FinOps) |

Chapters 12 (the exercise) and 13 (the lab) are practice, so they have no topics here.

## 1. Get started

### [What is DevOps](01-get-started/intro.md#advanced)

- **DORA metrics**: deployment frequency, lead time for changes, change failure rate, time to restore; how delivery is measured
- **Accelerate and the State of DevOps reports**: the research behind the DORA metrics
- **Platform engineering**: a team that builds an internal platform so product teams can ship by themselves
- **Internal developer platform (IDP) and Backstage**: a self-service portal of services, templates and docs
- **Golden paths**: the supported, paved way to build and run a service
- **Team Topologies**: stream-aligned, platform, enabling and complicated-subsystem teams, and how they interact
- **Value stream mapping**: drawing every step from idea to production to find where time is lost
- **Toil**: manual, repetitive operational work that automation should remove
- **Blameless postmortems**: learning from incidents without looking for someone to blame
- **Conway's law**: systems mirror the communication structure of the organization that builds them
- **Developer experience (DevEx) and the SPACE framework**: measuring how productive and satisfied engineers are
- **DevSecOps and shift left**: security checks moved into the daily work of developers

### [Linux and the command line](01-get-started/linux.md#advanced)

- **Advanced bash**: `set -euo pipefail`, arrays, parameter expansion, `trap`, here-docs, subshells
- **ShellCheck**: a linter that finds the common bugs in shell scripts
- **awk and sed in depth**: field processing and stream editing for one-line reports
- **jq and yq**: querying and editing JSON and YAML on the command line
- **find, xargs and GNU parallel**: running a command over many files or inputs, in parallel
- **Package management**: apt, dnf, apk; repositories, pinning versions, unattended upgrades
- **Users, sudo and sudoers**: privilege rules, least privilege for operators
- **ACLs, setuid and capabilities**: permissions beyond user/group/other
- **SSH hardening**: keys only, no root login, `AllowUsers`, fail2ban, bastion hosts
- **tmux**: sessions that survive a dropped SSH connection
- **cron and systemd timers**: scheduled jobs, and why timers are easier to monitor
- **Filesystems, LVM and RAID**: ext4 and XFS, resizing volumes, mount options, `/etc/fstab`
- **Logs: journald and rsyslog**: `journalctl` filters, log rotation with logrotate

### [Linux internals](01-get-started/linux-internals.md#advanced)

- **The boot process**: firmware, bootloader (GRUB), kernel, initramfs, systemd targets
- **System calls**: the interface between programs and the kernel, traced with `strace`
- **Process states and signals**: R, S, D, Z; zombies, orphans, SIGTERM vs SIGKILL
- **Virtual memory**: pages, page cache, swap, overcommit, the OOM killer and `oom_score_adj`
- **Namespaces**: pid, net, mnt, uts, ipc, user, cgroup: the isolation behind containers
- **cgroups v2**: CPU, memory and IO limits; CPU throttling and the CFS quota
- **The CPU scheduler**: CFS/EEVDF, nice values, load average and what it really counts
- **I/O and disks**: IO schedulers, `iostat`, `iotop`, IO wait
- **File descriptors and limits**: `ulimit`, `/proc/<pid>/fd`, `fs.file-max`
- **The /proc and /sys filesystems**: the kernel's state, readable as files
- **Kernel tuning with sysctl**: network buffers, `somaxconn`, `vm.swappiness`, conntrack table size
- **perf and flame graphs**: finding where CPU time goes
- **eBPF and bpftrace**: safe programs inside the kernel for tracing and networking
- **USE method**: utilization, saturation and errors for every resource, by Brendan Gregg
- **SELinux and AppArmor**: mandatory access control
- **Kernel modules**: `lsmod`, `modprobe`, and what loads at boot

### [Networking](01-get-started/networking.md#advanced)

- **The TCP handshake and states**: SYN, ACK, FIN, TIME_WAIT, retransmits, window size
- **Subnets and CIDR**: address ranges, private ranges, planning non-overlapping networks
- **Routing**: route tables, default gateway, BGP between networks and in data centers
- **NAT**: SNAT, DNAT, port exhaustion on NAT gateways
- **iptables and nftables**: the kernel's packet filter; how Docker and Kubernetes use it
- **Conntrack**: the connection tracking table and what happens when it is full
- **MTU and fragmentation**: why VPNs and overlays break large packets, MSS clamping
- **VLANs and overlay networks**: VXLAN, Geneve; how container networks span hosts
- **Load balancing: L4 vs L7**: connection-level vs request-level balancing
- **Anycast and CDNs**: one address served from many places
- **DNS in depth**: recursive vs authoritative, TTL and caching, split-horizon, DNSSEC
- **TLS in depth**: the TLS 1.3 handshake, SNI, ALPN, mTLS, certificate chains, OCSP
- **HTTP/2 and HTTP/3 (QUIC)**: multiplexing, head-of-line blocking, UDP transport
- **VPNs: WireGuard and IPsec**: connecting networks and people securely
- **tcpdump and Wireshark**: capturing and reading packets
- **Network performance**: latency vs bandwidth, bandwidth-delay product, `iperf3`, `mtr`

## 2. Containers

### [Docker](02-containers/docker.md#advanced)

- **OCI image and runtime specs**: the open standards behind images and containers
- **containerd and runc**: the layers under Docker that actually run containers
- **Image layers and OverlayFS**: how layers are stored and combined, copy-on-write
- **BuildKit and buildx**: parallel builds, cache mounts, secrets at build time, multi-platform images
- **Distroless and scratch images**: images without a shell or a package manager
- **Rootless containers and user namespaces**: running containers without root on the host
- **Seccomp, capabilities and AppArmor profiles**: limiting what a container can ask of the kernel
- **Podman and Buildah**: daemonless alternatives to Docker
- **Container networking**: bridge, host and macvlan networks, port publishing, embedded DNS
- **Storage drivers and volume plugins**: where container data lives
- **Image scanning and SBOMs**: Trivy, Grype, Syft
- **Signing images**: cosign and Sigstore
- **Logging drivers**: json-file, journald, and log rotation
- **Resource limits**: `--memory`, `--cpus`, and the cgroups underneath

### [Kubernetes](02-containers/kubernetes.md#advanced)

- **The control plane in depth**: API server, etcd, scheduler, controller manager; the reconcile loop
- **etcd**: backup, restore, compaction and quorum
- **Scheduling**: requests, affinity and anti-affinity, taints and tolerations, topology spread
- **QoS classes and eviction**: Guaranteed, Burstable, BestEffort; what the kubelet kills first
- **Probes**: liveness, readiness and startup probes, and how they go wrong
- **CNI plugins**: Calico, Cilium, Flannel: how pods get addresses and talk
- **kube-proxy modes**: iptables, IPVS, and eBPF replacement
- **CoreDNS**: service discovery inside the cluster, `ndots`
- **Storage: CSI, PersistentVolumes, StorageClasses**: dynamic provisioning, access modes, volume snapshots
- **Gateway API**: the successor of Ingress
- **Custom resources and operators**: CRDs and controllers that extend Kubernetes
- **Admission controllers and webhooks**: validating and mutating objects on the way in
- **Kustomize**: overlays for YAML, built into kubectl
- **Helm in depth**: hooks, dependencies, library charts, OCI chart registries
- **Debugging**: `kubectl debug`, ephemeral containers, events, `CrashLoopBackOff`, `ImagePullBackOff`

### [Kubernetes in production](02-containers/kubernetes-production.md#advanced)

- **Managed Kubernetes**: EKS, AKS, GKE: what the cloud runs and what you still run
- **Cluster upgrades**: version skew policy, node pool rotation, deprecated APIs
- **Autoscaling**: HPA, VPA, Cluster Autoscaler, Karpenter, KEDA
- **PodDisruptionBudgets**: keeping enough replicas during drains and upgrades
- **RBAC**: Roles, ClusterRoles, ServiceAccounts, least privilege
- **NetworkPolicies**: default deny, allowing only the traffic you need
- **Pod Security Standards**: privileged, baseline and restricted profiles
- **Policy engines**: Kyverno and OPA Gatekeeper
- **Secrets in production**: External Secrets Operator, Sealed Secrets, encryption at rest
- **cert-manager**: automatic TLS certificates from Let's Encrypt or an internal CA
- **ExternalDNS**: DNS records created from Services and Ingresses
- **Multi-tenancy**: namespaces, quotas and LimitRanges, vCluster
- **Backup and restore**: Velero, etcd snapshots
- **Multi-cluster**: fleet management, Cluster API, cluster per environment or region
- **Cost and right-sizing**: requests vs real usage, bin packing, spot nodes
- **Hardening**: CIS Kubernetes Benchmark, kube-bench, audit logs

## 3. Cloud

### [Cloud concepts](03-cloud/concepts.md#advanced)

- **The Well-Architected Framework**: the pillars: operations, security, reliability, performance, cost, sustainability
- **Shared responsibility model**: what the provider secures and what you do
- **Regions, availability zones and edge locations**: designing for the failure of a zone or a region
- **Landing zones**: a prepared multi-account setup: organizations, guardrails, networking
- **Identity federation and SSO**: logging in with the company identity, no long-lived keys
- **Workload identity**: machines and pipelines getting short-lived credentials (OIDC)
- **Network design**: hub and spoke, transit gateways, peering, private endpoints
- **Hybrid connectivity**: site-to-site VPN, Direct Connect, ExpressRoute, Interconnect
- **Disaster recovery strategies**: backup and restore, pilot light, warm standby, active-active; RPO and RTO
- **Multi-cloud and cloud-agnostic design**: when it is worth it and what it costs
- **Quotas and service limits**: the ceilings you hit at scale
- **Tagging strategy**: ownership, environment and cost center on every resource
- **The 6 Rs of migration**: rehost, replatform, refactor, repurchase, retire, retain

### [AWS](03-cloud/aws.md#advanced)

- **AWS Organizations and Control Tower**: many accounts, guardrails, service control policies (SCPs)
- **IAM in depth**: policies, roles, trust policies, permission boundaries, IAM Identity Center
- **VPC in depth**: subnets, route tables, NAT gateways, security groups vs NACLs, VPC endpoints, Transit Gateway
- **EC2**: instance families, Auto Scaling groups, launch templates, spot instances
- **Elastic Load Balancing**: ALB, NLB, target groups, health checks
- **EKS and ECS**: containers on AWS, Fargate, IRSA and Pod Identity
- **S3 in depth**: storage classes, lifecycle rules, versioning, bucket policies, replication
- **RDS and Aurora**: managed databases, Multi-AZ, read replicas, snapshots
- **DynamoDB**: partition keys, capacity modes, hot partitions
- **Route 53**: DNS, health checks, routing policies
- **CloudFront**: the CDN in front of S3 and applications
- **CloudWatch and CloudTrail**: metrics, logs and alarms; the audit log of every API call
- **KMS and Secrets Manager**: encryption keys and secret storage
- **Cost tools**: Cost Explorer, Budgets, Savings Plans, Reserved Instances
- **CloudFormation and CDK**: AWS's own infrastructure as code

### [Azure](03-cloud/azure.md#advanced)

- **Microsoft Entra ID**: the identity platform, formerly Azure AD; managed identities
- **Management groups, subscriptions and Azure Policy**: governance over many subscriptions
- **Azure RBAC**: role assignments at each scope
- **VNets**: subnets, NSGs, VNet peering, hub and spoke, Private Link
- **Azure Load Balancer, Application Gateway and Front Door**: L4, L7 and global entry points
- **AKS**: Azure's Kubernetes, workload identity, node pools
- **Virtual Machine Scale Sets**: groups of VMs that scale together
- **Storage accounts**: Blob, Files, Queues, redundancy options (LRS, ZRS, GRS)
- **Azure SQL and Cosmos DB**: managed relational and globally distributed databases
- **Key Vault**: keys, secrets and certificates
- **Azure Monitor and Log Analytics**: metrics, logs and KQL queries
- **Bicep and ARM templates**: Azure's own infrastructure as code
- **Azure DevOps**: Boards, Repos, Pipelines, Artifacts
- **Cost Management and reservations**: budgets, Azure Hybrid Benefit

### [GCP](03-cloud/gcp.md#advanced)

- **Resource hierarchy**: organization, folders, projects; organization policies
- **IAM and service accounts**: roles, workload identity federation, impersonation
- **VPC**: global VPCs, Shared VPC, firewall rules, Private Service Connect, Cloud NAT
- **Cloud Load Balancing**: the global external load balancer, backend services, Cloud Armor
- **GKE**: Autopilot vs Standard, node pools, Workload Identity
- **Cloud Run**: containers without servers, concurrency, min instances
- **Compute Engine**: machine types, managed instance groups, preemptible and spot VMs
- **Cloud Storage**: storage classes, lifecycle, signed URLs
- **Cloud SQL, Spanner and Firestore**: managed relational, global relational and document databases
- **BigQuery**: the serverless data warehouse, cost per query
- **Pub/Sub**: managed messaging
- **Cloud Logging and Cloud Monitoring**: the operations suite
- **Secret Manager and Cloud KMS**: secrets and keys
- **Cloud Build and Artifact Registry**: builds and images on GCP

### [Serverless](03-cloud/serverless.md#advanced)

- **Cold starts**: what makes them slow, provisioned concurrency, SnapStart
- **Concurrency limits and throttling**: account and function limits, reserved concurrency
- **Event sources**: queues, streams, object events, schedules, API gateways
- **Retries, dead-letter queues and idempotency**: what happens when an invocation fails
- **Step Functions and workflows**: orchestrating several functions, Durable Functions on Azure
- **Event-driven architecture**: EventBridge, Event Grid, Eventarc
- **API Gateway**: routes, authorizers, throttling, usage plans
- **Function URLs and Lambda layers**: simple endpoints and shared code
- **Serverless containers**: Cloud Run, Fargate, Azure Container Apps
- **Knative and OpenFaaS**: serverless on your own Kubernetes
- **Edge functions**: Cloudflare Workers, Lambda@Edge
- **Frameworks**: AWS SAM, Serverless Framework, SST
- **Observability for functions**: structured logs, X-Ray and OpenTelemetry, per-invocation cost
- **Cost model**: pay per request and duration, and when a server becomes cheaper

## 4. Infrastructure as code

### [Configuration and images](04-infrastructure-as-code/configuration.md#advanced)

- **Ansible in depth**: roles, collections, Galaxy, handlers, Jinja2 templates, facts
- **Inventories**: static and dynamic inventories from a cloud
- **Ansible Vault**: encrypted variables in the repository
- **Idempotency and check mode**: `--check`, `--diff`, running a playbook twice safely
- **Testing roles**: Molecule, ansible-lint
- **AWX and Ansible Automation Platform**: running playbooks from a central service
- **Chef, Puppet and Salt**: agent-based configuration management, still common in older estates
- **Packer**: building machine images from code
- **Golden images and immutable infrastructure**: replacing servers instead of changing them
- **cloud-init**: configuring a VM on its first boot
- **Configuration drift**: detecting and correcting servers that changed by hand
- **NixOS and declarative systems**: a whole operating system described in code

## 5. Code

### [Languages](05-code/languages.md#advanced)

- **Go for tooling**: static binaries, the language of Kubernetes, Docker and Terraform
- **Python for automation**: virtual environments, uv and pip, packaging scripts as tools
- **Bash vs Python**: when a script should stop being a shell script
- **Dependency management and lock files**: reproducible installs in every ecosystem
- **Semantic versioning**: what a major, minor and patch version promise
- **Build tools**: Make, Gradle and Maven, npm scripts, Bazel
- **Monorepos**: Nx, Turborepo, Bazel; building only what changed
- **Static analysis and linting**: linters, formatters, SonarQube
- **Testing pyramid**: unit, integration, end-to-end and contract tests
- **YAML, JSON and HCL pitfalls**: the languages of configuration, and their traps
- **Templating vs real languages for infrastructure**: Jinja, Helm templates, CUE, Jsonnet vs Pulumi and CDK
- **Reading stack traces**: finding the cause in Java, Python, Node.js and Go errors

### [Runtimes and engines](05-code/runtimes.md#advanced)

- **JVM tuning**: heap sizing, G1 and ZGC, GC logs, container awareness, `MaxRAMPercentage`
- **Thread dumps and heap dumps**: `jstack`, `jcmd`, finding deadlocks and leaks
- **Node.js event loop**: blocking the loop, `--max-old-space-size`, worker threads
- **Python: the GIL and process models**: gunicorn and uvicorn workers, asyncio
- **Go runtime**: goroutines, `GOMAXPROCS` in containers, `GOMEMLIMIT`, pprof
- **.NET runtime**: server GC, container limits, `dotnet-counters`, `dotnet-trace`
- **Garbage collection**: pauses, generations, why memory grows before it drops
- **Memory leaks**: how a leak shows on a dashboard, and how to find it
- **Profiling in production**: continuous profiling with Pyroscope or Parca
- **Connection pools**: database and HTTP pools, sizing them per instance
- **Graceful shutdown**: handling SIGTERM, draining requests, `preStop` hooks
- **WebAssembly on the server**: Wasm runtimes like Wasmtime and Spin

### [Frameworks](05-code/frameworks.md#advanced)

- **The twelve-factor app**: config in the environment, stateless processes, logs as streams
- **Health endpoints**: liveness vs readiness, Spring Boot Actuator, what a check should test
- **Configuration and feature flags**: OpenFeature, LaunchDarkly, Unleash
- **Structured logging**: JSON logs with request IDs
- **Metrics and tracing in frameworks**: Micrometer, OpenTelemetry auto-instrumentation
- **Database migrations**: Flyway, Liquibase, Alembic, run once per release
- **ORMs and the N+1 problem**: how one page becomes a thousand queries
- **Background jobs**: Celery, Sidekiq, BullMQ; workers separate from the web process
- **Application servers**: gunicorn, uvicorn, Puma, Tomcat; workers and threads
- **Resilience libraries**: Resilience4j, Polly; retries, timeouts, circuit breakers
- **Dapr**: a sidecar that gives any framework state, pub/sub and secrets
- **Microservices vs a modular monolith**: what each costs to operate

### [APIs](05-code/apis.md#advanced)

- **OpenAPI**: describing an HTTP API, generating clients and docs
- **gRPC and Protocol Buffers**: fast typed calls between services, and their load-balancing quirks
- **GraphQL**: one endpoint, queries chosen by the client, and the cost of that
- **Webhooks**: calls back to you, signatures and retries
- **WebSockets and server-sent events**: long-lived connections and what they do to proxies
- **API versioning**: URL vs header versions, deprecating old versions
- **Authentication**: OAuth 2.0, OpenID Connect, JWT, API keys
- **Rate limiting**: token bucket, 429 and `Retry-After`
- **Idempotency keys**: making retries of POST safe
- **Pagination**: offset vs cursor
- **API gateways**: Kong, Apigee, AWS API Gateway
- **Contract testing**: Pact, schema checks in CI
- **AsyncAPI**: describing event-driven APIs

## 6. Delivery

### [Git and code hosting](06-delivery/git.md#advanced)

- **Git internals**: objects (blobs, trees, commits), refs, the index, packfiles
- **Branching strategies**: trunk-based development, GitHub flow, GitFlow
- **Merge vs rebase vs squash**: what each does to history
- **Interactive rebase, cherry-pick and bisect**: editing history and finding the commit that broke something
- **Monorepo vs polyrepo**: and sparse checkout, partial clone
- **Git LFS**: large files outside the repository
- **Submodules and subtrees**: repositories inside repositories
- **Signed commits**: GPG, SSH and gitsign signatures
- **Secret scanning**: gitleaks, trufflehog, push protection; removing a leaked secret from history
- **CODEOWNERS and branch protection rules**: who must review what
- **Conventional commits**: commit messages that generate changelogs and versions
- **Pre-commit hooks**: the pre-commit framework, formatting and checks before a commit
- **Code review practice**: small pull requests, review checklists

### [CI/CD](06-delivery/ci-cd.md#advanced)

- **Pipeline as code**: GitHub Actions, GitLab CI, Jenkins pipelines, Azure Pipelines
- **Runners**: hosted vs self-hosted, ephemeral runners on Kubernetes (Actions Runner Controller)
- **Caching and artifacts between jobs**: dependency caches, build caches, Docker layer cache
- **Matrix builds**: one job over many versions and platforms
- **Reusable workflows and templates**: shared pipeline code across repositories
- **OIDC to clouds**: deploying without stored cloud keys
- **Secrets in pipelines**: masked variables, environments, approvals
- **Test strategy in CI**: fast feedback, parallel tests, flaky tests and quarantine
- **Merge queues**: testing the merged result before it lands
- **Supply chain security**: SLSA levels, provenance, SBOMs, pinning actions by digest
- **Release automation**: semantic-release, release-please, changelogs
- **Preview environments**: an environment per pull request
- **Pipeline metrics**: duration, queue time, failure rate, DORA metrics from CI
- **Other tools**: Tekton, Argo Workflows, Buildkite, CircleCI, Dagger

### [Artifacts and registries](06-delivery/artifacts.md#advanced)

- **Repository managers**: JFrog Artifactory, Sonatype Nexus, Harbor
- **Local, remote and virtual repositories**: your packages, proxies of public ones, one URL for both
- **Artifact promotion**: moving the same build from dev to staging to production
- **Immutable tags and digests**: why production deploys by digest
- **Retention and cleanup policies**: keeping storage under control
- **Package formats**: OCI, Helm, npm, PyPI, Maven, Go modules, Debian and RPM
- **OCI artifacts and ORAS**: storing charts, SBOMs and signatures in a container registry
- **Dependency confusion and typosquatting**: attacks through package names
- **Vulnerability scanning of artifacts**: Xray, Trivy, Grype
- **SBOMs**: SPDX and CycloneDX, what is inside every artifact
- **Signing and attestations**: cosign, in-toto, Notary
- **Replication and air-gapped registries**: registries in several regions, or without internet
- **Build info and traceability**: from an artifact back to its commit and pipeline

### [Deployment strategies](06-delivery/deployment-strategies.md#advanced)

- **Rolling updates in depth**: `maxSurge`, `maxUnavailable`, readiness gates
- **Blue-green deployments**: two environments and a switch, the cost of double capacity
- **Canary releases**: a small share of traffic first, automated analysis
- **Progressive delivery tools**: Argo Rollouts, Flagger
- **Feature flags**: deploy is not release; dark launches
- **A/B testing**: experiments on users vs safety rollouts
- **Shadow traffic**: copying real requests to a new version
- **Rollback vs roll forward**: and why database changes make rollback hard
- **Expand and contract migrations**: schema changes that work with the old and the new version
- **Zero-downtime deploys**: connection draining, graceful shutdown, `preStop`
- **Deployment windows and change freezes**: and why small frequent deploys are safer
- **Automated rollback on SLOs**: rolling back when error rate or latency rises

### [GitOps](06-delivery/gitops.md#advanced)

- **Argo CD**: applications, sync policies, sync waves and hooks, ApplicationSets
- **Flux**: sources, Kustomizations, HelmReleases, image automation
- **Pull vs push deployment**: why the cluster pulling from Git is safer
- **Repository layout**: app repo vs config repo, a folder or branch per environment
- **Environment promotion**: promoting a version through Git: Kargo, pull requests
- **Drift detection and self-heal**: reverting changes made by hand
- **Secrets in GitOps**: Sealed Secrets, SOPS, External Secrets
- **App of apps**: one application that creates the others
- **Multi-cluster GitOps**: one Argo CD for many clusters, or one per cluster
- **Image updaters**: Argo CD Image Updater, Flux image automation
- **Rendered manifests pattern**: committing the final YAML, not only the templates
- **OpenGitOps principles**: declarative, versioned, pulled, continuously reconciled

## 7. Databases

### [How databases work](07-databases/internals.md#advanced)

- **B-trees and LSM trees**: the two families of storage engines and their trade-offs
- **Write-ahead log (WAL)**: durability, crash recovery, `fsync`
- **Pages and the buffer pool**: why the working set should fit in memory
- **Indexes in depth**: composite indexes, covering indexes, partial indexes, index selectivity
- **Query planner**: `EXPLAIN ANALYZE`, statistics, why the planner picks a bad plan
- **Transactions and ACID**: atomicity, consistency, isolation, durability
- **Isolation levels and anomalies**: read committed, repeatable read, serializable; dirty and phantom reads
- **MVCC**: readers do not block writers, and the dead rows it leaves
- **Locks and deadlocks**: row and table locks, lock waits
- **Compaction**: how LSM engines merge files in the background
- **Row vs column storage**: OLTP vs OLAP
- **Normalization and denormalization**: when duplicating data is right

### [Replication and scaling](07-databases/replication.md#advanced)

- **Synchronous vs asynchronous replication**: durability vs latency
- **Replication lag**: reading your own writes, monotonic reads
- **Failover and leader election**: Patroni, orchestrators, fencing and split brain
- **Consensus**: Raft and Paxos, quorums
- **The CAP theorem and PACELC**: what a distributed database can promise
- **Consistency models**: strong, eventual, causal consistency
- **Sharding**: hash vs range sharding, resharding, hot shards
- **Consistent hashing**: spreading keys so that adding a node moves little
- **Multi-leader and leaderless replication**: conflicts, last-write-wins, CRDTs
- **Read replicas and connection routing**: sending reads away from the primary
- **Distributed SQL**: CockroachDB, YugabyteDB, Spanner, Vitess
- **Cross-region replication**: latency, disaster recovery, data residency

### [Operating a database](07-databases/operations.md#advanced)

- **Backup types**: logical vs physical, full, incremental, continuous archiving
- **Point-in-time recovery (PITR)**: restoring to any second, with base backups and WAL
- **Backup tools**: pgBackRest, WAL-G, Barman, Percona XtraBackup
- **Restore drills**: a backup is real only after a tested restore
- **RPO and RTO**: how much data and how much time you can lose
- **Schema migrations**: Flyway, Liquibase, online schema change tools (gh-ost, pt-online-schema-change)
- **Major version upgrades**: `pg_upgrade`, logical replication upgrades, blue-green databases
- **Connection pooling**: PgBouncer, ProxySQL, RDS Proxy
- **Databases on Kubernetes**: operators: CloudNativePG, Zalando, Percona, Strimzi
- **Managed databases**: RDS, Cloud SQL, Azure Database: what you still own
- **Capacity planning**: storage growth, IOPS, connections
- **Data retention and archiving**: partitioning and dropping old data
- **Encryption and access**: TLS, encryption at rest, roles, auditing

### [Database health: the questions for every data system](07-databases/health.md#advanced)

- **The four golden signals for a database**: latency, traffic, errors, saturation
- **Exporters**: postgres_exporter, redis_exporter, mongodb_exporter, kafka-exporter
- **Slow query logs**: finding the queries that cost the most
- **Saturation signals**: connections, CPU, IO wait, memory, disk
- **Replication health**: lag, broken replicas, WAL or binlog piling up
- **Runbooks**: a written procedure for each alert
- **Capacity trends**: predicting when the disk fills (`predict_linear`)
- **Incident response for data systems**: stop the bleeding, protect the data, then find the cause

### [PostgreSQL](07-databases/postgres.md#advanced)

- **VACUUM, autovacuum and bloat**: dead rows, tuning autovacuum, pg_repack
- **Transaction ID wraparound**: the freeze that can stop a database
- **pg_stat_statements**: the most expensive queries
- **EXPLAIN ANALYZE and auto_explain**: reading query plans
- **Index types**: B-tree, GIN, GiST, BRIN, partial and expression indexes
- **Locks**: `pg_locks`, lock queues behind an `ALTER TABLE`, `lock_timeout`
- **Connection pooling with PgBouncer**: transaction vs session pooling
- **Memory settings**: `shared_buffers`, `work_mem`, `effective_cache_size`
- **Checkpoints and WAL tuning**: `max_wal_size`, checkpoint spikes
- **Streaming and logical replication**: replicas, replication slots, publications
- **High availability**: Patroni, CloudNativePG, repmgr
- **Partitioning**: declarative partitioning by time or key
- **Extensions**: PostGIS, pgvector, TimescaleDB, Citus
- **Backups**: pgBackRest, WAL-G, `pg_dump`

### [Elasticsearch](07-databases/elasticsearch.md#advanced)

- **Shards and replicas**: sizing, allocation, rebalancing
- **Mappings and analyzers**: text vs keyword, tokenizers, dynamic mapping
- **Index lifecycle management (ILM)**: hot, warm, cold and delete phases, rollover
- **Data streams and index templates**: time-series indexes done right
- **Snapshots and restore**: snapshot repositories on object storage
- **Node roles**: master, data, ingest, coordinating; dedicated masters
- **JVM heap and circuit breakers**: heap at half the memory, under about 31 GB
- **Query performance**: the profile API, slow logs, filters vs queries
- **Relevance scoring**: BM25, boosting
- **Cross-cluster replication and search**: several clusters as one
- **Security**: users, roles, TLS between nodes, API keys
- **OpenSearch**: the open source fork, and how it differs
- **ECK**: Elastic Cloud on Kubernetes, the operator

### [Redis](07-databases/redis.md#advanced)

- **Persistence: RDB and AOF**: snapshots, the append-only file, fsync policies
- **Eviction policies**: `maxmemory`, LRU and LFU, `noeviction`
- **Replication and Sentinel**: automatic failover
- **Redis Cluster**: hash slots, resharding, multi-key commands
- **Data types**: strings, hashes, lists, sets, sorted sets, streams, HyperLogLog
- **Big keys and hot keys**: finding them with `--bigkeys` and `--hotkeys`
- **Latency**: `SLOWLOG`, `LATENCY DOCTOR`, why `KEYS` is dangerous
- **Memory fragmentation**: `INFO memory`, active defragmentation
- **Pipelining and Lua scripts**: fewer round trips, atomic operations
- **Redis Streams**: a log with consumer groups
- **Valkey and the license change**: the open source fork, and alternatives like KeyDB and Dragonfly
- **Security**: ACLs, TLS, never on a public port

### [MongoDB](07-databases/mongodb.md#advanced)

- **Replica sets**: elections, priority, arbiters
- **Read and write concerns**: `w: majority`, read preference, what is durable
- **Sharding**: shard keys, chunks, the balancer, jumbo chunks
- **Indexes**: compound, multikey, TTL indexes; the ESR rule
- **The aggregation pipeline**: and its performance
- **WiredTiger**: the storage engine, its cache and compression
- **Schema design**: embedding vs referencing, unbounded arrays
- **The oplog**: its size and replication window
- **Change streams**: reacting to data changes
- **Profiler and slow queries**: `explain()`, the database profiler
- **Backups**: mongodump, filesystem snapshots, Percona Backup for MongoDB
- **MongoDB on Kubernetes**: the community and Percona operators, Atlas as a service

### [ClickHouse](07-databases/clickhouse.md#advanced)

- **MergeTree engines**: ReplacingMergeTree, AggregatingMergeTree, SummingMergeTree
- **Primary key and ORDER BY**: sparse indexes, granules, choosing the sort key
- **Partitions and parts**: too many parts, merges, `system.parts`
- **Materialized views**: aggregating at insert time
- **Inserts**: batching, async inserts, why many small inserts hurt
- **Replication and sharding**: ReplicatedMergeTree, Distributed tables, ClickHouse Keeper
- **Compression and codecs**: LZ4, ZSTD, Delta, Gorilla
- **TTL**: moving or deleting old data automatically
- **Query performance**: `system.query_log`, skipping indexes, projections
- **Integrations**: Kafka engine, S3 table functions
- **Other columnar stores**: Apache Druid, Apache Pinot, BigQuery, Snowflake

## 8. Services

### [Messaging and queues](08-services/messaging.md#advanced)

- **Queues vs streams**: a message consumed once vs a log read many times
- **Delivery guarantees**: at most once, at least once, exactly once
- **Idempotent consumers**: processing the same message twice safely
- **Dead-letter queues and retries**: poison messages, backoff
- **Ordering**: per key, per partition, and what breaks it
- **Backpressure**: what happens when consumers fall behind
- **The outbox pattern**: saving data and sending a message reliably
- **Sagas**: transactions across services, compensation
- **RabbitMQ**: exchanges, bindings, quorum queues, prefetch
- **NATS and JetStream**: light, fast messaging
- **Cloud queues**: SQS, SNS, Pub/Sub, Azure Service Bus
- **Event sourcing and CQRS**: state as a log of events
- **Schema evolution**: Avro, Protobuf, schema registries

### [Kafka](08-services/kafka.md#advanced)

- **Partitions and keys**: how many partitions, choosing a key, hot partitions
- **Replication**: ISR, `min.insync.replicas`, `acks=all`, unclean leader election
- **Consumer groups and rebalances**: cooperative rebalancing, static membership
- **Offsets and lag**: committing offsets, measuring lag (Burrow, kafka-exporter)
- **Exactly-once semantics**: idempotent producers, transactions
- **KRaft**: Kafka without ZooKeeper
- **Retention and compaction**: time and size retention, log-compacted topics
- **Producer tuning**: `linger.ms`, `batch.size`, compression
- **Schema Registry**: Avro and Protobuf schemas, compatibility rules
- **Kafka Connect and Debezium**: moving data in and out, change data capture
- **Stream processing**: Kafka Streams, ksqlDB, Apache Flink
- **Strimzi**: running Kafka on Kubernetes
- **Tiered storage**: old segments on object storage
- **Alternatives**: Redpanda, Apache Pulsar, managed Kafka (MSK, Confluent Cloud)

### [Caching and Redis](08-services/caching.md#advanced)

- **Caching patterns**: cache-aside, read-through, write-through, write-behind
- **Invalidation**: TTLs, explicit deletes, versioned keys
- **Cache stampede**: many misses at once; locks, request coalescing, early refresh
- **Hit ratio**: measuring whether a cache helps
- **Hot keys**: one key that a whole cluster waits on, local caches in front
- **HTTP caching**: `Cache-Control`, ETags, `Vary`, stale-while-revalidate
- **CDNs**: Cloudflare, CloudFront, Fastly; purging
- **Reverse-proxy caches**: Varnish, nginx proxy cache
- **Memcached vs Redis**: and when each is the right choice
- **Negative caching**: caching "not found" answers
- **Multi-level caching**: in-process, shared, CDN
- **Consistency**: stale reads and when they are acceptable

### [Search](08-services/search.md#advanced)

- **Inverted index**: how full-text search finds documents
- **Analyzers**: tokenizers, stemming, stop words, synonyms, languages
- **Relevance**: BM25, boosting, function scores
- **Indexing pipelines**: keeping the index in sync with the database (change data capture, outbox)
- **Reindexing without downtime**: aliases, building a new index beside the old
- **Autocomplete and fuzzy search**: edge n-grams, typo tolerance
- **Facets and aggregations**: filters by category and counts
- **Vector search**: embeddings, HNSW, hybrid search, pgvector
- **Engines**: Elasticsearch, OpenSearch, Solr, Meilisearch, Typesense
- **Search for logs vs search for users**: different needs, often different engines

### [Object storage](08-services/object-storage.md#advanced)

- **The S3 API**: buckets, keys, prefixes, the de facto standard
- **Storage classes and lifecycle rules**: moving and deleting objects by age
- **Versioning and object lock**: protection from deletes and ransomware (WORM)
- **Presigned URLs**: temporary access without credentials
- **Multipart uploads**: large files in parts, cleaning unfinished uploads
- **Consistency**: strong read-after-write consistency in S3
- **Replication**: cross-region replication
- **Bucket policies and public access**: the classic data leak, and blocking public access
- **Encryption**: server-side with managed keys or KMS, client-side
- **Self-hosted object storage**: MinIO, Ceph (RADOS Gateway), SeaweedFS, Garage
- **Cost**: requests, egress and retrieval fees
- **Data lakes**: Parquet files, Apache Iceberg tables on object storage

### [Proxies and load balancers](08-services/proxies.md#advanced)

- **nginx in depth**: `upstream`, `proxy_pass`, buffering, timeouts, `map`, rate limiting
- **HAProxy**: L4 and L7 balancing, health checks, stick tables
- **Envoy**: the proxy behind most meshes and gateways, xDS configuration
- **Traefik and Caddy**: proxies that configure themselves, automatic HTTPS
- **Load-balancing algorithms**: round robin, least connections, consistent hashing
- **Health checks**: active vs passive, outlier detection
- **TLS termination and passthrough**: and re-encryption to the backend
- **Timeouts and keepalives**: the 502 and 504 errors and where they come from
- **Headers through proxies**: `X-Forwarded-For`, `Forwarded`, PROXY protocol
- **Rate limiting and WAF**: ModSecurity, Coraza, cloud WAFs
- **Ingress controllers**: ingress-nginx, Traefik, Contour, HAProxy Ingress
- **API gateways**: Kong, Envoy Gateway, Apache APISIX
- **Global load balancing**: DNS-based (GSLB), anycast

### [Service mesh](08-services/service-mesh.md#advanced)

- **Sidecar vs sidecar-less**: Istio ambient mode, Cilium service mesh
- **Istio**: istiod, VirtualService, DestinationRule, Gateway
- **Linkerd**: a light mesh, automatic mTLS
- **mTLS and workload identity**: SPIFFE and SPIRE
- **Traffic management**: splits, retries, timeouts, circuit breaking, fault injection
- **Authorization policies**: which service may call which
- **Mesh observability**: golden metrics per service, without code changes
- **Multi-cluster mesh**: one mesh across clusters
- **Gateway API for meshes (GAMMA)**: one API for ingress and mesh routing
- **The cost**: latency, memory, upgrades, debugging through proxies
- **Consul**: service discovery and mesh outside Kubernetes too

## 9. Observability

### [Observability](09-observability/concepts.md#advanced)

- **OpenTelemetry**: the SDKs, the Collector, OTLP, semantic conventions
- **Distributed tracing**: spans, context propagation (W3C Trace Context), sampling
- **Tracing backends**: Jaeger, Grafana Tempo, Zipkin
- **Structured logging and correlation**: trace IDs in every log line
- **RED and USE methods**: rate, errors, duration for services; utilization, saturation, errors for resources
- **The four golden signals**: latency, traffic, errors, saturation
- **Cardinality**: why a label with user IDs breaks a metrics system
- **Exemplars**: jumping from a metric to a trace
- **Continuous profiling**: the fourth signal: Pyroscope, Parca
- **eBPF observability**: Pixie, Beyla, Cilium Hubble
- **Alerting philosophy**: alert on symptoms, not causes; every page must be actionable
- **Commercial platforms**: Datadog, New Relic, Dynatrace, Honeycomb, Splunk
- **Real user monitoring and synthetic checks**: the user's view of the system

### [Metrics & Prometheus (Quick Intro)](09-observability/metrics.md#advanced)

- **Metric types**: counter, gauge, histogram, summary; native histograms
- **PromQL in depth**: `rate` vs `irate`, `histogram_quantile`, aggregation, `offset`
- **Recording rules**: precomputing expensive queries
- **Labels and cardinality**: which labels are safe
- **Service discovery**: Kubernetes discovery, relabeling
- **Exporters**: node_exporter, kube-state-metrics, blackbox_exporter
- **Prometheus Operator**: ServiceMonitor, PodMonitor, PrometheusRule
- **Long-term storage and scale**: Thanos, Grafana Mimir, Cortex, VictoriaMetrics
- **Remote write**: sending metrics to central storage
- **Federation and high availability**: two Prometheus servers and deduplication
- **Pushgateway**: metrics from short jobs, and its pitfalls
- **StatsD and OpenTelemetry metrics**: the other ways metrics are sent

### [DevOps Monitoring with Prometheus, Loki & Grafana](09-observability/monitoring.md#advanced)

- **Alertmanager in depth**: routing trees, grouping, inhibition, silences
- **Alert design**: `for` durations, severities, avoiding alert fatigue
- **SLO-based alerting**: multi-window, multi-burn-rate alerts; Sloth, Pyrra
- **On-call tools**: PagerDuty, Opsgenie, Grafana OnCall
- **Runbooks linked from alerts**: every alert says what to do
- **Grafana in depth**: variables, dashboards as code (Grafonnet, Terraform), provisioning
- **Dashboard design**: the overview first, then drill down; RED dashboards per service
- **Blackbox and synthetic monitoring**: probing endpoints from outside
- **Monitoring the monitoring**: a dead man's switch alert (Watchdog)
- **Grafana Alloy and the OpenTelemetry Collector**: one agent for metrics, logs and traces
- **kube-prometheus-stack**: the standard Helm chart for Kubernetes monitoring

### [Loki & LogQL](09-observability/loki.md#advanced)

- **Loki architecture**: distributor, ingester, querier, compactor; object storage for chunks
- **Labels vs log content**: few labels, and filtering the rest at query time
- **Structured metadata**: high-cardinality fields without labels
- **LogQL metric queries**: `rate`, `count_over_time`, `unwrap`
- **Log alerting**: Loki ruler rules
- **Retention and deletion**: per-tenant retention, the compactor
- **Collectors**: Grafana Alloy, Promtail (deprecated), Fluent Bit, Vector
- **Multi-tenancy**: the `X-Scope-OrgID` header
- **Scaling**: monolithic, simple scalable and microservices modes
- **Other log stacks**: ELK and EFK, OpenSearch, ClickHouse for logs, Splunk
- **Log levels and sampling**: keeping costs down at high volume

## 10. Security

### [DevSecOps](10-security/devsecops.md#advanced)

- **Threat modeling**: STRIDE, data-flow diagrams, attack trees
- **OWASP Top 10**: the most common web application risks
- **Identity and access management**: least privilege, SSO, MFA, just-in-time access
- **Zero trust**: never trust the network, verify every request
- **Secrets management**: HashiCorp Vault, OpenBao, SOPS with age, External Secrets, rotation
- **PKI and certificates**: internal CAs, cert-manager, short-lived certificates
- **Supply chain security**: SLSA, SBOMs, Sigstore and cosign, in-toto, dependency pinning
- **SAST, DAST and SCA**: scanning code, running apps and dependencies: Semgrep, CodeQL, OWASP ZAP, Dependabot, Renovate
- **Container and Kubernetes security**: image scanning, Pod Security, RBAC, NetworkPolicies, kube-bench
- **Runtime security**: Falco, Tetragon; detecting unusual behavior
- **Policy as code**: OPA and Rego, Kyverno, Checkov, tfsec
- **Cloud security posture**: CSPM, Prowler, cloud audit logs, GuardDuty and Defender
- **Encryption**: in transit and at rest, envelope encryption, KMS
- **Network security**: segmentation, WAF, DDoS protection, egress control
- **Incident response and forensics**: detection, containment, evidence, postmortem
- **Compliance frameworks**: SOC 2, ISO 27001, PCI DSS, GDPR, CIS Benchmarks
- **CVEs and CVSS**: reading a vulnerability report, deciding what to patch first

### [Authentication](10-security/authentication.md#advanced)

- **OAuth 2.0 in depth**: the grants, PKCE, token introspection and revocation, OAuth 2.1
- **OpenID Connect**: ID tokens, discovery, `userinfo`, logout flows
- **JWT security**: algorithm confusion, `alg: none`, key rotation with JWKS and `kid`, audience checks
- **JWE and PASETO**: encrypted tokens, and an alternative token format
- **Token storage in browsers**: `HttpOnly` cookies vs `localStorage`, the backend-for-frontend pattern
- **Refresh token rotation**: detecting a stolen refresh token by its reuse
- **Sender-constrained tokens**: DPoP and mTLS-bound tokens, so a stolen token is useless alone
- **Token exchange**: RFC 8693, swapping one token for another, the basis of workload federation
- **SAML**: assertions, IdP and SP metadata, why enterprises still use it
- **Identity providers**: Keycloak, Dex, Authentik, Entra ID, Okta, Auth0, Cognito
- **SCIM**: provisioning and removing users across applications from the IdP
- **Kubernetes authentication**: ServiceAccount token projection, OIDC for `kubectl`, the TokenReview API, impersonation
- **Workload identity federation**: GitHub Actions and GitLab OIDC, IRSA and EKS Pod Identity, GKE and Azure Workload Identity, SPIFFE and SPIRE
- **Authentication at the edge**: oauth2-proxy, Traefik ForwardAuth, nginx `auth_request`, JWT validation in API gateways and Envoy
- **Authorization models**: RBAC, ABAC, ReBAC (Zanzibar, OpenFGA), policy engines such as OPA and Cedar
- **CSRF, XSS and CORS**: the browser attacks on cookies and tokens, and the defenses
- **Webhook signatures**: HMAC over the body, timestamps against replay
- **Passkeys and WebAuthn**: login without passwords, with keys held by the device
- **MFA methods**: TOTP, push, hardware keys (FIDO2), and which resist phishing

## 11. Reliability

### [SRE](11-reliability/sre.md#advanced)

- **SLIs, SLOs and SLAs**: choosing indicators, setting objectives
- **Error budgets and policies**: what happens when the budget runs out
- **Burn-rate alerts**: alerting on the speed of budget loss
- **Incident management**: incident commander, roles, severity levels, status pages
- **Postmortems**: blameless writing, action items that get done
- **On-call**: rotations, handoffs, sustainable load
- **Toil reduction**: measuring and automating repetitive work
- **Capacity planning and load testing**: k6, Locust, Gatling; finding the limit before users do
- **Chaos engineering**: Chaos Mesh, LitmusChaos, Gremlin, game days
- **Resilience patterns**: timeouts, retries with backoff and jitter, circuit breakers, bulkheads, load shedding
- **Graceful degradation**: serving a smaller product instead of an error
- **Disaster recovery**: RPO, RTO, DR drills, multi-region
- **Release engineering**: safe rollouts, change management
- **The Google SRE books**: Site Reliability Engineering and The Site Reliability Workbook, free online

### [Cost (FinOps)](11-reliability/finops.md#advanced)

- **The FinOps framework**: inform, optimize, operate; the FinOps Foundation
- **Cost allocation**: tags and labels, showback and chargeback
- **Unit economics**: cost per customer, per request, per order
- **Commitments**: Reserved Instances, Savings Plans, committed use discounts
- **Spot and preemptible capacity**: cheap capacity that can be taken away
- **Right-sizing**: instances and pods sized to real usage
- **Kubernetes cost**: OpenCost, Kubecost; requests vs usage, idle capacity
- **Storage and data transfer costs**: egress, cross-zone traffic, NAT gateway fees
- **Autoscaling and scheduling**: scaling down at night, turning off dev environments
- **Budgets and anomaly detection**: alerts before the bill arrives
- **FOCUS**: the open standard format for cost data
- **Cost in the design**: choosing architectures with cost as a requirement, Infracost in pull requests
