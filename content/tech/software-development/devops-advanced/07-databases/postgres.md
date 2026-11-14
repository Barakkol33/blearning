---
title: PostgreSQL
order: 2
lang: en
tags: [intro]
updated: 2026-11-13
---

# PostgreSQL

**Level: intro**

PostgreSQL is the default relational database today: open source, reliable, rich in features, and offered as a managed service by every cloud. This guide uses it as the main example. What you learn on it carries over to MySQL and others with small changes.

## Terms

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

## What is different about it

- **One process per connection.** A thousand idle connections cost real memory. Applications connect through a pooler.
- **Updates create new row versions** ([MVCC](internals.md)). Vacuum must keep up, or tables bloat. A long-open transaction blocks vacuum from cleaning.
- **Everything is in the catalog.** Sizes, activity, locks and statistics are all tables and views you query with SQL.

## A small example: look inside a running server

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

## Managed or self-run

| | Managed (RDS, Cloud SQL, Azure Database) | Self-run (VM, or Kubernetes with an operator such as CloudNativePG) |
|---|---|---|
| Backups, failover, patching | Done for you | Yours to build and test |
| Control | Limited: no superuser, fixed extensions | Full |
| Cost | Higher price, less work | Lower price, more work |

Managed is the right default. You still need everything in this chapter: the provider keeps the server up, and slow queries, bloat and bad schemas remain yours.

## Where it goes next

- Beginner: roles and permissions, `pg_stat_statements`, PgBouncer, basic configuration.
- Advanced: vacuum and bloat in depth, locks, memory and checkpoint tuning, partitioning, upgrades.

## See also

- [How databases work](internals.md), [Replication and scaling](replication.md), [Operating a database](operations.md)
