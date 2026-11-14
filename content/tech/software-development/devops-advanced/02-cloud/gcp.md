---
title: GCP
order: 4
lang: en
tags: [intro]
updated: 2026-11-13
---

# GCP

**Level: intro**

Google Cloud Platform is the smallest of the three and known for data and Kubernetes: BigQuery, and GKE from the company that created Kubernetes. Its style: fewer, more opinionated services, and everything belongs to a project.

## How it is organized

```text
Organization
└── Folders (optional: departments, environments)
    └── Project (holds resources, billing, APIs and permissions)
        └── Resources
```

A project is the main unit. Each service's API is enabled per project, and deleting a project deletes everything in it.

## Terms

| Term | Meaning |
|---|---|
| Project | The container for resources, with its own ID, billing link and permissions |
| Cloud IAM | Access control: a binding gives a principal a role on a resource, folder or project |
| Service account | An identity for a program, not a person |
| VPC | The private network. In GCP a VPC is global and its subnets are regional |
| Firewall rules | Allow or deny traffic in the VPC, by tags or service accounts |
| Compute Engine | Virtual machines |
| GKE | Managed Kubernetes. Autopilot mode also manages the nodes for you |
| Cloud Run | Serverless containers: an image in, an HTTPS URL out, scales to zero |
| Cloud Storage | Object storage, in buckets |
| Cloud SQL | Managed PostgreSQL, MySQL and SQL Server |
| Spanner | A relational database that scales horizontally across regions |
| BigQuery | Serverless data warehouse. You pay per query or per reserved capacity |
| Pub/Sub | Managed messaging |
| Artifact Registry | Container images and packages |
| Cloud Logging / Monitoring | Logs, metrics and alerts |

## A small example: a container on the internet in one command

```bash
gcloud auth login
gcloud config set project my-demo-project

gcloud run deploy hello \
  --image us-docker.pkg.dev/cloudrun/container/hello \
  --region europe-west1 \
  --allow-unauthenticated
```

The command prints an HTTPS URL. Behind it you now have TLS, a load balancer, autoscaling and scale to zero, with no machine to manage. This is what "serverless containers" means in practice.

```bash
gcloud run services list
gcloud run services delete hello --region europe-west1
```

Access is given with a binding, the same idea as in the other clouds:

```bash
gcloud projects add-iam-policy-binding my-demo-project \
  --member "serviceAccount:app@my-demo-project.iam.gserviceaccount.com" \
  --role "roles/storage.objectViewer"
```

## What to learn first

Projects and IAM, service accounts, VPC, Compute Engine, Cloud Storage, then GKE or Cloud Run, Cloud SQL and BigQuery.

## Where it goes next

- Beginner: a Cloud Run service that reads from Cloud SQL through a service account.
- Advanced: organization policies, Shared VPC, Workload Identity, GKE in depth, BigQuery cost control.

## See also

- [Cloud concepts](concepts.md), [AWS](aws.md), [Azure](azure.md)
