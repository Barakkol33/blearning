---
title: ClickHouse
order: 9
lang: en
tags: [intro]
updated: 2026-11-15
---

# ClickHouse

ClickHouse is a columnar database for analytics: questions such as "requests per service per minute over the last month" over billions of rows, answered in under a second. It is built for appending large amounts of data and scanning it fast, and it is poor at what PostgreSQL does well: many small transactions that update single rows. It is widely used for logs, metrics, events and product analytics.

**Levels on this page:** [Intro](#intro)

## Intro

### Terms

| Term | Meaning |
|---|---|
| OLTP / OLAP | Many small transactions on single rows (PostgreSQL) / few large queries over many rows (ClickHouse) |
| Columnar storage | Each column is stored separately. A query reads only the columns it uses, and similar values next to each other compress very well |
| MergeTree | The main family of table engines. Data is written in parts, which are merged in the background |
| Part | An immutable chunk of a table, created by an insert |
| `ORDER BY` (sorting key) | The order of rows on disk. The most important design decision of a table |
| Primary key | A prefix of the sorting key. It is not unique and enforces nothing |
| Sparse index | One index entry per granule and not per row, so the index is tiny and fits in memory |
| Granule | The smallest block that is read: 8,192 rows by default |
| Partition | A slice of the table, usually a day or a month. Old partitions are dropped in one cheap step |
| Materialized view | A query that runs on every insert and writes its result to another table: aggregation as the data arrives |
| ReplicatedMergeTree | The replicated engine, coordinated by ClickHouse Keeper |
| Distributed table | One logical table over several shards |
| TTL | Automatic deletion, or moving to cheaper storage, by age |

### What is different about it

- **Insert in batches.** Every insert creates a part. Thousands of single-row inserts a second create more parts than the merges can handle, and the server answers `Too many parts`. Batch in the client, or use asynchronous inserts.
- **No real updates.** Updates and deletes exist as heavy background rewrites. Model the data as append-only events.
- **The sorting key is the index.** A filter on the leading columns of `ORDER BY` skips most of the data. A filter on anything else reads the whole column.
- **Wide tables, few joins.** Put what you need in one table.

### A small example: ten million rows on a laptop

```bash
docker run -d --name ch -e CLICKHOUSE_SKIP_USER_SETUP=1 clickhouse/clickhouse-server:25.8
docker exec -it ch clickhouse-client
```

```sql
CREATE TABLE requests
(
    time        DateTime,
    service     LowCardinality(String),
    status      UInt16,
    duration_ms UInt32
)
ENGINE = MergeTree
PARTITION BY toYYYYMMDD(time)
ORDER BY (service, time);

-- 10 million generated requests, spread over the last 24 hours
INSERT INTO requests
SELECT now() - toIntervalSecond(number % 86400),
       ['api', 'web', 'worker'][number % 3 + 1],
       if(number % 50 = 0, 500, 200),
       20 + number % 400
FROM numbers(10000000);

-- The dashboard question: load, error rate and latency per service in the last hour
SELECT service,
       count()                                          AS requests,
       round(100 * countIf(status >= 500) / count(), 2) AS error_pct,
       quantile(0.95)(duration_ms)                      AS p95_ms
FROM requests
WHERE time > now() - INTERVAL 1 HOUR
GROUP BY service
ORDER BY service;
```

```text
┌─service─┬─requests─┬─error_pct─┬─p95_ms─┐
│ api     │   139200 │         2 │    399 │
│ web     │   139084 │         2 │    399 │
│ worker  │   139084 │         2 │    400 │
└─────────┴──────────┴───────────┴────────┘
3 rows in set. Elapsed: 0.015 sec.
```

Fifteen milliseconds over ten million rows, on a laptop. And the size on disk:

```sql
SELECT formatReadableSize(sum(data_uncompressed_bytes)) AS raw,
       formatReadableSize(sum(data_compressed_bytes))   AS on_disk,
       count()                                          AS parts
FROM system.parts
WHERE table = 'requests' AND active;
-- raw: 104.93 MiB    on_disk: 3.17 MiB    parts: 8
```

The data takes 3% of its raw size, because each column holds similar values. Generated data compresses better than real data, where a factor of 5 to 10 is common.

```bash
docker rm -f ch
```

## See also

- [How databases work](internals.md): row storage, for comparison
- [Database health](health.md)
