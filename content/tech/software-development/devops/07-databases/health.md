---
title: "Database health: the questions for every data system"
sidebar:
  label: Database health
order: 5
lang: en
tags: [advanced]
updated: 2026-11-15
---

# Database health: the questions for every data system

How to tell whether a data system is healthy, whichever one it is. The signals and the common incidents of each system are on its own page, in the Advanced section:

| System | What to watch, common cases, alert rules |
|---|---|
| PostgreSQL | [PostgreSQL, Advanced](postgres.md#advanced) |
| Elasticsearch and OpenSearch | [Elasticsearch, Advanced](elasticsearch.md#advanced) |
| Redis and Valkey | [Redis, Advanced](redis.md#advanced) |
| MongoDB | [MongoDB, Advanced](mongodb.md#advanced) |
| Kafka | [Kafka, Advanced](../08-services/kafka.md#advanced) |

Each of those sections has two tables. **What to watch** is the short list of signals that tell you an instance is healthy. **Common cases** are the incidents that repeat everywhere: what happens, how it shows, and what to do.

The background is in [How databases work](internals.md), [Replication and scaling](replication.md) and [Operating a database](operations.md).

**Levels on this page:** [Advanced](#advanced)

## Advanced

### The same questions for every data system

Before the specifics, five questions cover most of the health of any database:

| Question | Why it is the first thing to check |
|---|---|
| Is it **up and accepting work**? | Connections used against the maximum, rejected requests, queue lengths |
| Is it **fast**? | Latency percentiles of reads and writes, and the slowest queries |
| Is it **running out of something**? | Disk, memory, connections, file descriptors. Each ends in a full stop, not a slowdown |
| Are the **copies in sync**? | Replication lag, and replicas that are missing or not caught up |
| Is the **background work keeping up**? | Vacuum, compaction, merges, checkpoints. When it falls behind, everything else slowly degrades |

When an alert fires and you have no idea yet: look at what **changed** (a deploy, a migration, a traffic spike, a batch job), and at which of the five is abnormal.

### From signals to alerts

A signal that nobody looks at does not help at 3 a.m. Each data system has a Prometheus exporter that publishes these signals as metrics, and an alert rule turns a "worry when" into a notification. The rules for each system are listed on its page, and the [lab](../13-lab/_index.md) loads all of them (`infra/monitoring.ts`), so you can copy them as a starting point.

Two rules of thumb for the severity. **Page** when users are affected now or data is at risk: the system is down, a primary shard is missing, connections are refused. **Ticket** when something will become a problem if nobody acts today: bloat, evictions, a yellow cluster, a disk filling up. The thresholds are starting points. Tune each one until it fires only when a person needs to do something.

What these rules cannot see, and what you still need: disk space of the database's volume (from the node or the cloud), the age of the last successful backup (from the backup tool), and replication lag where there are replicas.

### In the lab

The [lab](../13-lab/_index.md) runs PostgreSQL, Redis, Kafka and Elasticsearch with exporters and a dashboard, so several of these cases can be caused on purpose and watched. The [experiments page](../13-lab/experiments.md) walks through them: exhausting PostgreSQL connections, a transaction left open, Redis evictions, Kafka lag and a yellow Elasticsearch cluster.

## See also

- [PostgreSQL](postgres.md), [Elasticsearch](elasticsearch.md), [Redis](redis.md), [MongoDB](mongodb.md), [ClickHouse](clickhouse.md), [Kafka](../08-services/kafka.md)
- [Operating a database](operations.md), [Replication and scaling](replication.md)
- [Observability](../09-observability/concepts.md): how to turn these signals into alerts
