---
title: AWS
order: 2
lang: en
tags: [intro]
updated: 2026-11-13
---

# AWS

**Level: intro**

Amazon Web Services is the oldest and largest cloud, with the widest set of services. Most job descriptions ask for it. Its style: many small building blocks that you wire together yourself, and IAM policies on everything.

## How it is organized

- **Account**: the basic container for resources and the billing unit. Companies use many accounts (per team, per environment), grouped in an **Organization**.
- **Region** and **availability zone**: `eu-central-1` is Frankfurt, `eu-central-1a` is one zone in it. Most resources live in one region.
- **ARN**: the unique name of every resource, e.g. `arn:aws:s3:::my-bucket`.

## Terms

| Term | Meaning |
|---|---|
| IAM user | An identity with long-lived credentials. Avoided today in favor of roles and single sign-on |
| IAM role | An identity with no password that a person or service assumes for a limited time |
| IAM policy | A JSON document: allow or deny these actions on these resources |
| VPC | Your private network. It holds subnets, route tables and gateways |
| Security group | A firewall attached to a resource: which ports are open, and to whom |
| EC2 | Virtual machines ("instances") |
| EBS | Disks for EC2 instances |
| S3 | Object storage, in buckets |
| RDS / Aurora | Managed relational databases (PostgreSQL, MySQL and others) |
| DynamoDB | Managed key-value and document database |
| EKS / ECS | Managed Kubernetes / Amazon's own container orchestrator |
| Fargate | Runs containers for EKS or ECS without you managing the machines |
| Lambda | Functions that run on events |
| CloudWatch | Metrics, logs and alarms |
| CloudTrail | A log of every API call made in the account |
| Route 53 | DNS |

## A small example: a bucket and a least-privilege policy

```bash
aws sts get-caller-identity              # who am I, in which account?

aws s3 mb s3://demo-notes-123456 --region eu-central-1
echo "hello" > note.txt
aws s3 cp note.txt s3://demo-notes-123456/
aws s3 ls s3://demo-notes-123456/
```

A policy that lets its holder read this one bucket and nothing else:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::demo-notes-123456",
        "arn:aws:s3:::demo-notes-123456/*"
      ]
    }
  ]
}
```

Attach it to a role, give the role to an EC2 instance or a pod, and the application reads the bucket with no stored keys. That is the pattern for almost everything in AWS: **a role, with a policy that names exact actions and exact resources**.

Clean up:

```bash
aws s3 rb s3://demo-notes-123456 --force
```

## What to learn first

IAM, VPC, EC2, S3, RDS, then EKS or ECS, and CloudWatch. These cover most real systems. The other 200 services can wait until you need one.

## Where it goes next

- Beginner: a VPC with public and private subnets, an instance behind a load balancer, a role instead of keys.
- Advanced: Organizations and multi-account design, IAM evaluation logic, networking between VPCs, EKS in depth.

## See also

- [Cloud concepts](concepts.md), [Azure](azure.md), [GCP](gcp.md)
- [Object storage](../08-services/object-storage.md)
