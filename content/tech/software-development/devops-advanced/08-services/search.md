---
title: Search
order: 3
lang: en
tags: [intro]
updated: 2026-11-13
---

# Search

**Level: intro**

A relational database finds rows by exact values. It is poor at "find documents that mention these words, best match first". Search engines are built for that, and the same engines became the standard place to store and query logs. A DevOps engineer usually meets them as the log system.

## Terms

| Term | Meaning |
|---|---|
| Document | One JSON record, the unit that is stored and searched |
| Index | A collection of documents, like a table |
| Inverted index | The core structure: for each word, the list of documents that contain it |
| Analyzer | Turns text into searchable terms: splits into words, lowercases, removes endings |
| Mapping | The schema: the type of each field and how it is indexed |
| Relevance score | How well a document matches the query. Results are sorted by it |
| Shard | A piece of an index. An index is split into shards that are spread over nodes |
| Replica shard | A copy of a shard on another node, for survival and read capacity |
| Cluster health | Green: all shards are placed. Yellow: some replicas are missing. Red: some data is unavailable |
| Aggregation | Statistics over matching documents: counts per value, averages, histograms |
| Index lifecycle | Automatic rollover, shrinking and deletion of indexes by age. Essential for logs |

## The tools

| Tool | Notes |
|---|---|
| **Elasticsearch** | The best known. Built on the Lucene library |
| **OpenSearch** | A fork of Elasticsearch led by AWS, created in 2021 after a license change. Very similar API |
| **Kibana / OpenSearch Dashboards** | The web UI for searching and dashboards |
| **Logstash, Fluent Bit, Beats, Vector** | Collect logs and ship them in |
| **ELK / EFK stack** | Elasticsearch + Logstash (or Fluentd) + Kibana: the classic log stack |
| Solr | An older Lucene-based engine |
| Typesense, Meilisearch | Small, simple engines for search inside an application |
| Loki | A lighter approach for logs: it indexes labels only, not the text |

## A small example

```bash
docker run -d --name es -p 9200:9200 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.0

curl localhost:9200/_cluster/health?pretty
```

Index three log lines, then search:

```bash
for msg in "payment failed for order 17" "user dana logged in" "payment succeeded for order 18"; do
  curl -s -X POST localhost:9200/logs/_doc -H 'Content-Type: application/json' \
    -d "{\"message\": \"$msg\", \"level\": \"info\"}" > /dev/null
done

curl -s -X POST localhost:9200/logs/_refresh > /dev/null

curl -s localhost:9200/logs/_search -H 'Content-Type: application/json' -d '
{
  "query": { "match": { "message": "payment failed" } }
}' | python -m json.tool
```

Both payment lines come back, and "payment failed for order 17" is first with the higher score: it matches both words. That ranking is the difference from a database `LIKE`.

```bash
curl "localhost:9200/_cat/indices?v"     # health, shards and size of each index
curl "localhost:9200/_cat/shards?v"      # where each shard lives
```

On this single node the index is yellow: its replica shard has no second node to go to.

## What to remember when operating one

- **It is heavy.** It needs a lot of memory and fast disks, and is one of the more demanding systems to run. Consider the managed service.
- **Logs grow without limit.** Set a lifecycle policy that deletes old indexes on day one.
- **Shard count matters.** Too many small shards is the classic cause of an unstable cluster.
- **It is not the source of truth.** Keep the primary data elsewhere and be able to re-index.

## Where it goes next

- Beginner: ship container logs with Fluent Bit and explore them in Kibana, write queries and aggregations.
- Advanced: shard sizing, hot-warm-cold tiers, cluster upgrades, performance tuning, comparing to Loki and ClickHouse for logs.

## See also

- [Databases in the DevOps guide](../../devops/03-data-sources/databases.md): more on Elasticsearch concepts
- [Observability](../09-observability/observability.md), [Loki](../../devops/04-observability/loki.md)
