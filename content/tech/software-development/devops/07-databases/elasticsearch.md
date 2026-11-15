---
title: Elasticsearch
order: 6
lang: en
tags: [intro, advanced]
updated: 2026-11-15
---

# Elasticsearch

Elasticsearch is a distributed search and analytics engine built on the Lucene library. It finds text by relevance, filters and aggregates over large amounts of data in near real time, and is the classic store for logs. OpenSearch is a fork with a very similar API, and everything here applies to it too.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

What search engines are for, and the tools around them, are in [Search](../08-services/search.md). This section is about Elasticsearch itself.

### Terms

| Term | Meaning |
|---|---|
| Document | One JSON record. The unit that is stored and searched |
| Index | A collection of documents with one mapping, like a table |
| Mapping | The schema: the type of each field, and so how it is indexed |
| `text` field | Analyzed: split into lowercase words, for full-text search with a `match` query |
| `keyword` field | Stored as one exact value, for filters, sorting and aggregations with a `term` query |
| Analyzer | The steps that turn text into terms: a tokenizer and filters |
| Inverted index | For each term, the list of documents that contain it. What makes search fast |
| Shard | A piece of an index, and a Lucene index of its own. An index has a fixed number of primary shards |
| Replica | A copy of a shard on another node, for survival and for read capacity |
| Node roles | Master (manages the cluster), data (holds shards), ingest, coordinating |
| Refresh | Makes newly indexed documents searchable. Once a second by default, which is the "near" in near real time |
| Query DSL | The JSON query language: `match`, `term`, `range`, `bool` |
| Aggregation | Statistics over the matching documents: counts per value, averages, histograms |
| Index lifecycle management (ILM) | Automatic rollover to a new index, and deletion of old ones |
| Snapshot | A backup of indexes to object storage |

### What is different about it

- **The mapping decides what you can ask.** A field mapped as `text` can be searched by words and cannot be aggregated well. A field mapped as `keyword` is the opposite. Decide before the data arrives: changing the type of a field means reindexing.
- **The number of primary shards is fixed** when the index is created. Too few and the index cannot spread, too many and the cluster drowns in small shards.
- **It is not the source of truth.** Keep the primary data elsewhere, and be able to index it again.

### A small example: a mapping, two kinds of query, an aggregation

```bash
docker run -d --name es -p 9200:9200 \
  -e discovery.type=single-node -e xpack.security.enabled=false \
  -e ES_JAVA_OPTS="-Xms512m -Xmx512m" \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.0
```

Wait about half a minute. Then create an index with an explicit mapping, and index four log lines:

```bash
curl -s -X PUT localhost:9200/logs -H 'Content-Type: application/json' -d '{
  "settings": { "number_of_shards": 1, "number_of_replicas": 0 },
  "mappings": { "properties": {
    "time":    { "type": "date" },
    "service": { "type": "keyword" },
    "level":   { "type": "keyword" },
    "message": { "type": "text" },
    "ms":      { "type": "integer" }
  } }
}'

curl -s -X POST 'localhost:9200/logs/_bulk?refresh' -H 'Content-Type: application/x-ndjson' --data-binary '{"index":{}}
{"time":"2026-11-15T10:00:00Z","service":"api","level":"error","message":"Payment failed for order 17","ms":950}
{"index":{}}
{"time":"2026-11-15T10:00:05Z","service":"api","level":"info","message":"Payment succeeded for order 18","ms":120}
{"index":{}}
{"time":"2026-11-15T10:00:09Z","service":"worker","level":"error","message":"Email to customer failed","ms":3000}
{"index":{}}
{"time":"2026-11-15T10:00:12Z","service":"worker","level":"info","message":"Order 18 shipped","ms":40}
'
```

Full-text search on the `text` field. Case does not matter, and results come back best match first:

```bash
curl -s 'localhost:9200/logs/_search?filter_path=hits.hits._source.message,hits.hits._score' \
  -H 'Content-Type: application/json' -d '{"query": {"match": {"message": "payment FAILED"}}}'
```

```text
1.29  Payment failed for order 17         both words
0.71  Email to customer failed            one word
0.65  Payment succeeded for order 18      one word
```

An exact filter on the `keyword` field, and the same kind of query on the `text` field:

```bash
# 2 hits
curl -s 'localhost:9200/logs/_search?filter_path=hits.total.value' \
  -H 'Content-Type: application/json' -d '{"query": {"term": {"level": "error"}}}'

# 0 hits: a keyword is exact, and "Error" is not "error"
curl -s 'localhost:9200/logs/_search?filter_path=hits.total.value' \
  -H 'Content-Type: application/json' -d '{"query": {"term": {"level": "Error"}}}'

# 0 hits: the text field was indexed as the lowercase word "payment"
curl -s 'localhost:9200/logs/_search?filter_path=hits.total.value' \
  -H 'Content-Type: application/json' -d '{"query": {"term": {"message": "Payment"}}}'
```

The third query is the most common mistake with Elasticsearch: a `term` query on a `text` field. Use `match` for text and `term` for keywords.

And an aggregation: errors per service, with the slowest one in each:

```bash
curl -s 'localhost:9200/logs/_search?filter_path=aggregations' -H 'Content-Type: application/json' -d '{
  "size": 0,
  "query": { "term": { "level": "error" } },
  "aggs": { "by_service": { "terms": { "field": "service" },
                            "aggs": { "slowest": { "max": { "field": "ms" } } } } }
}'
# api: 1 error, slowest 950.   worker: 1 error, slowest 3000.

curl -s 'localhost:9200/_cat/indices/logs?v'     # green: the index asked for 0 replicas
docker rm -f es
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
