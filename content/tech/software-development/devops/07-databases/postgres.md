---
title: PostgreSQL
order: 2
lang: en
tags: [intro, advanced]
updated: 2026-11-15
---

# PostgreSQL

PostgreSQL is the default relational database today: open source, reliable, rich in features, and offered as a managed service by every cloud. This guide uses it as the main example. What you learn on it carries over to MySQL and others with small changes.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

### Terms

| Term | Meaning |
|---|---|
| Cluster (PostgreSQL) | One running server with its data directory. It holds several databases |
| Database / schema / table | The levels of organization. A schema is a namespace inside a database |
| Role | A user or a group. Permissions are granted to roles |
| Backend process | PostgreSQL starts one operating-system process per client connection |
| Connection pooler | A proxy that lets many clients share a few real connections (PgBouncer) |
| `shared_buffers` | The size of PostgreSQL's page cache. Commonly about 25% of the machine's memory |
| `max_connections` | The limit on connections. Each costs memory, so it stays in the hundreds |
| Tuple | A row version. An update writes a new tuple and leaves the old one dead |
| Dead tuple | An old row version that no transaction can see any more |
| VACUUM | Frees the space of dead tuples for reuse |
| Autovacuum | The background process that runs vacuum automatically |
| Bloat | Space held by dead tuples that vacuum has not reclaimed. It makes tables large and slow |
| Extension | A plugin: `pg_stat_statements` (query statistics), `postgis` (geography), `pgvector` (vectors) |
| `psql` | The command-line client |

### What is different about it

- **One process per connection.** A thousand idle connections cost real memory. Applications connect through a pooler.
- **Updates create new row versions** ([MVCC](internals.md)). Vacuum must keep up, or tables bloat. A long-open transaction blocks vacuum from cleaning.
- **Everything is in the catalog.** Sizes, activity, locks and statistics are all tables and views you query with SQL.

### A small example: look inside a running server

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:17
docker exec -it pg psql -U postgres
```

```sql
-- Who is connected and what are they running?
SELECT pid, usename, state, now() - query_start AS running_for, left(query, 60) AS query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY running_for DESC;

-- How big is each database?
SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;

-- Which tables have the most dead rows, and when were they last vacuumed?
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;

-- Important settings
SHOW shared_buffers;
SHOW max_connections;

-- Stop a query that runs too long (politely), by its pid
SELECT pg_cancel_backend(12345);
```

`pg_stat_activity` is the first place to look in any PostgreSQL incident: it shows the long queries, the waiting ones, and the connections stuck "idle in transaction".

And a role with only the access an application needs:

```sql
CREATE ROLE app LOGIN PASSWORD 'change-me';
CREATE DATABASE shop OWNER app;
```

### Managed or self-run

| | Managed (RDS, Cloud SQL, Azure Database) | Self-run (VM, or Kubernetes with an operator such as CloudNativePG) |
|---|---|---|
| Backups, failover, patching | Done for you | Yours to build and test |
| Control | Limited: no superuser, fixed extensions | Full |
| Cost | Higher price, less work | Lower price, more work |

Managed is the right default. You still need everything in this chapter: the provider keeps the server up, and slow queries, bloat and bad schemas remain yours.

## Advanced

Keeping a PostgreSQL server healthy: the signals to watch, and the incidents that repeat everywhere. The questions that apply to every data system are in [Database health](health.md).

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

### Alert rules

Prometheus rules for the signals above, as loaded by the [lab](../13-lab/_index.md) (`infra/monitoring.ts`). The severities and what the rules cannot see are explained in [Database health](health.md#from-signals-to-alerts).

| Alert | Expression | Severity |
|---|---|---|
| PostgresDown | `pg_up == 0` | page |
| PostgresConnectionsNearLimit | `sum(pg_stat_activity_count) / max(pg_settings_max_connections) > 0.8` | ticket |
| PostgresIdleInTransaction | `max(pg_stat_activity_max_tx_duration{state="idle in transaction"}) > 60` | ticket |
| PostgresLongTransaction | `max(pg_stat_activity_max_tx_duration{state="active"}) > 300` | ticket |
| PostgresDeadlocks | `increase(pg_stat_database_deadlocks[5m]) > 0` | ticket |
| PostgresDeadRows | dead rows above 20% of live rows, for 10 minutes | ticket |
| PostgresCacheHitRatioLow | `blks_hit / (blks_hit + blks_read) < 0.95`, for 10 minutes | ticket |

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

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

## In the lab

The [lab experiments](../13-lab/experiments.md) reproduce three of these cases on a running server: a lock queue behind an open transaction (experiment 7), running out of connections (8), and looking inside with `pg_stat_statements` and `EXPLAIN` (6).

## See also

- [How databases work](internals.md), [Replication and scaling](replication.md), [Operating a database](operations.md), [Database health](health.md)
