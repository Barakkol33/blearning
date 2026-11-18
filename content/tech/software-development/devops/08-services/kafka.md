---
title: Kafka
order: 2
lang: en
tags: [intro, advanced]
updated: 2026-11-15
---

# Kafka

Kafka is a distributed event streaming platform. At its core it's a durable, ordered message log — producers write events, consumers read them, and Kafka stores them reliably across a cluster.

**Why Kafka?** It decouples producers from consumers. A service can publish events without knowing (or caring) who reads them, when, or how many times.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

### Core components

#### Topic

A **topic** is a named stream of events — think of it as a category or channel. Producers write to a topic, consumers read from it.

**Key parameters:**

| Parameter | Purpose |
|---|---|
| `partitions` | Number of partitions (controls parallelism) |
| `replication.factor` | How many copies of each partition exist |
| `retention.ms` / `retention.bytes` | How long messages are kept |
| `cleanup.policy` | `delete` (remove old messages) or `compact` (keep latest per key) |

**Log compaction:** When `cleanup.policy=compact`, the key identifies which value to keep. Kafka retains only the most recent record per key (and tombstones for deletes). Compaction is meaningless without keys.

---

#### Producer

A producer creates and sends messages to a topic. Each message has:

- **Topic** — which stream to write to.
- **Key** — determines the partition (ensures ordering for the same key). Optional.
- **Value** — the payload (the actual data).
- **Timestamp** — when the event occurred.
- **Headers** — metadata (event type, encoding, correlation ID, etc.).

If no key is provided, messages are distributed across partitions via round-robin. If a key is provided, it's hashed to a deterministic partition — so all messages with the same key always go to the same partition (and are therefore ordered).

---

#### Consumer

A consumer reads messages from a topic. It tracks its position using an **offset** — a bookmark per partition. If the consumer crashes and recovers, it resumes from its last committed offset.

When a new, independent consumer starts reading a topic, it gets its own offset — it reads all messages from scratch (or from the configured start point), regardless of what other consumers have read.

**Key parameters:**

- `topic` — which topic to read.
- `group.id` — consumer group to join (optional).

---

#### Consumer Group

A **consumer group** is a set of consumers that cooperatively read a topic. Kafka distributes partitions among group members so each partition is read by **exactly one** consumer in the group at a time.

This means: within a group, messages are load-balanced (competing consumers). Across different groups, every group gets all the messages independently.

**How it works internally:**

- Group offsets are stored in the internal `__consumer_offsets` topic.
- An elected **group coordinator** (a broker) manages membership and partition assignments.

**Assignment strategies** (configured on the consumer):

| Strategy | Behavior |
|---|---|
| **Range** | Contiguous blocks of partitions per topic (can be uneven) |
| **RoundRobin** | Cycles through partitions across members |
| **Sticky** | Keeps previous assignments stable to minimize disruption |
| **Cooperative-Sticky** | Like Sticky but rebalances incrementally (avoids stop-the-world pauses) |

**Rebalancing:** When a consumer joins or leaves a group, Kafka pauses consumption briefly and reassigns partitions according to the chosen strategy.

---

#### Partition

A partition is a sub-queue within a topic. Partitions are the unit of parallelism in Kafka.

- **Why partitions?** — Multiple consumers (in a group) can read different partitions in parallel, increasing throughput.
- **Ordering** — Guaranteed within a single partition, but **not** across partitions.
- **Assignment** — Each message is routed by key hash. No key → round-robin.
- **Offset** — Each message within a partition gets a sequential index (offset).
- **One consumer per partition** — Within a consumer group, only one consumer reads a given partition (this is how ordering is preserved).

**Replication:**

Each partition has a **leader** replica that handles all reads and writes. The leader replicates data to **follower** replicas on other brokers. If the leader crashes, a follower is promoted — no data loss, processing continues. Replicas sync continuously; conflicts are resolved by majority.

---

### Cluster infrastructure

#### Broker

A broker is a Kafka server node. It:

- Stores partition data on disk (as log segments).
- Serves reads and writes to producers/consumers.
- Replicates data to peer brokers for fault tolerance.
- Runs internal services (log cleaner, fetchers, quota enforcement).

A Kafka cluster is a group of brokers. Topics and partitions are spread across brokers for scale and redundancy.

#### Controller (KRaft)

The controller manages the cluster as a whole — broker management, partition assignments, leader elections, and overall cluster health.

In modern Kafka (KRaft mode), the controller runs as a small **Raft quorum** (typically 3 or 5 nodes) that:

- Elects a single controller leader via Raft consensus.
- Manages the metadata log (source of truth for topics, partitions, leaders, ACLs).
- Handles partition leader assignments and reassignments during failures.

#### ZooKeeper (legacy)

Older Kafka deployments use ZooKeeper for distributed coordination, leader elections, and cluster management. It tracks broker statuses, partition offsets, and elects leaders when brokers fail. KRaft is replacing ZooKeeper in newer versions.

---

### Supporting components

#### Schema Registry

Holds the schemas (Avro, Protobuf, JSON Schema) of messages in topics. Producers and consumers validate against the registry, so message formats can evolve safely without breaking downstream consumers.

#### Kafka Connect

A framework with a library of pre-built connectors that integrate Kafka with external systems (databases, S3, Elasticsearch, etc.) — no custom code needed.

#### Kafka Streams

A client library for building stream processing applications — transformations, aggregations, joins, and windowing directly on Kafka topics.

---

### Key metric: Lag

**Lag** is the number of messages a consumer hasn't processed yet (difference between the latest offset and the consumer's committed offset). High or growing lag means the consumer can't keep up — a critical health signal.

## Advanced

Keeping a Kafka cluster healthy: the signals to watch, and the incidents that repeat everywhere. Kafka is not a database, but it holds data and fails like one, so the questions in [Database health](../07-databases/health.md) apply to it too.

### What to watch

| Signal | Healthy | Worry when |
|---|---|---|
| Consumer lag per group | Small and stable, or rising and falling with traffic | Rising without end |
| Under-replicated partitions | Zero | Above zero for more than minutes |
| Offline partitions | Zero | Any: those partitions cannot be read or written |
| Active controller count | Exactly one in the cluster | Zero, or more than one |
| In-sync replica shrink rate | Near zero | Frequent shrinks and expands |
| Disk used per broker | Under 75% | Climbing toward full |
| Consumer group state | `Stable` | `PreparingRebalance` again and again |
| Request latency (produce, fetch) | Stable | A step up |

### Common cases

| What happens | How it shows | What to do |
|---|---|---|
| **Lag grows.** Consumers handle messages more slowly than producers write them. | Lag on every partition of the topic climbs. The data is correct and late. | Add consumers to the group, up to the number of partitions. Make the handling faster. More partitions if consumers are already at the limit. |
| **A hot partition.** Messages are keyed by something uneven (one big customer). | Lag on one partition only, while its siblings are at zero. Adding consumers does not help. | A key that spreads better, or special handling for the big key. |
| **A rebalance storm.** Handling one batch takes longer than `max.poll.interval.ms`, so the consumer is thrown out of the group, rejoins, and the group rebalances, again and again. | Lag grows although consumers are running. The group state flips to `PreparingRebalance`. Consumer logs repeat messages about leaving and joining the group. | Smaller batches (`max.poll.records`), a longer `max.poll.interval.ms`, faster handling. Static membership (`group.instance.id`) reduces rebalances on restarts. |
| **Under-replicated partitions.** A broker is down, slow, or cut off. | The count is above zero. Producers with `acks=all` slow down or fail if too few replicas remain. | Find the broker that is missing from the in-sync lists and fix it (often disk or network). Do not restart other brokers until it is back. |
| **A broker's disk fills.** Retention is set by time only and traffic grew. | The broker stops, its partitions go under-replicated or offline. | Free space by lowering retention on the largest topics, then add a size limit (`retention.bytes`) and an alert on disk use. |

### Alert rules

Prometheus rules for the signals above, as loaded by the [lab](../13-lab/_index.md) (`infra/monitoring.ts`). The severities and what the rules cannot see are explained in [Database health](../07-databases/health.md#from-signals-to-alerts).

| Alert | Expression | Severity |
|---|---|---|
| KafkaBrokerMissing | `absent(kafka_brokers) or kafka_brokers < 1` | page |
| KafkaUnderReplicatedPartitions | `sum(kafka_topic_partition_under_replicated_partition) > 0` | page |
| ShopOrdersLagging | `sum(kafka_consumergroup_lag{consumergroup="..."}) > 500` | ticket |

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **Partitions and keys**: how many partitions, choosing a key, hot partitions
- **Replication**: ISR, `min.insync.replicas`, `acks=all`, unclean leader election
- **Consumer groups and rebalances**: cooperative rebalancing, static membership
- **Offsets and lag**: committing offsets, measuring lag (Burrow, kafka-exporter)
- **Exactly-once semantics**: idempotent producers, transactions
- **KRaft**: Kafka without ZooKeeper
- **Retention and compaction**: time and size retention, log-compacted topics
- **Producer tuning**: `linger.ms`, `batch.size`, compression
- **Schema Registry**: Avro and Protobuf schemas, compatibility rules
- **Kafka Connect and Debezium**: moving data in and out, change data capture
- **Stream processing**: Kafka Streams, ksqlDB, Apache Flink
- **Strimzi**: running Kafka on Kubernetes
- **Tiered storage**: old segments on object storage
- **Alternatives**: Redpanda, Apache Pulsar, managed Kafka (MSK, Confluent Cloud)

## In the lab

[Experiment 4](../13-lab/experiments.md) builds consumer lag under load and drains it by adding workers, up to the number of partitions.

## See also

- [Messaging and queues](messaging.md)
- [Database health](../07-databases/health.md)
