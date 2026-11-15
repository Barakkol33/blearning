---
title: ClickHouse
order: 9
lang: en
tags: [intro]
updated: 2026-11-15
---

# ClickHouse

A high-performance, columnar database for real-time analytics on huge datasets. Built for fast aggregations and scans (dashboards, logs, events), not for lots of tiny transactional updates.

**Levels on this page:** [Intro](#intro)

## Intro

### Key concepts

- **Columnar Storage** – Data stored by column, so analytic queries that touch a few columns fly.
- **Table Engines** – Define how data is stored/replicated:
  - _MergeTree family_ – Default for large analytic tables; supports partitioning, sorting, TTL.
  - _ReplacingMergeTree / SummingMergeTree / AggregatingMergeTree_ – Variants for dedup or pre-aggregation.
- **Partitions** – Logical data chunks (often by date). Helps pruning during queries.
- **Primary Key / ORDER BY** – Not a uniqueness constraint; defines sort order on disk for fast range scans.
- **Sparse Indexing** – Index stores marks per granule, enabling skipping big blocks quickly.
- **Granules** – Smallest unit of data read (default ~8192 rows). Important for scan efficiency.
- **Materialized Views** – Precompute/roll up data into another table automatically.
- **Distributed Tables** – Query multiple shards as one logical table.
- **Replication** – Via ReplicatedMergeTree engines (coordinated with ZooKeeper/ClickHouse Keeper).
- **Compression** – Very strong due to columnar layout; huge space savings.
- **Joins** – Supported, but performance depends on data size and join type; design to minimize heavy joins.
- **INSERT-heavy, UPDATE-light** – Updates/deletes exist but are more expensive; best used append-only.

## See also

- [How databases work](internals.md): row storage, for comparison
- [Database health](health.md)
