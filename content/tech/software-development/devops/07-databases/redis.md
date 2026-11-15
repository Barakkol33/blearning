---
title: Redis
order: 7
lang: en
tags: [intro, advanced]
updated: 2026-11-15
---

# Redis

Redis is a data store that keeps everything in memory, which makes it very fast: a single server answers tens of thousands of commands a second. It is the standard cache, and it is also used for sessions, rate limits, locks, counters and simple queues. Valkey is an open-source fork that is compatible with it, and everything here applies to it too.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

Caching as a pattern, and cache-aside in code, are in [Caching and Redis](../08-services/caching.md). This section is about Redis itself.

### Terms

| Term | Meaning |
|---|---|
| Key | The name of a value. By convention parts are joined with colons: `user:42:cart` |
| String, hash, list, set, sorted set, stream | The value types. Each has its own commands |
| TTL / expiration | A time after which the key is deleted automatically |
| Single-threaded | Commands run one at a time. Every command is atomic, and one slow command delays all the others |
| `maxmemory` | The memory limit. Without it Redis grows until the operating system kills it |
| Eviction policy | What to remove when memory is full: `allkeys-lru` for a cache. The default is `noeviction`, which refuses writes |
| RDB | Persistence by snapshots: the whole dataset written to a file from time to time |
| AOF | Persistence by a log: every write appended to a file |
| Replica | A read-only copy that follows a primary |
| Sentinel | Processes that watch a primary and promote a replica when it fails |
| Redis Cluster | Sharding: keys are divided over several primaries by a hash of the key |
| Pub/Sub | Messages broadcast to whoever is listening now. Nothing is stored |
| Pipeline | Several commands sent in one network round trip |
| Lua script | Several commands run on the server as one atomic step |

### What is different about it

- **Memory is the database.** The dataset must fit in RAM, and memory is the first thing to watch.
- **One thread.** No locks are needed, and one `KEYS *` on a large database stops everyone.
- **Data can be lost by design.** With the default persistence, a crash loses the last seconds or minutes of writes. That is fine for a cache and must be a decision for anything else.

### A small example: five jobs for one server

```bash
docker run -d --name redis redis:7
docker exec -it redis redis-cli
```

```text
# 1. A session that expires by itself
SET session:abc '{"user":42}' EX 1800
TTL session:abc                              # 1800

# 2. An object with fields
HSET user:42 name Dana plan pro
HGETALL user:42                              # name, Dana, plan, pro

# 3. A queue
LPUSH jobs send-email resize-image
RPOP jobs                                    # "send-email": first in, first out

# 4. A leaderboard, kept sorted by score
ZADD scores 120 dana 95 omer 150 noa
ZREVRANGE scores 0 1 WITHSCORES              # noa 150, dana 120

# 5. A lock: NX sets the key only if it does not exist
SET lock:report worker-1 NX EX 30            # OK: worker-1 has the lock for 30 seconds
SET lock:report worker-2 NX EX 30            # (nil): taken

# And a rate limit: count the requests of one client in a minute
INCR rate:ip:1.2.3.4                         # 1
EXPIRE rate:ip:1.2.3.4 60

CONFIG GET maxmemory-policy                  # noeviction: the default
```

```bash
docker rm -f redis
```

Each of these would take a table, an index and a background job in a relational database. Here each one is a command, which is why Redis ends up next to almost every application.

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
