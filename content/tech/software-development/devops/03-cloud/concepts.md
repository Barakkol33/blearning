---
title: Cloud concepts
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# Cloud concepts

**Level: intro**

A cloud rents you computers, storage, networks and ready-made services, by the hour or by use, through an API. The three big ones (AWS, Azure, GCP) use different names for nearly the same building blocks. Learn the blocks once and the names become a translation table.

## Terms

| Term | Meaning |
|---|---|
| Region | A geographic area with data centers, e.g. Frankfurt. You choose where your resources live |
| Availability zone (AZ) | A separate data center (or group) inside a region. Spreading over zones survives the loss of one |
| IaaS | You rent raw machines, disks and networks, and manage everything on them |
| PaaS / managed service | The provider runs the software (a database, Kubernetes, a queue). You only use it |
| Serverless | You hand over code or a container. The provider runs it on demand and bills per use, down to zero |
| Shared responsibility | The provider secures the cloud itself. You secure what you put in it: access, data, configuration |
| IAM | Identity and access management: who (a user, a service) may do what on which resource |
| Role | A set of permissions that a person or a service takes on, without a permanent password |
| VPC / virtual network | Your private network inside the cloud, split into subnets |
| Object storage | Storage for files of any size by key, over HTTP. Cheap, durable, practically unlimited |
| Autoscaling | Adding and removing machines automatically, following load |
| Egress | Data leaving the cloud. It is billed, and is a common surprise on the invoice |
| Quota | A per-account limit on how much of a resource you may create |

## The same blocks, three names

| Block | AWS | Azure | GCP |
|---|---|---|---|
| Virtual machines | EC2 | Virtual Machines | Compute Engine |
| Managed Kubernetes | EKS | AKS | GKE |
| Serverless containers | ECS on Fargate, App Runner | Container Apps | Cloud Run |
| Functions | Lambda | Functions | Cloud Run functions |
| Object storage | S3 | Blob Storage | Cloud Storage |
| Block disks | EBS | Managed Disks | Persistent Disk |
| Relational database | RDS, Aurora | Azure SQL, Database for PostgreSQL | Cloud SQL, AlloyDB, Spanner |
| NoSQL database | DynamoDB | Cosmos DB | Firestore, Bigtable |
| Cache | ElastiCache | Azure Cache for Redis | Memorystore |
| Queues and events | SQS, SNS, Kinesis, MSK | Service Bus, Event Hubs, Event Grid | Pub/Sub |
| Data warehouse | Redshift | Synapse, Fabric | BigQuery |
| Private network | VPC | Virtual Network (VNet) | VPC |
| Load balancer | ELB (ALB, NLB) | Load Balancer, Application Gateway | Cloud Load Balancing |
| DNS | Route 53 | Azure DNS | Cloud DNS |
| CDN | CloudFront | Front Door | Cloud CDN |
| Identity | IAM, IAM Identity Center | Entra ID, Azure RBAC | Cloud IAM |
| Secrets | Secrets Manager | Key Vault | Secret Manager |
| Monitoring | CloudWatch | Azure Monitor | Cloud Monitoring, Cloud Logging |
| Image registry | ECR | Container Registry (ACR) | Artifact Registry |
| Native IaC | CloudFormation, CDK | Bicep (ARM templates) | Infrastructure Manager |

## A small example: one web app, drawn in blocks

A typical web application uses the same six blocks in any cloud:

```text
users
  |
  v
DNS -> load balancer           (public subnet)
          |
          v
     2+ app servers            (private subnet, across 2 zones, autoscaled)
        |        |
        v        v
  managed DB   object storage
  (private)    (uploads, backups)

IAM role on the app servers: may read one bucket and one secret, nothing else.
```

Each provider page builds part of this with its own CLI: [AWS](aws.md), [Azure](azure.md), [GCP](gcp.md).

## How to choose where to run something

From most control to least work:

1. **Virtual machine**: full control, and you patch and scale it yourself.
2. **Managed Kubernetes**: the standard for many services, with real operational cost.
3. **Serverless containers**: a container in, a URL out. A good default for a small service.
4. **Functions**: short event-driven code. Limits on runtime and start-up time.

Start as high on the managed side as the workload allows, and move down only for a reason.

## Where it goes next

- Beginner: build the diagram above in one cloud, by hand and then with [Terraform](../04-infrastructure-as-code/terraform.md).
- Advanced: multi-account layout, network design across regions, identity federation, [cost](../11-reliability/finops.md), multi-cloud trade-offs.
