---
title: MongoDB
order: 8
lang: en
tags: [intro, advanced]
updated: 2026-11-15
---

# MongoDB

A document-oriented NoSQL database. Stores data as flexible, JSON-like documents (BSON). Great when your data schema evolves or is hierarchical.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

### Key concepts

- **Document** – A single record, like a JSON object.
- **Collection** – Group of documents (similar to a table).
- **BSON** – Binary JSON format Mongo uses internally.
- **Schema-flexible** – Documents in the same collection can have different fields.
- **Index** – Speeds up queries; supports single-field, compound, text, geospatial.
- **Aggregation Pipeline** – Framework for analytics/transformations (stages like `$match`, `$group`, `$project`).
- **Replica Set** – High availability via primary + secondary nodes, automatic failover.
- **Sharding** – Horizontal scaling by splitting collections across servers.

## Advanced

Keeping a replica set healthy: the signals to watch, and the incidents that repeat everywhere. The questions that apply to every data system are in [Database health](health.md).

### What to watch

| Signal | Where | Healthy | Worry when |
|---|---|---|---|
| Replica set state | `rs.status()` | One PRIMARY, the rest SECONDARY | Members in RECOVERING or unreachable, or the primary changing |
| Replication lag | `rs.printSecondaryReplicationInfo()` | Seconds | Growing |
| Oplog window | `rs.printReplicationInfo()` | Longer than any outage you plan for (days) | Hours |
| Connections | `db.serverStatus().connections` | Stable | Near the limit |
| Cache used and dirty | `serverStatus().wiredTiger.cache` | Used around 80%, dirty under 5% | Dirty above 20% |
| Queued operations | `serverStatus().globalLock.currentQueue` | Near zero | A standing queue |
| Slow operations | The log and the profiler | Rare | `COLLSCAN` in frequent queries |
| Disk used | The operating system | Predictable growth | Above 80% |

### Common cases

| What happens | How it shows | What to do |
|---|---|---|
| **A query scans the whole collection.** No index fits it. | High CPU and disk reads. The slow log shows `COLLSCAN` with `docsExamined` far above `nReturned`. | `explain("executionStats")` on the query, then create the index. On a replica set, build it one member at a time for very large collections. |
| **A secondary falls too far behind.** It was down, or too slow, for longer than the oplog covers. | The member stays in RECOVERING, with `too stale to catch up` in its log. | Resync the member from scratch. Make the oplog larger so the window covers real outages. |
| **Elections keep happening.** The primary is overloaded or the network between members is unstable, so heartbeats are missed. | The primary changes repeatedly. Writes fail for seconds with `NotWritablePrimary`. | Check load on the primary and the network between members. Keep an odd number of voting members, spread over failure zones. Make sure clients retry writes. |
| **Cache pressure.** Writes arrive faster than changed pages can be flushed to disk. | Dirty cache above 20%, and application threads are made to do the flushing. Latency spikes on everything. | Faster disks, more memory, or a slower write burst (throttle the batch job). |
| **A hot shard.** The shard key always increases (a timestamp, an auto-increment ID), so every insert goes to the last chunk on one shard. | One shard at full load while the others are idle. The balancer moves chunks all the time. | Choose a hashed or compound shard key that spreads writes. An existing key can be refined or the collection resharded, which is a heavy operation: choose well at the start. |

## See also

- [Replication and scaling](replication.md): replica sets, failover and sharding in general
- [Database health](health.md)
