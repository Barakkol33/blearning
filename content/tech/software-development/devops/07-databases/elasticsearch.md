---
title: Elasticsearch
order: 6
lang: en
tags: [intro, advanced]
updated: 2026-11-15
---

# Elasticsearch

A distributed search and analytics engine built on Lucene. Optimized for full-text search, filtering, and near real-time aggregation over large datasets. It is also the classic store for logs. OpenSearch is a fork with a very similar API, and everything here applies to it too.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

What search engines are for, the tools around them and a first example with `curl` are in [Search](../08-services/search.md). This section lists the concepts of Elasticsearch itself.

### Key concepts

- **Index** – Logical namespace for documents (like a DB/table).
- **Document** – JSON record you search over.
- **Field / Mapping** – Field types and how they’re indexed (text, keyword, date, numeric).
- **Inverted Index** – Core search structure enabling fast text search.
- **Analyzer** – How text is tokenized/normalized (tokenizer + filters).
- **Shard** – A partition of an index; enables horizontal scale. Each index is split into primary shards, each with multiple replicas.
  - **Primary** – Source-of-truth for the index.
  - **Replica** – Copy for availability + read scaling.
- **Query DSL** – JSON-based query language (match, bool, term, range, aggregations).
- **Aggregations** – Built-in analytics (histograms, terms, metrics).
- **Near real-time** – Data searchable shortly after indexing (refresh interval).

### Examples

Get all:

```json
GET <index>/_search
{
  "query": {
    "match_all": {}
  }
}
```

Search:

```json
GET <index>/_search
{
  "query": {
    "match": {
      "type": {
        "query": "process"
      }
    }
  }
}
```

## Advanced

Keeping a cluster healthy: the signals to watch, and the incidents that repeat everywhere. The questions that apply to every data system are in [Database health](health.md).

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

### Alert rules

Prometheus rules for the signals above, as loaded by the [lab](../13-lab/_index.md) (`infra/monitoring.ts`). The severities and what the rules cannot see are explained in [Database health](health.md#from-signals-to-alerts).

| Alert | Expression | Severity |
|---|---|---|
| ElasticsearchRed | `elasticsearch_cluster_health_status{color="red"} == 1` | page |
| ElasticsearchYellow | `elasticsearch_cluster_health_status{color="yellow"} == 1`, for 5 minutes | ticket |
| ElasticsearchHeapHigh | heap used / heap max `> 0.9`, for 5 minutes | ticket |
| ElasticsearchDiskHigh | data disk more than 80% full | ticket |
| ElasticsearchWriteRejections | `increase(elasticsearch_thread_pool_rejected_count{type="write"}[5m]) > 0` | ticket |

## In the lab

[Experiment 9](../13-lab/experiments.md) shows a yellow cluster, explains it with `_cluster/allocation/explain` and fixes it.

## See also

- [Search](../08-services/search.md): the concept, the tools and a small example
- [Database health](health.md), [Replication and scaling](replication.md)
- [Loki](../09-observability/loki.md): a lighter store for logs
