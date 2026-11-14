---
title: Operating a database
order: 4
lang: en
tags: [intro]
updated: 2026-11-13
---

# Operating a database

**Level: intro**

Stateless services can be thrown away and recreated. A database cannot: it is the one part of the system where a mistake is permanent. Operating it comes down to four duties: back it up, change its schema safely, watch it, and upgrade it.

## Terms

| Term | Meaning |
|---|---|
| Logical backup | An export of the data as SQL or a dump file (`pg_dump`). Portable, slow for large databases |
| Physical backup | A copy of the data files themselves (`pg_basebackup`, pgBackRest). Fast, tied to the version |
| Snapshot | A point-in-time copy of the disk, taken by the storage or the cloud |
| PITR | Point-in-time recovery: a physical backup plus the archived WAL, replayed up to any chosen moment |
| RPO | Recovery point objective: how much data you may lose, in time |
| RTO | Recovery time objective: how long the restore may take |
| Restore test | Actually restoring a backup, on a schedule. An untested backup is a hope |
| Migration | A versioned schema change, applied in order by a tool (Flyway, Liquibase, Alembic) |
| Slow query log | A log of queries that ran longer than a threshold |
| Connection saturation | All connections are in use and new clients are refused |
| Maintenance window | An agreed time for risky work |

## 1. Backups

- Replication is **not** a backup. A `DROP TABLE` replicates to every replica within a second.
- Keep backups in another place than the database: another account or region.
- Decide RPO and RTO with the business, then choose the method. "Lose at most 5 minutes" needs PITR. "Lose at most a day" is a nightly dump.
- Test the restore regularly, and time it. That time is your real RTO.

## 2. Schema changes

- Every change is a migration file in Git, applied by the pipeline, never typed by hand in production.
- Some changes lock the table and block all traffic. On a big table, adding an index needs `CREATE INDEX CONCURRENTLY`.
- Breaking changes go in backward-compatible steps: [expand and contract](../05-delivery/deployment-strategies.md).

## 3. Monitoring

| Watch | Why |
|---|---|
| Connections used out of the maximum | At 100% the application gets errors |
| Query latency and the slowest queries | The first sign of a missing index or a bad plan |
| Replication lag | Stale reads, and data at risk on failover |
| Disk space and its growth rate | A full disk stops the database |
| Long-running transactions | They hold locks and block vacuum |
| Cache hit ratio | Low means too little memory for the workload |
| Age of the last successful backup | The alert that matters most |

## 4. Upgrades

Minor versions are bug and security fixes: apply them routinely. Major versions change the file format: plan them, test on a copy, and have a way back.

## A small example: back up, destroy, restore

Using the `pg` container and `users` table from [How databases work](internals.md):

```bash
# Backup: a compressed logical dump
docker exec pg pg_dump -U postgres -Fc postgres > backup.dump

# Disaster
docker exec pg psql -U postgres -c "DROP TABLE users;"

# Restore into a fresh database, and verify
docker exec pg createdb -U postgres restored
docker exec -i pg pg_restore -U postgres -d restored < backup.dump
docker exec pg psql -U postgres -d restored -c "SELECT count(*) FROM users;"
#  1000000
```

Everything written between the dump and the `DROP` is gone: with a nightly dump the RPO is up to 24 hours. Closing that gap is what WAL archiving and PITR are for.

## Where it goes next

- Beginner: scheduled backups to object storage, a migration tool in a pipeline, a monitoring dashboard with alerts.
- Advanced: PITR with pgBackRest or WAL-G, zero-downtime migrations on large tables, major upgrades with logical replication, capacity planning, incident playbooks.

## See also

- [PostgreSQL](postgres.md), [Replication and scaling](replication.md)
- [SRE](../11-reliability/sre.md): RPO and RTO in the wider picture
