---
title: MongoDB
order: 8
lang: en
tags: [intro, advanced]
updated: 2026-11-15
---

# MongoDB

MongoDB is a document database. It stores records as JSON-like documents that can be nested and can differ from each other, in place of rows with fixed columns. It fits data that is naturally hierarchical, and data whose shape changes often.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

### Terms

| Term | Meaning |
|---|---|
| Document | One record, like a JSON object. Up to 16 MB |
| Collection | A group of documents, like a table. It does not enforce one schema by default |
| BSON | The binary form of JSON that MongoDB stores, with more types (dates, binary, 64-bit numbers) |
| `_id` | The primary key of a document. Created automatically when not given |
| Embedding | Putting related data inside the document (the customer inside the order), in place of a join |
| Reference | Keeping only the ID of another document, like a foreign key |
| Index | Speeds up queries. Single-field, compound, text, geospatial |
| Aggregation pipeline | Processing in stages: `$match`, `$group`, `$sort`, `$lookup` |
| Replica set | A primary and secondaries with automatic failover. The normal way to run MongoDB |
| Oplog | The log of changes that secondaries copy from the primary |
| Sharding | Splitting a collection over several replica sets by a shard key |
| `mongos` | The router that sends each query to the right shard |
| WiredTiger | The storage engine |
| Write concern / read concern | How many members must confirm a write, and how fresh a read must be |
| Atlas | MongoDB's managed cloud service |

### What is different about it

- **The schema lives in the application.** The database accepts any shape, so the code and the team must keep the shapes under control. Schema validation rules can be added per collection.
- **Model for the queries.** Data that is read together is stored together. One document read replaces a join of several tables.
- **A replica set from day one.** Failover is built in, and a single node is only for development.

### A small example: documents, a query, an index

```bash
docker run -d --name mongo mongo:8
docker exec -it mongo mongosh shop
```

```javascript
// Three orders. They do not have the same fields.
db.orders.insertMany([
  { item: "red bicycle", quantity: 1, customer: { name: "Dana", city: "Haifa" }, tags: ["sport"] },
  { item: "coffee machine", quantity: 2, customer: { name: "Omer", city: "Tel Aviv" } },
  { item: "coffee beans", quantity: 5, customer: { name: "Dana", city: "Haifa" }, gift: true },
])

// Query by a nested field
db.orders.find({ "customer.city": "Haifa" }, { item: 1, quantity: 1, _id: 0 })
// [ { item: 'red bicycle', quantity: 1 }, { item: 'coffee beans', quantity: 5 } ]

// Items per customer
db.orders.aggregate([
  { $group: { _id: "$customer.name", items: { $sum: "$quantity" } } },
  { $sort: { items: -1 } },
])
// [ { _id: 'Dana', items: 6 }, { _id: 'Omer', items: 2 } ]

// How was the query executed?
db.orders.find({ "customer.city": "Haifa" }).explain("executionStats").executionStats.executionStages.stage
// COLLSCAN: every document was read

db.orders.createIndex({ "customer.city": 1 })
db.orders.find({ "customer.city": "Haifa" }).explain("executionStats").executionStats.executionStages.inputStage.stage
// IXSCAN: the index was used
```

```bash
docker rm -f mongo
```

`COLLSCAN` in a frequent query is the first thing to look for when MongoDB is slow, as a sequential scan is in PostgreSQL.

## Advanced

Keeping a replica set healthy: the signals to watch, and the incidents that repeat everywhere. The questions that apply to every data system are in [Database health](health.md).

### What to watch

| Signal | Where | Healthy | Worry when |
|---|---|---|---|
| Replica set state | `rs.status()` | One PRIMARY, the rest SECONDARY | Members in RECOVERING or unreachable, or the primary changing |
| Replication lag | `rs.printSecondaryReplicationInfo()` | Seconds | Growing |
| Oplog window | `rs.printReplicationInfo()` | Longer than any outage you plan for (days) | Hours |
| Connections | `db.serverStatus().connections` | Stable | Near the limit |
| Cache used and dirty | `serverStatus().wiredTiger.cache` | Used around 80%, dirty under 5% | Dirty above 20% |
| Queued operations | `serverStatus().globalLock.currentQueue` | Near zero | A standing queue |
| Slow operations | The log and the profiler | Rare | `COLLSCAN` in frequent queries |
| Disk used | The operating system | Predictable growth | Above 80% |

### Common cases

| What happens | How it shows | What to do |
|---|---|---|
| **A query scans the whole collection.** No index fits it. | High CPU and disk reads. The slow log shows `COLLSCAN` with `docsExamined` far above `nReturned`. | `explain("executionStats")` on the query, then create the index. On a replica set, build it one member at a time for very large collections. |
| **A secondary falls too far behind.** It was down, or too slow, for longer than the oplog covers. | The member stays in RECOVERING, with `too stale to catch up` in its log. | Resync the member from scratch. Make the oplog larger so the window covers real outages. |
| **Elections keep happening.** The primary is overloaded or the network between members is unstable, so heartbeats are missed. | The primary changes repeatedly. Writes fail for seconds with `NotWritablePrimary`. | Check load on the primary and the network between members. Keep an odd number of voting members, spread over failure zones. Make sure clients retry writes. |
| **Cache pressure.** Writes arrive faster than changed pages can be flushed to disk. | Dirty cache above 20%, and application threads are made to do the flushing. Latency spikes on everything. | Faster disks, more memory, or a slower write burst (throttle the batch job). |
| **A hot shard.** The shard key always increases (a timestamp, an auto-increment ID), so every insert goes to the last chunk on one shard. | One shard at full load while the others are idle. The balancer moves chunks all the time. | Choose a hashed or compound shard key that spreads writes. An existing key can be refined or the collection resharded, which is a heavy operation: choose well at the start. |

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **Replica sets**: elections, priority, arbiters
- **Read and write concerns**: `w: majority`, read preference, what is durable
- **Sharding**: shard keys, chunks, the balancer, jumbo chunks
- **Indexes**: compound, multikey, TTL indexes; the ESR rule
- **The aggregation pipeline**: and its performance
- **WiredTiger**: the storage engine, its cache and compression
- **Schema design**: embedding vs referencing, unbounded arrays
- **The oplog**: its size and replication window
- **Change streams**: reacting to data changes
- **Profiler and slow queries**: `explain()`, the database profiler
- **Backups**: mongodump, filesystem snapshots, Percona Backup for MongoDB
- **MongoDB on Kubernetes**: the community and Percona operators, Atlas as a service

## See also

- [Replication and scaling](replication.md): replica sets, failover and sharding in general
- [Database health](health.md)
