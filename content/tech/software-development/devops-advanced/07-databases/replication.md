---
title: Replication and scaling
order: 3
lang: en
tags: [intro]
updated: 2026-11-13
---

# Replication and scaling

**Level: intro**

One database server is a single point of failure and has a ceiling. Replication keeps copies on other servers, for survival and for spreading reads. Sharding splits the data itself over servers, for spreading writes. Both add failure modes that you must understand before you rely on them.

## Terms

| Term | Meaning |
|---|---|
| Primary (leader) | The server that accepts writes |
| Replica (standby, follower) | A server that receives the primary's changes and can serve reads |
| Asynchronous replication | The primary confirms a write before the replica has it. Fast, and a crash can lose the last moments |
| Synchronous replication | The primary waits for a replica to confirm. Nothing is lost, and writes are slower |
| Replication lag | How far a replica is behind the primary, in time or bytes |
| Failover | Promoting a replica to primary when the primary fails |
| Split brain | Two servers both believe they are primary and accept different writes. The worst outcome |
| High availability (HA) | A setup that survives a server failure with little or no downtime |
| Read replica | A replica used to take read queries off the primary |
| Vertical scaling | A bigger server |
| Horizontal scaling | More servers |
| Partitioning | Splitting one table into parts inside one server, e.g. by month |
| Sharding | Splitting data across servers by a key, e.g. by customer |
| Quorum | A majority of nodes that must agree. With 3 nodes, 2 |
| Consensus (Raft, Paxos) | Algorithms by which nodes agree on one leader and one order of writes despite failures |
| CAP theorem | When the network splits, a distributed system must choose: stay consistent, or stay available |

## The usual order of scaling

Each step is harder than the one before, so take them in order:

1. **Fix the queries and indexes.** Most "the database is too small" problems are one missing index.
2. **Scale up.** A bigger machine is one click and no new failure modes.
3. **Cache** hot reads (see [Caching](../08-services/caching.md)).
4. **Read replicas** for read-heavy load. The application must accept slightly stale reads.
5. **Partition** very large tables.
6. **Shard**, or move to a database built to scale out (Spanner, CockroachDB, Cassandra, DynamoDB). A last resort: queries across shards and rebalancing are hard.

## A small example: measuring replication lag

On a PostgreSQL primary, one row per connected replica:

```sql
SELECT client_addr, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

On a replica:

```sql
SELECT pg_is_in_recovery();                              -- true on a replica
SELECT now() - pg_last_xact_replay_timestamp() AS lag;   -- time since the last replayed change
```

What lag means in practice: a user saves a profile (a write to the primary), the page reloads from a replica 200 ms behind, and the old profile appears. The fix is in the application: read your own writes from the primary.

And for failover: with asynchronous replication and a lag of 2 seconds, promoting the replica loses the last 2 seconds of confirmed writes. That number is your real RPO (see [Operating a database](operations.md)).

## Who does the failover

Failover must be automatic and must never produce two primaries. That takes a consensus store that holds the answer to "who is the leader".

| Setup | Failover by |
|---|---|
| Managed cloud database, multi-zone | The provider |
| PostgreSQL on VMs | Patroni (with etcd or Consul) |
| PostgreSQL on Kubernetes | An operator: CloudNativePG, Zalando, Crunchy |
| MongoDB, Cassandra, CockroachDB | Built into the database |

## Where it goes next

- Beginner: a primary and a streaming replica with Docker Compose, a manual failover.
- Advanced: synchronous replication and quorum commits, logical replication, Patroni internals, failover drills, sharding strategies, how Raft works.

## See also

- [How databases work](internals.md): the WAL, which is what gets replicated
- [SRE](../11-reliability/sre.md)
