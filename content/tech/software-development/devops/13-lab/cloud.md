---
title: "The lab in a cloud: AWS, GCP, Azure"
sidebar:
  label: In a cloud
order: 3
lang: en
tags: [intro]
updated: 2026-11-14
---

# The lab in a cloud: AWS, GCP, Azure

**Level: intro**

The [lab](_index.md) runs everything inside one kind cluster on a laptop. This page takes the same system and asks: what stays, what changes and what is new when it runs in AWS, GCP or Azure? The answer is the practical difference between "it works on my machine" and production.

## The short version

- **The application layer barely changes.** Deployments, Services, the autoscaler, probes and ConfigMaps are plain Kubernetes. `apps.ts` would be almost the same file.
- **The data layer mostly disappears from the cluster.** PostgreSQL, Redis, Kafka and search become managed services that you create with infrastructure code and reach over the network.
- **A new layer appears underneath.** A network, a cluster with node groups, identities, a registry, DNS and certificates. On the laptop, kind and Docker gave you all of that for free.

```text
Laptop                              Cloud
------                              -----
kind cluster in Docker         ->   managed Kubernetes (EKS / GKE / AKS) in a private network
kind load docker-image         ->   push to a registry, the cluster pulls
NodePort + localhost:8090      ->   cloud load balancer + DNS name + TLS certificate
PostgreSQL pod, 1 Gi volume    ->   managed PostgreSQL, multi-zone, with backups
Redis pod                      ->   managed Redis
Kafka pod                      ->   managed Kafka, or the cloud's own messaging
Elasticsearch pod              ->   managed search
Password in a Kubernetes Secret ->  secret manager + workload identity
Pulumi state in a local folder ->   state in a bucket or Pulumi Cloud, deployed from CI
```

## Piece by piece

| Piece | In the lab | AWS | GCP | Azure |
|---|---|---|---|---|
| Network | Docker's network | VPC, public and private subnets in 2-3 zones, NAT gateway | VPC (global), regional subnets, Cloud NAT | VNet, subnets, NAT gateway |
| Cluster | kind, 3 containers | EKS, with managed node groups or Karpenter | GKE, Standard or Autopilot | AKS |
| Nodes | Fixed: 2 workers | Autoscaled groups over zones, some on spot | Autoscaled node pools, or none to manage in Autopilot | Autoscaled node pools |
| Images | `kind load` | ECR | Artifact Registry | ACR |
| Traffic in | NodePort on localhost | ALB or NLB, created by the AWS Load Balancer Controller | Cloud Load Balancing, created by GKE's Gateway or Ingress | Azure Load Balancer or Application Gateway |
| DNS and TLS | `*.localhost`, plain HTTP | Route 53 and ACM certificates | Cloud DNS and Google-managed certificates | Azure DNS and Key Vault or managed certificates |
| PostgreSQL | A pod | RDS or Aurora, Multi-AZ | Cloud SQL or AlloyDB, regional | Azure Database for PostgreSQL, zone-redundant |
| Redis | A pod | ElastiCache | Memorystore | Azure Cache for Redis |
| Kafka | A pod | MSK (managed Kafka). Or SQS/SNS/Kinesis with code changes | Managed Service for Apache Kafka. Or Pub/Sub with code changes | Event Hubs, which speaks the Kafka protocol |
| Search | A pod | OpenSearch Service | Elastic Cloud from the marketplace | Elastic Cloud from the marketplace, or Azure AI Search with code changes |
| Disks | kind's local-path volumes | EBS through the CSI driver | Persistent Disk | Managed Disks |
| Secrets | Kubernetes Secret from Pulumi config | Secrets Manager, synced by External Secrets | Secret Manager | Key Vault |
| Pod identity | None needed | IAM role per ServiceAccount (EKS Pod Identity or IRSA) | Workload Identity Federation for GKE | Entra Workload ID |
| Metrics and dashboards | Prometheus and Grafana in the cluster | The same, or Amazon Managed Prometheus and Grafana, or CloudWatch | The same, or Google Managed Prometheus and Cloud Monitoring | The same, or Azure Monitor managed Prometheus and Managed Grafana |
| Logs | `kubectl logs` | CloudWatch Logs, or Loki / OpenSearch | Cloud Logging (on by default in GKE) | Azure Monitor Logs |

## What changes in the code

The lab's Pulumi program has four layers. In a cloud it gets a fifth at the bottom, and the layers change by very different amounts.

| File | Change | What it becomes |
|---|---|---|
| (new) `cloud.ts` | **New** | The network, the cluster, node groups, the registry, IAM roles. Written with `@pulumi/aws` + `@pulumi/eks`, `@pulumi/gcp` or `@pulumi/azure-native`. This is the part that differs most between the three clouds |
| `config.ts` | Small | The Kubernetes provider takes the kubeconfig that the new cluster outputs, in place of a kind context |
| `platform.ts` | Medium | The ingress Service becomes type `LoadBalancer`, or the cloud's own ingress controller replaces Traefik. cert-manager and external-dns are added. metrics-server is usually already there |
| `data.ts` | **Rewritten** | Each StatefulSet becomes a managed resource: a database instance, a subnet group, a firewall rule that lets only the cluster in. The exports (`databaseUrl`, `redisUrl`, `kafkaBrokers`) keep their names, so the layers above do not notice |
| `apps.ts` | Tiny | The image name gets the registry's address. The Ingress gets a host name and TLS. The pods get a ServiceAccount tied to a cloud role |
| `monitoring.ts` | Small or none | Works as is. Persistent storage for Prometheus is added, or it is swapped for the managed offering |

That the top layers survive is the main reason Kubernetes is used as the common platform: the differences between clouds are pushed down into one layer.

A sketch of what the PostgreSQL part of `data.ts` turns into on AWS:

```typescript
import * as aws from "@pulumi/aws";

const db = new aws.rds.Instance("shop", {
    engine: "postgres",
    engineVersion: "17",
    instanceClass: "db.t4g.micro",
    allocatedStorage: 20,
    dbName: "shop",
    username: "shop",
    manageMasterUserPassword: true,        // AWS keeps and rotates the password in Secrets Manager
    multiAz: true,                         // a standby in another zone, with automatic failover
    backupRetentionPeriod: 7,              // daily backups and point-in-time recovery
    dbSubnetGroupName: privateSubnets.name,
    vpcSecurityGroupIds: [allowFromCluster.id],
    deletionProtection: true,
});

export const databaseHost = db.address;
```

Fewer lines than the StatefulSet, and it brings failover, backups and patching. The same idea holds for the other two clouds, with `gcp.sql.DatabaseInstance` and `azure-native.dbforpostgresql.Server`.

## What you gain and what you take on

| You gain | You take on |
|---|---|
| The provider handles failover, backups, patching and upgrades of the data services | A monthly bill. This system, sized small, is several hundred dollars a month, mostly the cluster, the databases and the NAT gateway |
| Real high availability across zones | Network design: private subnets, firewall rules, private endpoints |
| Elastic capacity: nodes and pods follow load | IAM: every pod and pipeline needs exactly the permissions it uses |
| A real address, with TLS | Limits of managed services: no superuser, fixed extension lists, fixed versions |
| | Slower feedback: creating a cluster or database takes 10 to 20 minutes, against seconds on kind |

What does **not** move to the provider, in any cloud: slow queries, bad schemas, connection limits, cache sizing, consumer lag, and noticing all of them. Everything in [Database health](../07-databases/health.md) still applies to a managed database.

## How the three clouds differ for this system

- **AWS**: the most pieces to assemble yourself. EKS needs add-ons that the others include (the load balancer controller, a storage driver, often Karpenter). In return every piece is flexible and the managed data services cover all four of the lab's stores natively.
- **GCP**: the least cluster work. GKE Autopilot removes node management entirely, logging and monitoring are wired in from the start, and the network is global. Search is the piece with no native equivalent.
- **Azure**: AKS is close to GKE in effort. Identity runs through Entra ID, which is an advantage in a company already on Microsoft. Event Hubs accepts Kafka clients, so the worker's code can stay as it is.

## Getting there in steps

Moving the lab to a cloud is the planned next stage of this project (see the guide's TODO). The order that keeps each step small:

1. A registry, and pushing the image to it from CI.
2. The network and an empty managed cluster.
3. The lab as it is, pods and all, on that cluster. Only the ingress and the image name change.
4. PostgreSQL to the managed service. Then Redis, Kafka and search, one at a time.
5. Secrets to the secret manager, with workload identity.
6. DNS, TLS, and remote Pulumi state.

## See also

- [Cloud concepts](../03-cloud/concepts.md), [AWS](../03-cloud/aws.md), [Azure](../03-cloud/azure.md), [GCP](../03-cloud/gcp.md)
- [Kubernetes in production](../02-containers/kubernetes-production.md)
- [Cost (FinOps)](../11-reliability/finops.md)
