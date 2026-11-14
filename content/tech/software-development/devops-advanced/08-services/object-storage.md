---
title: Object storage
order: 4
lang: en
tags: [intro]
updated: 2026-11-13
---

# Object storage

**Level: intro**

Object storage holds files of any size under a key, reached over HTTP. It is cheap, practically unlimited and very durable, so it became the place for everything that is not a database row: uploads, backups, logs, build artifacts, Terraform state, data lakes. Amazon S3 defined the model, and its API is the standard that other products copy.

## Terms

| Term | Meaning |
|---|---|
| Bucket | A top-level container for objects. Its name is globally unique in S3 |
| Object | A file plus its metadata |
| Key | The full name of an object in a bucket, e.g. `backups/2026/11/db.dump` |
| Prefix | The start of a key. There are no real folders: `backups/2026/` is a prefix shared by many keys |
| Block storage | A disk attached to one machine (EBS). Fast, for databases and operating systems |
| File storage | A shared file system mounted by several machines (NFS, EFS) |
| Durability | The chance that stored data is not lost. S3 is designed for 99.999999999% (eleven nines) per year |
| Storage class | A price tier by how often the data is read: standard, infrequent access, archive |
| Lifecycle rule | Automatic move to a cheaper class, or deletion, by age |
| Versioning | The bucket keeps old versions of overwritten and deleted objects |
| Presigned URL | A temporary link that gives access to one object without credentials |
| S3-compatible | Any store that speaks the S3 API, so the same tools and SDKs work |

## Three kinds of storage

| | Object | Block | File |
|---|---|---|---|
| Access | HTTP API, by key | A disk on one machine | A mounted shared folder |
| Change part of a file | No, rewrite the object | Yes | Yes |
| Size limit | Practically none | The disk size | Large |
| Price | Lowest | Highest | Medium |
| Use for | Backups, media, logs, artifacts | Databases, VM disks | Shared files between servers |

## The tools

| Where | Product |
|---|---|
| AWS | S3 |
| Azure | Blob Storage |
| GCP | Cloud Storage |
| Others | Cloudflare R2, Backblaze B2 |
| Self-hosted | MinIO, Ceph (RADOS Gateway), SeaweedFS, Garage |

## A small example

With the AWS CLI. For another S3-compatible store, add `--endpoint-url https://...` to each command.

```bash
aws s3 mb s3://demo-artifacts-123456

aws s3 cp backup.dump s3://demo-artifacts-123456/backups/2026/11/backup.dump
aws s3 ls s3://demo-artifacts-123456/backups/ --recursive

# A link to this one object that works for 10 minutes, for someone with no account
aws s3 presign s3://demo-artifacts-123456/backups/2026/11/backup.dump --expires-in 600
```

A lifecycle rule: move backups to an archive class after 30 days, delete after a year.

```json
{
  "Rules": [
    {
      "ID": "backups",
      "Status": "Enabled",
      "Filter": { "Prefix": "backups/" },
      "Transitions": [{ "Days": 30, "StorageClass": "GLACIER" }],
      "Expiration": { "Days": 365 }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket demo-artifacts-123456 --lifecycle-configuration file://lifecycle.json
```

## What to remember

- **Buckets are private by default. Keep them that way.** Public buckets are the classic source of data leaks. Share with presigned URLs or through a CDN.
- **Turn on versioning** for anything important, such as Terraform state: it is the undo for an overwrite or a delete.
- **Set lifecycle rules.** Storage that nobody deletes grows forever.
- **Reading has a price too**: requests and [egress](../11-reliability/finops.md) are billed, and archive classes charge for retrieval.

## Where it goes next

- Beginner: a static website from a bucket, database backups to a bucket from a scheduled job.
- Advanced: bucket policies and encryption, cross-region replication, object lock for compliance, performance with many small objects, running your own store.

## See also

- [AWS](../02-cloud/aws.md), [Operating a database](../07-databases/operations.md)
