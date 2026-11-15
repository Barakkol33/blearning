---
title: "Lab experiments: load, failures and database incidents"
sidebar:
  label: Experiments
order: 2
lang: en
tags: [beginner]
updated: 2026-11-14
---

# Lab experiments: load, failures and database incidents

**Level: beginner**

Things to do with the running [lab](_index.md). Each experiment says what to do, what to watch and what it teaches. Keep two things open: the shop at http://localhost:8090, and the Grafana dashboard "Shop" at http://grafana.localhost:8090 (admin / admin).

All 13 experiments were run on the full lab (three nodes, on WSL with 8 GB of memory) on 2026-11-15, and the text describes what happened. Times are from that machine and will differ on yours.

All commands run from the `devops-lab` folder. `kubectl` commands assume the current context is `kind-devops-lab`, which is what kind sets when it creates the cluster.

## 1. Follow one order

```bash
curl -s -X POST localhost:8090/api/orders \
  -H 'Content-Type: application/json' -d '{"item": "red bicycle", "quantity": 1}'

curl -si localhost:8090/api/orders | grep -i x-cache     # miss: read from PostgreSQL
curl -si localhost:8090/api/orders | grep -i x-cache     # hit: read from Redis
curl -s  localhost:8090/api/stats
curl -s 'localhost:8090/api/search?q=bicycle'
```

The same order in each store:

```bash
./lab.sh psql -c "SELECT * FROM orders ORDER BY id DESC LIMIT 3"
./lab.sh redis TTL orders:latest
./lab.sh kafka kafka-consumer-groups.sh --describe --group order-workers
./lab.sh es 'orders/_search?q=item:bicycle&pretty'
```

**Teaches:** the path of a request through every component, and where to look in each one.

## 2. Kill a pod

```bash
kubectl -n apps get pods -w                  # leave running in a second terminal

kubectl -n apps delete "$(kubectl -n apps get pod -l app=api -o name | head -1)"
```

**Watch:** a new pod appears within seconds. The page keeps working, because the other pod serves while the new one starts, and a pod only gets traffic after its readiness probe passes. The line "served by pod" at the top of the page changes.

Now delete all of them at once:

```bash
kubectl -n apps delete pod -l app=api --wait=false
```

New pods are running about ten seconds later, but for a few seconds requests fail with 502 and 504: nothing was left to serve. Replicas protect you from losing one pod, not from losing all of them.

**Teaches:** a Deployment keeps the declared number of pods. Nobody restarted anything.

## 3. Load and autoscaling

```bash
./lab.sh load on
kubectl -n apps get hpa api -w
```

**Watch:** on the dashboard, requests per second jump to about 60. Before the load, each API pod uses about 15% of its CPU request. Within a minute the two pods are far above the 70% target, and the autoscaler raises the API to 6 pods, its maximum. After `./lab.sh load off` it scales back down, slowly: about five minutes, on purpose, to avoid flapping.

```bash
kubectl -n apps top pods
kubectl -n apps describe hpa api             # the decisions, with reasons
```

The load must also reach the new pods. A Service balances connections, not requests: a client that keeps its connections open stays on the pods it first connected to, and the pods added later get nothing. The load generator therefore opens a new connection for every request (see `apps/shop/src/loadgen.js`). In the first run of this lab it did not, and two pods carried all the load while four new ones stood idle.

**Teaches:** the HPA, why every container needs a CPU request, that scaling takes time, and that more pods help only if traffic is spread over them.

## 4. Kafka lag, and its fix

With the load on, customers create about 20 orders a second. One worker handles fewer than 10 a second (100 ms of "work" each, plus a database update and indexing).

```bash
./lab.sh load on
./lab.sh kafka kafka-consumer-groups.sh --describe --group order-workers
```

**Watch:** the `LAG` column grows on all three partitions, and the dashboard's "Kafka consumer lag" panel climbs. On the shop page, new orders stay `new` for longer and longer. In Prometheus (http://prometheus.localhost:8090/alerts) the alert `ShopOrdersLagging` goes to pending and then firing.

Fix it:

```bash
kubectl -n apps scale deployment worker --replicas 3
```

Each worker takes one partition. The three together handle a little more than the 20 a second that arrive, so for the first minute the lag still grows (the group is rebalancing), and then it drains slowly: a few hundred a minute. Now try 5 workers: the lag drains no faster, because the topic has only 3 partitions and the extra workers sit idle. To empty the queue quickly, stop the load.

**Teaches:** lag as the health signal of a queue, consumer groups, and partitions as the limit of parallelism. See [Kafka](../08-services/kafka.md).

## 5. The cache

```bash
./lab.sh redis INFO stats | grep -E 'keyspace|evicted'
./lab.sh redis FLUSHALL                      # a cold cache
```

**Watch:** the hit ratio on the dashboard drops and recovers. Then fill Redis past its 64 MB limit:

```bash
kubectl -n data exec deploy/redis -c redis -- \
  redis-benchmark -q -t set -n 400000 -r 400000 -d 200

./lab.sh redis INFO memory | grep -E 'used_memory_human|maxmemory_human|maxmemory_policy'
./lab.sh redis INFO stats | grep evicted_keys
```

`evicted_keys` is now far above zero: Redis dropped the least recently used keys to stay under the limit, and kept working. Change the policy and try again:

```bash
./lab.sh redis CONFIG SET maxmemory-policy noeviction
kubectl -n data exec deploy/redis -c redis -- redis-benchmark -q -t set -n 100000 -r 900000 -d 200
# errors: OOM command not allowed when used memory > 'maxmemory'

./lab.sh redis CONFIG SET maxmemory-policy allkeys-lru
./lab.sh redis FLUSHALL
```

**Teaches:** a cache needs a memory limit and an eviction policy. See the common cases in [Redis](../07-databases/redis.md#common-cases).

## 6. PostgreSQL: look inside

```bash
./lab.sh psql
```

```sql
-- Who is connected, and from which pod?
SELECT client_addr, state, count(*) FROM pg_stat_activity
WHERE datname = 'shop' GROUP BY 1, 2 ORDER BY 3 DESC;

-- Query statistics (the server was started with pg_stat_statements loaded)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT calls, round(total_exec_time) AS total_ms, round(mean_exec_time::numeric, 2) AS mean_ms, left(query, 70) AS query
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;

-- A query with no index to help it
EXPLAIN ANALYZE SELECT * FROM orders WHERE item = 'red bicycle' AND status = 'new';
CREATE INDEX CONCURRENTLY orders_item_status_idx ON orders (item, status);
EXPLAIN ANALYZE SELECT * FROM orders WHERE item = 'red bicycle' AND status = 'new';
```

Run the load for a few minutes first, so the table has enough rows for the plans to differ.

## 7. PostgreSQL: a lock queue

The case from [PostgreSQL](../07-databases/postgres.md#common-cases) where one open transaction stops a whole table. Terminal 1:

```bash
./lab.sh psql
```

```sql
BEGIN;
UPDATE orders SET quantity = quantity WHERE id = 1;
-- do not commit. This session is now "idle in transaction", holding a lock.
```

Terminal 2, a schema change that needs the whole table:

```bash
./lab.sh psql -c "ALTER TABLE orders ADD COLUMN note text"      # hangs
```

**Watch:** the shop page stops updating and new orders hang. Every query on `orders` is now queued behind the `ALTER TABLE`, which is queued behind the open transaction. CPU is idle. Terminal 3:

```sql
SELECT pid, state, wait_event_type, pg_blocking_pids(pid) AS blocked_by,
       now() - xact_start AS age, left(query, 50) AS query
FROM pg_stat_activity WHERE datname = 'shop' AND state <> 'idle' ORDER BY xact_start;
```

The session with an empty `blocked_by` and state `idle in transaction` is the head of the queue. End it:

```sql
SELECT pg_terminate_backend(<pid>);
```

Everything flows again at once. A migration with `SET lock_timeout = '5s'` would have failed fast and saved the outage.

## 8. PostgreSQL: run out of connections

The lab's server allows 50 connections.

```bash
kubectl -n data exec postgres-0 -c postgres -- sh -c \
  'for i in $(seq 1 60); do psql -U postgres -d shop -c "SELECT pg_sleep(200)" >/dev/null 2>&1 & done; wait' &

./lab.sh psql -c "SELECT 1"
# FATAL: sorry, too many clients already
```

**Watch:** "PostgreSQL: connections" on the dashboard reaches the maximum line. The alert `PostgresConnectionsNearLimit` goes pending, and after a minute firing. And the shop keeps working: every API pod already holds its own few connections in a pool, and uses them again and again. What fails is whoever needs a **new** connection: your `psql`, a migration, a backup, the pods of a scale-up under load. After 200 seconds the sleeping sessions end and the alert clears.

**Teaches:** connections are a hard limit, and its exhaustion is easy to miss: the application looks healthy while the database refuses everyone else, including the person who comes to fix it. PostgreSQL keeps a few connections for superusers for this reason (`superuser_reserved_connections`).

## 9. Elasticsearch: a yellow cluster

```bash
./lab.sh es '_cluster/health?pretty'         # "status": "yellow"
./lab.sh es '_cat/shards?v'                  # the replica of "orders" is UNASSIGNED
./lab.sh es '_cluster/allocation/explain?pretty'
```

The explanation says that a replica may not sit on the same node as its primary, and there is only one node. Fix it for a single-node cluster:

```bash
./lab.sh es orders/_settings -X PUT -H 'Content-Type: application/json' \
  -d '{"index": {"number_of_replicas": 0}}'
./lab.sh es '_cluster/health?pretty'         # green
```

**Teaches:** cluster colors, and `allocation/explain` as the first command for any unassigned shard.

## 10. Errors and an alert

```bash
for i in $(seq 1 600); do curl -s -o /dev/null 'localhost:8090/api/fail?rate=0.5'; sleep 0.2; done
```

**Watch:** the "Error ratio" panel rises to about 50% of that route's share of traffic. In Prometheus, `ShopHighErrorRate` goes pending, and after a minute firing. The API's logs show each failure as one JSON line:

```bash
kubectl -n apps logs -l app=api --tail 5
```

**Teaches:** an alert on a symptom users feel, the `for:` delay, and structured logs. See [Observability](../09-observability/concepts.md).

## 11. A bad release, and a rollback

```bash
kubectl -n apps set image deployment/api api=devops-lab/shop:does-not-exist
kubectl -n apps get pods -l app=api
```

**Watch:** one new pod is stuck in `ErrImagePull`, and then `ImagePullBackOff`. The old pods keep serving, because the rollout is configured to never go below the current number of ready pods (`maxUnavailable: 0`). The page works throughout.

```bash
kubectl -n apps rollout undo deployment/api
```

A real release: change something in `apps/shop/src/api.js` (for example the text of an error message), then:

```bash
./lab.sh images && ./lab.sh deploy
kubectl -n apps rollout status deployment/api
```

The new image gets a new tag from the hash of the code, Pulumi updates the Deployment, and Kubernetes replaces the pods one at a time. The version on the shop page changes.

Is a rollout really free for users? Measure it. In one terminal send a request every 100 ms and count the answers, in another restart the pods:

```bash
while true; do curl -s -o /dev/null -m 3 -w '%{http_code}\n' localhost:8090/api/orders; sleep 0.1; done | tee /tmp/codes

kubectl -n apps rollout restart deployment/api     # then stop the loop with Ctrl+C
sort /tmp/codes | uniq -c
```

Expect only `200`. In the first run of the lab a request was dropped now and then (`000`): a pod that is being deleted can still receive a request for a moment after it got the signal to stop. The API's `preStop` pause in `infra/apps.ts` covers that moment. Remove it, deploy, and measure again.

## 12. Lose a database pod

```bash
kubectl -n data delete pod postgres-0
kubectl -n apps get pods -w
```

**Watch:** a request or two fails while the database is away. Within about 15 seconds the StatefulSet brings back `postgres-0` with the same disk, the API reconnects, and every order is still there.

Now the same with Kafka: `kubectl -n data delete pod kafka-0`. Its data was in an `emptyDir`, so the topic's contents and the consumer group's position are gone. Orders that arrive while it is down fail, because the API needs Kafka to accept an order. Send one during the outage and then look:

```bash
./lab.sh psql -c "SELECT status, count(*) FROM orders GROUP BY 1"
```

One order stays `new` forever. The API wrote the row to PostgreSQL, failed to publish the event, and answered with an error: the two stores now disagree, and no worker will ever hear of that order.

**Teaches:** what a persistent volume gives you, and a design question: should accepting an order depend on the queue being up? (The usual answer is the outbox pattern: write the event to PostgreSQL in the same transaction, and ship it to Kafka afterwards. It also removes the order that was stuck as `new`.)

## 13. Drain a node

Needs the full layout with two workers (not `LAB_SMALL`).

```bash
kubectl get pods -A -o wide | grep devops-lab-worker2
kubectl drain devops-lab-worker2 --ignore-daemonsets --delete-emptydir-data
```

**Watch:** pods are evicted and start on the other worker. The API's disruption budget makes the drain wait, so at least one API pod is always up, and the shop keeps answering.

```bash
kubectl uncordon devops-lab-worker2
```

Now drain the node that holds the database:

```bash
kubectl -n data get pod postgres-0 -o wide          # which node?
kubectl drain <that node> --ignore-daemonsets --delete-emptydir-data
kubectl -n data describe pod postgres-0 | tail -5
```

`postgres-0` stays `Pending`, with the reason `volume node affinity conflict`: its volume is a local disk of the drained node, so the pod cannot start anywhere else. The API pods become not ready and the shop answers 503 until you `uncordon` the node. Then PostgreSQL returns with all its data. In a cloud the disk is network storage and moves with the pod.

If Traefik was on the drained node, the shop is also unreachable for a few seconds while it restarts elsewhere: the door has a single replica.

**Teaches:** planned maintenance, disruption budgets, and why local storage pins a pod to a node.

## More ideas

- Lower the API's memory limit to 64Mi in `infra/apps.ts` and deploy: watch `OOMKilled` and restarts under load.
- Break the readiness probe's path, deploy, and see a rollout that never completes and never takes traffic.
- Add a `NetworkPolicy` that lets only the `apps` namespace reach PostgreSQL, and prove it from a pod in another namespace.
- The rule `RedisEvicting` in `infra/monitoring.ts` needs two minutes of evictions. Make it fire.
- Raise `workerMs` to 1000 with `pulumi config set` and find how many workers the load now needs.

## See also

- [Pulumi: how the lab is deployed](pulumi.md)
- [Database health](../07-databases/health.md), [Kubernetes in production](../02-containers/kubernetes-production.md)
