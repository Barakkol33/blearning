---
title: Databases
kind: chapter
lang: en
---

# Databases

How a database works inside, and how to keep one healthy. The first pages are about every database: [how databases work](internals.md), [replication and scaling](replication.md), [operating a database](operations.md) (backups, migrations, upgrades) and [database health](health.md) (the questions to ask of any data system).

Then there is one page per database. Its Intro section has the concepts, and its Advanced section has what to watch, the common incidents and alert rules.

| Database | Kind | Use it for |
|---|---|---|
| [PostgreSQL](postgres.md) | Relational | The default. Transactions, joins, data that must be correct. The main example of this chapter |
| [Elasticsearch](elasticsearch.md) | Search engine | Full-text search, logs, aggregations over many documents |
| [Redis](redis.md) | In-memory key-value | Caches, sessions, counters, rate limits |
| [MongoDB](mongodb.md) | Document | Hierarchical data whose schema changes often |
| [ClickHouse](clickhouse.md) | Columnar | Analytics over huge, append-only data |

[Kafka](../08-services/kafka.md) holds data too, and is in the Services chapter.
