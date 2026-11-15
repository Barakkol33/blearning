---
title: Redis
order: 7
lang: en
tags: [intro, advanced]
updated: 2026-11-15
---

# Redis

An in-memory key-value data store. Extremely fast; used as cache, message broker, or lightweight database. Can persist to disk but primarily memory-first. Valkey is an open-source fork that is compatible with it, and everything here applies to it too.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

Caching as a pattern, a first session with `redis-cli` and cache-aside in code are in [Caching and Redis](../08-services/caching.md). This section lists the concepts of Redis itself.

### Key concepts

- **Key-Value Store** – Data accessed by key.
- **Data Structures** – Strings, hashes, lists, sets, sorted sets, streams, bitmaps, hyperloglogs.
- **TTL / Expiration** – Keys auto-expire; core to caching.
- **Persistence:**
  - RDB snapshots (periodic dump)
  - AOF – Append Only File (log of writes)
- **Replication** – Primary + replicas for read scaling / high availability.
- **Sentinel** – Monitoring + automatic failover.
- **Cluster Mode** – Sharding across nodes.
- **Pub/Sub** – Message broadcasting channel system.
- **Lua Scripting** – Atomic server-side logic.
- **Pipelining** – Batch commands to reduce network overhead.

### Resources

- https://redis.io/try-free/

## Advanced

Keeping a Redis server healthy: the signals to watch, and the incidents that repeat everywhere. The questions that apply to every data system are in [Database health](health.md).

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

### Alert rules

Prometheus rules for the signals above, as loaded by the [lab](../13-lab/_index.md) (`infra/monitoring.ts`). The severities and what the rules cannot see are explained in [Database health](health.md#from-signals-to-alerts).

| Alert | Expression | Severity |
|---|---|---|
| RedisDown | `redis_up == 0` | page |
| RedisEvicting | `rate(redis_evicted_keys_total[1m]) > 0`, for 2 minutes | ticket |
| RedisRejectedConnections | `increase(redis_rejected_connections_total[5m]) > 0` | page |

## In the lab

[Experiment 5](../13-lab/experiments.md) empties the cache, fills Redis past its memory limit to see evictions, and then switches the policy to `noeviction` to see writes fail.

## See also

- [Caching and Redis](../08-services/caching.md): the pattern, the tools and a small example
- [Database health](health.md)
