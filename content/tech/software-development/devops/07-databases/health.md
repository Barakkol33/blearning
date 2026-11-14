---
title: "Database health: what to watch and common cases"
sidebar:
  label: Health and common cases
order: 5
lang: en
tags: [advanced]
updated: 2026-11-14
---

# Database health: what to watch and common cases

**Level: advanced**

A field guide for the data systems you are most likely to run: PostgreSQL, Elasticsearch, Redis, MongoDB and Kafka. For each one there are two tables. **What to watch** is the short list of signals that tell you an instance is healthy. **Common cases** are the incidents that repeat everywhere: what happens, how it shows, and what to do.

The background is in [How databases work](internals.md), [Replication and scaling](replication.md) and [Operating a database](operations.md). Several cases can be reproduced safely in the [lab](../13-lab/experiments.md).

## The same questions for every data system

Before the specifics, five questions cover most of the health of any database:

| Question | Why it is the first thing to check |
|---|---|
| Is it **up and accepting work**? | Connections used against the maximum, rejected requests, queue lengths |
| Is it **fast**? | Latency percentiles of reads and writes, and the slowest queries |
| Is it **running out of something**? | Disk, memory, connections, file descriptors. Each ends in a full stop, not a slowdown |
| Are the **copies in sync**? | Replication lag, and replicas that are missing or not caught up |
| Is the **background work keeping up**? | Vacuum, compaction, merges, checkpoints. When it falls behind, everything else slowly degrades |

When an alert fires and you have no idea yet: look at what **changed** (a deploy, a migration, a traffic spike, a batch job), and at which of the five is abnormal.

## PostgreSQL

### What to watch

| Signal | Where | Healthy | Worry when |
|---|---|---|---|
| Connections in use | `pg_stat_activity`, against `max_connections` | Well under the maximum | Above 80% |
| Sessions "idle in transaction" | `pg_stat_activity.state` | None older than seconds | Any older than a minute |
| Oldest open transaction | `min(xact_start)` in `pg_stat_activity` | Seconds | Minutes or hours |
| Sessions waiting on locks | `wait_event_type = 'Lock'` | Zero most of the time | A growing number |
| Dead rows and last autovacuum | `pg_stat_user_tables` | Dead rows a small share of live rows | Dead rows rising while autovacuum runs |
| Transaction ID age | `age(datfrozenxid)` in `pg_database` | Under 200 million | Above 1 billion |
| Replication lag | `pg_stat_replication` | Bytes to kilobytes | Growing steadily |
| Replication slots | `pg_replication_slots` | All active | An inactive slot |
| Cache hit ratio | `blks_hit / (blks_hit + blks_read)` in `pg_stat_database` | Above 99% for a web workload | A drop from its usual value |
| Slowest queries by total time | `pg_stat_statements` | A stable top ten | A new query at the top |
| Disk used, and size of `pg_wal` | The operating system | Steady growth you can predict | A sudden change of slope |
| Rollbacks and deadlocks | `pg_stat_database` | Near zero | A jump |
| Age of the last good backup | Your backup tool | Within the schedule | Older than the schedule |

One query answers the first four rows:

```sql
SELECT pid, usename, application_name, state, wait_event_type,
       now() - xact_start  AS transaction_age,
       now() - query_start AS query_age,
       left(query, 80)     AS query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY xact_start NULLS LAST;
```

### Common cases

| What happens | How it shows | What to do |
|---|---|---|
| **Connections run out.** An application opens more connections than the server allows, often after scaling the application up. | Clients get `FATAL: sorry, too many clients already`. Connections sit at the maximum. Most sessions are `idle`. | Group `pg_stat_activity` by `application_name` and `state` to find who holds them. Lower the pool size per application instance, and put PgBouncer in front. Raising `max_connections` only moves the wall: each connection costs memory. |
| **A transaction is left open.** Code starts a transaction, then waits on something else (an HTTP call, a crashed worker). | A session `idle in transaction` for minutes. Dead rows grow although autovacuum runs. Other sessions wait on locks it holds. | `SELECT pg_terminate_backend(pid)`. Set `idle_in_transaction_session_timeout`. Fix the code so no slow work happens inside a transaction. |
| **A lock queue forms.** A schema change (`ALTER TABLE`) waits for one long query. Every new query on that table then queues behind the schema change. | Latency jumps at once for one table. CPU is low. Many sessions show `wait_event_type = 'Lock'`. | `SELECT pid, pg_blocking_pids(pid) FROM pg_stat_activity WHERE wait_event_type = 'Lock'` finds the head of the queue. Cancel the schema change, or the query it waits for. Run migrations with `SET lock_timeout = '5s'` so they fail fast and can be retried. |
| **A query does a full scan.** A missing index, or statistics so stale that the planner picks a bad plan. Often appears after a table grew or a release added a query. | CPU or disk I/O at 100%. One query dominates `pg_stat_statements` by total time. `EXPLAIN` shows `Seq Scan` on a big table. | `EXPLAIN (ANALYZE, BUFFERS)` the query. `CREATE INDEX CONCURRENTLY` for a missing index. `ANALYZE` the table if the row estimates in the plan are far from the real counts. |
| **Bloat.** Vacuum cannot keep up, or is blocked, so dead rows pile up. | A table and its indexes grow while the number of rows is stable. Queries get slower over weeks. `n_dead_tup` is high. | Find what blocks vacuum: an old transaction, an inactive replication slot, or a prepared transaction. Make autovacuum more aggressive on the hot table (`autovacuum_vacuum_scale_factor`). To give space back to the disk use `pg_repack`. `VACUUM FULL` locks the table for the whole run. |
| **The disk fills with WAL.** A replica or a consumer of a replication slot went away, or WAL archiving fails, so PostgreSQL keeps every WAL file. | `pg_wal` grows without stopping. `pg_replication_slots` shows a slot with `active = false`. At 100% the server stops with `No space left on device`. | Bring the consumer back or drop the slot (`pg_drop_replication_slot`). Fix the archive command. Set `max_slot_wal_keep_size` so a dead slot cannot fill the disk. Never delete files from `pg_wal` by hand. |
| **Replication lag grows.** The replica cannot apply changes as fast as the primary produces them. | Lag in bytes or seconds climbs. Users see old data on reads from replicas. | Check the replica: a long query there can pause replay, and a slower disk or network limits it. A huge write on the primary (a bulk update) creates a burst that takes time to pass. Send reads that must be fresh to the primary. |
| **Transaction ID wraparound gets close.** Vacuum has not been able to freeze old rows for a very long time. | Log warnings: `database "x" must be vacuumed within N transactions`. `age(datfrozenxid)` passes a billion. At the end the server refuses writes. | Remove whatever blocks vacuum (the same list as for bloat), then `VACUUM (FREEZE)` the oldest tables first. Alert on the age long before the warnings. |
| **Checkpoints come too often.** Heavy writes fill the WAL budget faster than the timed checkpoint. | Latency spikes at regular intervals. The log says `checkpoints are occurring too frequently`. | Raise `max_wal_size`. Keep `checkpoint_completion_target` at 0.9 so the writes are spread out. |
| **The kernel kills a backend for memory.** Many sessions each use `work_mem` several times for sorts and hashes. | All clients are disconnected at once. Log: `server process was terminated by signal 9`, then recovery. In Kubernetes the pod shows `OOMKilled`. | Lower `work_mem` and the number of connections. Size the container so that `shared_buffers` plus the sessions fit, with room to spare. |

## Elasticsearch and OpenSearch

### What to watch

| Signal | Where | Healthy | Worry when |
|---|---|---|---|
| Cluster status | `_cluster/health` | Green | Yellow that does not clear, or red |
| Unassigned shards | `_cluster/health`, `_cat/shards` | Zero | Any, for more than minutes |
| JVM heap used | `_cat/nodes?h=name,heap.percent` | A saw-tooth that drops after each GC | Stays above 85% |
| Rejected requests | `_cat/thread_pool/write,search?v` | `rejected` is zero and stays there | A counter that climbs |
| Disk used per node | `_cat/allocation?v` | Under 80% | Near 85% (the first watermark) |
| CPU and load per node | `_cat/nodes?v` | Similar on all data nodes | One node far above the others |
| Shards per node, and shard sizes | `_cat/shards?v`, `_cat/allocation?v` | Even counts, shards of 10 to 50 GB | Thousands of tiny shards, or one giant |
| Indexing and search latency | Node stats, or the exporter | Stable | A step up |
| Pending cluster tasks | `_cluster/pending_tasks` | Empty | A queue that does not drain |

### Common cases

| What happens | How it shows | What to do |
|---|---|---|
| **A hot shard or hot node.** Most writes or searches land on one shard: a routing key that is not spread evenly, one tenant much bigger than the rest, too few primary shards, or all primaries of the busy index on the same node. | One node at high CPU and heap while the others are idle. Clients get 429 `es_rejected_execution_exception` from that node. `_cat/shards` shows one shard far larger than its siblings. | `_nodes/hot_threads` and `_cat/thread_pool/write?v` confirm which node and what it is doing. Spread the index's shards (`index.routing.allocation.total_shards_per_node`). For skewed data: more primary shards (roll over to a new index, or split), a better routing key, or a separate index for the big tenant. |
| **A disk watermark is crossed.** Old data was never deleted, or a node was lost and its shards moved onto the rest. | At 85% the node receives no new shards. At 90% shards are moved away from it. At 95% its indexes become read-only and writes fail with `cluster_block_exception ... disk usage exceeded flood-stage watermark`. | Delete or shrink old indexes, add disk or nodes. The read-only block lifts by itself when disk use falls back under the 90% mark. Set up index lifecycle management so old data is removed automatically. |
| **The cluster is yellow or red.** A node left, or shards cannot be placed. | Yellow: some replica shards are unassigned, so there is no spare copy. Red: a primary shard is missing, so that index is partly unavailable. | `GET _cluster/allocation/explain` says exactly why a shard is unassigned. Usually: bring the node back. For a lost primary with no copy: restore from a snapshot. A single-node cluster is always yellow unless replicas are set to 0. |
| **Too many shards.** An index per day per customer, each with the default shards, for years. | Heap pressure although there is little data. Slow cluster state updates and slow restarts. New indexes fail: `this action would add [n] shards, but this cluster currently has [1000]/[1000] maximum normal shards open`. | Fewer, larger shards: roll over by size and not by day, shrink or reindex small indexes together, delete old ones. Raising `cluster.max_shards_per_node` hides the problem. |
| **Heap pressure and circuit breakers.** An aggregation over a field with millions of distinct values, sorting on a `text` field, or huge bulk requests. | Requests fail with 429 `circuit_breaking_exception: Data too large`. Long garbage-collection pauses in the log. Nodes drop out of the cluster and rejoin. | Find and fix the query. Send smaller bulks. Aggregate on `keyword` fields. Keep the heap at half of the machine's memory and under about 31 GB. A bigger heap does not help beyond that. |
| **Mapping explosion.** Documents with arbitrary keys (user-supplied JSON, labels as field names) create a new field for every key. | `Limit of total fields [1000] has been exceeded`. The cluster state grows and every update gets slower. | Turn off dynamic mapping for such objects, or map them as `flattened`. Do not raise the limit as the fix. |
| **Indexing falls behind during a bulk load.** More is sent than the cluster can index. | Write thread pool queue full, 429 rejections on all nodes, clients retrying. | Have clients back off and retry on 429. For a one-time load: raise `refresh_interval` and set replicas to 0 for the duration, then restore both. |

## Redis and Valkey

### What to watch

| Signal | Where (`INFO`) | Healthy | Worry when |
|---|---|---|---|
| Memory used against the limit | `used_memory`, `maxmemory` | Below the limit, or at it with steady eviction (a cache) | No `maxmemory` set at all |
| Evictions | `evicted_keys` | Zero or slow | A fast climb |
| Hit ratio | `keyspace_hits / (keyspace_hits + keyspace_misses)` | High and stable for your workload | A drop |
| Connected clients | `connected_clients`, `rejected_connections` | Stable | Near `maxclients`, or any rejections |
| Slow commands | `SLOWLOG GET`, `LATENCY DOCTOR` | Empty or rare | Regular entries |
| Operations per second | `instantaneous_ops_per_sec` | Follows traffic | A drop to near zero under load |
| Replication | `master_link_status`, replica offsets | Link up, offsets close | Link down, or a growing gap |
| Persistence | `rdb_last_bgsave_status`, `aof_last_write_status` | `ok` | Anything else |
| Fork time | `latest_fork_usec` | Milliseconds | Hundreds of milliseconds |
| Fragmentation | `mem_fragmentation_ratio` | Around 1.0 to 1.5 | Well above 1.5, or below 1 (swapping) |

### Common cases

| What happens | How it shows | What to do |
|---|---|---|
| **Memory is full and nothing may be evicted.** The eviction policy is `noeviction` (the default), and keys have no TTL. | Writes fail: `OOM command not allowed when used memory > 'maxmemory'`. Reads still work. | For a cache: `maxmemory-policy allkeys-lru` and a TTL on every key. Find what takes the space: `redis-cli --bigkeys`, `MEMORY USAGE key`. |
| **The cache is too small.** The working set no longer fits. | `evicted_keys` climbs, the hit ratio falls, and the database behind the cache gets busier. | More memory, shorter TTLs, smaller values (compress, store less). Check whether one feature started caching something large. |
| **One slow command blocks everyone.** Redis runs commands on one thread. `KEYS *`, a huge `SMEMBERS` or `LRANGE`, `DEL` of a key with millions of members, or a long Lua script. | Every client sees latency spikes at the same moments. `SLOWLOG GET` names the command. | `SCAN` in place of `KEYS`. `UNLINK` in place of `DEL` for big keys. Read big collections in pages. Block dangerous commands with ACLs. |
| **A hot key or a big key.** One key takes most of the traffic, or one key holds a huge value. | In a cluster, one shard is overloaded while the rest are idle. On a single node, the network is saturated by one key. | `redis-cli --hotkeys` (needs an LFU policy) and `--bigkeys` find them. Split the key, cache it in the application's memory for a few seconds, or read it from replicas. |
| **Saving stalls the server.** A snapshot forks the process. With a lot of memory the fork itself takes long, and pages changed during the save are copied, so memory use can nearly double. | Latency spikes at each save. `latest_fork_usec` is high. In a container: `OOMKilled` during a save. | Leave memory headroom beyond `maxmemory`. Turn off transparent huge pages. Run persistence on a replica and not on the primary. |
| **A cold cache after a restart.** Redis comes back empty and every request is a miss. | A spike of load and latency on the database right after a Redis restart or failover. | Warm the cache before taking traffic, or bring traffic back gradually. Add random jitter to TTLs so entries do not all expire together. Let one request rebuild an entry while the others wait. |
| **A connection storm.** Applications open a connection per request, or all reconnect at once after a blip. | `connected_clients` at `maxclients`, clients get `max number of clients reached`. | Connection pools in the applications, with backoff on reconnect. |

## MongoDB

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

## Kafka

Kafka is not a database, but it holds data and fails like one. The basics are in [Kafka](../08-services/kafka.md).

### What to watch

| Signal | Healthy | Worry when |
|---|---|---|
| Consumer lag per group | Small and stable, or rising and falling with traffic | Rising without end |
| Under-replicated partitions | Zero | Above zero for more than minutes |
| Offline partitions | Zero | Any: those partitions cannot be read or written |
| Active controller count | Exactly one in the cluster | Zero, or more than one |
| In-sync replica shrink rate | Near zero | Frequent shrinks and expands |
| Disk used per broker | Under 75% | Climbing toward full |
| Consumer group state | `Stable` | `PreparingRebalance` again and again |
| Request latency (produce, fetch) | Stable | A step up |

### Common cases

| What happens | How it shows | What to do |
|---|---|---|
| **Lag grows.** Consumers handle messages more slowly than producers write them. | Lag on every partition of the topic climbs. The data is correct and late. | Add consumers to the group, up to the number of partitions. Make the handling faster. More partitions if consumers are already at the limit. |
| **A hot partition.** Messages are keyed by something uneven (one big customer). | Lag on one partition only, while its siblings are at zero. Adding consumers does not help. | A key that spreads better, or special handling for the big key. |
| **A rebalance storm.** Handling one batch takes longer than `max.poll.interval.ms`, so the consumer is thrown out of the group, rejoins, and the group rebalances, again and again. | Lag grows although consumers are running. The group state flips to `PreparingRebalance`. Consumer logs repeat messages about leaving and joining the group. | Smaller batches (`max.poll.records`), a longer `max.poll.interval.ms`, faster handling. Static membership (`group.instance.id`) reduces rebalances on restarts. |
| **Under-replicated partitions.** A broker is down, slow, or cut off. | The count is above zero. Producers with `acks=all` slow down or fail if too few replicas remain. | Find the broker that is missing from the in-sync lists and fix it (often disk or network). Do not restart other brokers until it is back. |
| **A broker's disk fills.** Retention is set by time only and traffic grew. | The broker stops, its partitions go under-replicated or offline. | Free space by lowering retention on the largest topics, then add a size limit (`retention.bytes`) and an alert on disk use. |

## Try it in the lab

The [lab](../13-lab/_index.md) runs PostgreSQL, Redis, Kafka and Elasticsearch with exporters and a dashboard, so several of these cases can be caused on purpose and watched. The [experiments page](../13-lab/experiments.md) walks through them: exhausting PostgreSQL connections, a transaction left open, Redis evictions, Kafka lag and a yellow Elasticsearch cluster.

## Where it goes next

- More systems: MySQL, ClickHouse, Cassandra.
- A runbook per case, with the exact commands and the decisions in order.
- Alert rules for every "worry when" in this page.

## See also

- [PostgreSQL](postgres.md), [Operating a database](operations.md), [Replication and scaling](replication.md)
- [Search](../08-services/search.md), [Caching and Redis](../08-services/caching.md), [Messaging and queues](../08-services/messaging.md)
- [Observability](../09-observability/concepts.md): how to turn these signals into alerts
