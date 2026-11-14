---
title: Caching and Redis
order: 3
lang: en
tags: [intro]
updated: 2026-11-13
---

# Caching and Redis

**Level: intro**

A cache keeps the answer to an expensive question in memory, so the next ask is fast. It is the cheapest way to speed up a system and to take load off a database. The price is that the cached answer can be out of date.

## Terms

| Term | Meaning |
|---|---|
| Cache hit / miss | The answer was in the cache / it was not, and the slow source was asked |
| Hit ratio | The share of requests answered from the cache |
| TTL | Time to live: how long an entry stays before it expires |
| Eviction | Removing entries when memory is full. The usual policy is LRU: least recently used first |
| Cache-aside | The common pattern: the application checks the cache, on a miss reads the database and fills the cache |
| Invalidation | Removing or updating an entry when the source data changed |
| Stale data | A cached value that no longer matches the source |
| Cache stampede | A popular entry expires and many requests hit the database at once to rebuild it |
| Cold cache | An empty cache, after a restart. Everything is a miss and the database takes the full load |
| In-memory store | A database that keeps its data in RAM. Fast, and limited by memory |
| CDN | A cache for HTTP content, on servers near the users |

## The tools

| Tool | Notes |
|---|---|
| **Redis** | The standard. More than a cache: lists, sets, sorted sets, streams, pub/sub, optional persistence |
| **Valkey** | An open-source fork of Redis under the Linux Foundation, created in 2024 after Redis changed its license. Compatible, and what several clouds now offer |
| **Memcached** | Simple key-value cache, nothing else. Very fast, no persistence |
| Managed | AWS ElastiCache, Azure Cache for Redis, GCP Memorystore |
| CDN | Cloudflare, CloudFront, Fastly |

Besides caching, Redis is commonly used for sessions, rate limiting, distributed locks, leaderboards and simple queues.

## A small example

```bash
docker run -d --name redis -p 6379:6379 redis:7
docker exec -it redis redis-cli
```

```text
SET user:42:name "Dana" EX 30     # store with a TTL of 30 seconds
GET user:42:name                  # "Dana"
TTL user:42:name                  # seconds left
                                  # ...after 30 seconds:
GET user:42:name                  # (nil)  -> a miss

INCR page:home:views              # an atomic counter: 1, 2, 3...

INFO stats                        # look for keyspace_hits and keyspace_misses
```

Cache-aside in code:

```python
import json
import redis

cache = redis.Redis()

def get_user(user_id: int) -> dict:
    key = f"user:{user_id}"
    cached = cache.get(key)
    if cached:                                    # hit
        return json.loads(cached)
    user = load_user_from_database(user_id)       # miss: the slow path
    cache.set(key, json.dumps(user), ex=300)      # keep for 5 minutes
    return user

def update_user(user_id: int, data: dict) -> None:
    save_user_to_database(user_id, data)
    cache.delete(f"user:{user_id}")               # invalidate
```

## What to remember when operating one

- **Set a memory limit and an eviction policy** (`maxmemory`, `maxmemory-policy allkeys-lru`). Without them Redis grows until it is killed.
- **A cache must be allowed to be empty.** If the system cannot survive a cold cache, the cache has become a database, and needs to be run like one.
- **Always set a TTL.** It bounds how stale any value can get.
- Watch the hit ratio, memory, evictions and latency.

## Where it goes next

- Beginner: sessions and rate limiting with Redis, measuring the effect of a cache on a slow endpoint.
- Advanced: persistence (RDB, AOF), replication and Sentinel, Redis Cluster, stampede protection, cache design for consistency.

## See also

- [Replication and scaling](../07-databases/replication.md): caching as a scaling step
- [Proxies and load balancers](proxies.md)
