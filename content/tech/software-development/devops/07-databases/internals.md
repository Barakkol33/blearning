---
title: How databases work
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# How databases work

**Level: intro**

A database has two jobs: never lose data it confirmed, and find data fast. Almost every setting you tune and every incident you debug comes back to how it does these two. The ideas here are shared by PostgreSQL, MySQL, and most other databases.

## Terms

| Term | Meaning |
|---|---|
| Page (block) | The unit a database reads and writes on disk, usually 8 KB. Tables and indexes are files made of pages |
| Buffer pool / cache | Pages kept in memory. A read from memory is thousands of times faster than from disk |
| WAL | Write-ahead log: every change is first appended to a log file, and only later written into the table pages |
| Checkpoint | The moment changed pages are flushed to the table files, so the older log is no longer needed |
| Index | A separate structure that finds rows by a column's value without scanning the whole table |
| B-tree | The standard index: a balanced tree, good for reads and range queries. Used by PostgreSQL, MySQL |
| LSM tree | A structure built for heavy writes: append to memory and sorted files, merge them later. Used by Cassandra, RocksDB |
| Compaction | The background merging of files in an LSM tree |
| Transaction | A group of changes that succeed or fail together |
| ACID | Atomicity (all or nothing), Consistency (rules hold), Isolation (transactions do not disturb each other), Durability (committed data survives a crash) |
| Isolation level | How much concurrent transactions may see of each other: read committed, repeatable read, serializable |
| MVCC | Multi-version concurrency control: a change creates a new version of the row, so readers never wait for writers |
| Lock | Exclusive hold on a row or table. Two transactions waiting on each other form a deadlock |
| Query planner | The part that chooses how to execute a query: which index, which join order |

## The life of one write

```text
UPDATE accounts SET balance = 50 WHERE id = 7;  COMMIT;

1. Find the page that holds row 7 (through the index), load it into the buffer pool.
2. Change the page in memory.
3. Append the change to the WAL and flush the WAL to disk.   <- this is the commit
4. Answer "OK" to the client.
5. Later, at a checkpoint, write the changed page into the table file.
```

Why this order: appending to one log file is fast, and writing pages all over the disk is slow. If the server crashes after step 4, the table file is stale and the WAL is not. On restart the database replays the WAL and loses nothing. The same log, shipped to another server, is how [replication](replication.md) works.

## A small example: watch an index change the plan

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:17
docker exec -it pg psql -U postgres
```

```sql
CREATE TABLE users (id serial PRIMARY KEY, email text, created date);

INSERT INTO users (email, created)
SELECT 'user' || n || '@example.com', date '2020-01-01' + (n % 2000)
FROM generate_series(1, 1000000) AS n;

ANALYZE users;

EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user500000@example.com';
--  Seq Scan on users ... (reads the whole table, tens of milliseconds)

CREATE INDEX users_email_idx ON users (email);

EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user500000@example.com';
--  Index Scan using users_email_idx ... (a few pages, well under a millisecond)
```

`EXPLAIN ANALYZE` shows the planner's choice and the real time. "Seq Scan" on a large table for a query that returns few rows is the most common cause of a slow database.

Indexes are not free: every one is updated on each write and takes disk and memory. Index what queries filter and join on, not everything.

## Where it goes next

- Beginner: reading plans, composite and partial indexes, transactions and isolation levels in practice.
- Advanced: B-tree and LSM internals, WAL and crash recovery in detail, MVCC and vacuum, lock analysis, the planner's statistics and cost model.

## See also

- [PostgreSQL](postgres.md), [Replication and scaling](replication.md), [Operating a database](operations.md)
