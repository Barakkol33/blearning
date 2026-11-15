#!/usr/bin/env bash
# Smoke test of the running lab: is every part up, and does an order travel through all of them?
# Run with ./lab.sh test. Exits with 1 if any check fails.
set -uo pipefail

CONTEXT="kind-devops-lab"
BASE="${LAB_URL:-http://localhost:8090}"
k() { kubectl --context "$CONTEXT" "$@"; }

failed=0
pass() { echo "  PASS  $1"; }
fail() { echo "  FAIL  $1"; failed=$((failed + 1)); }

# check "<description>" <seconds to keep trying> <command...>   (the command must succeed)
check() {
	local name="$1" timeout="$2"; shift 2
	local deadline=$((SECONDS + timeout))
	until "$@" >/dev/null 2>&1; do
		if [ "$SECONDS" -ge "$deadline" ]; then fail "$name"; return 1; fi
		sleep 3
	done
	pass "$name"
}

setting() { (cd "$(dirname "$0")/../infra" && pulumi config get "$1" 2>/dev/null) || true; }
has() { grep -q "$2" <<<"$1"; }

# A Prometheus query that must return at least one series with a value above zero
prom() { curl -fsS -G -H 'Host: prometheus.localhost' "$BASE/api/v1/query" --data-urlencode "query=$1"; }
prom_positive() { prom "$1" | grep -Eq '"value":\[[0-9.]+,"[^"]*[1-9][^"]*"\]'; }

search_on=true; monitoring_on=true
[ "$(setting search)" = "false" ] && search_on=false
[ "$(setting monitoring)" = "false" ] && monitoring_on=false

echo "Kubernetes"
check "all deployments in apps are available" 180 k -n apps wait --for=condition=Available deployment/api deployment/web deployment/worker --timeout=5s
# kubectl takes names or a label selector, not both in one command
check "postgres and kafka are ready" 180 k -n data wait --for=condition=Ready pod/postgres-0 pod/kafka-0 --timeout=5s
check "redis is ready" 180 k -n data wait --for=condition=Ready pod -l app=redis --timeout=5s
hpa_has_metrics() { k -n apps get hpa api -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}' | grep -Eq '^[0-9]+$'; }
check "the autoscaler reads CPU metrics (metrics-server works)" 240 hpa_has_metrics

echo "The shop, through the ingress"
page_ok() { curl -fsS "$BASE/" | grep -q 'DevOps lab shop'; }
check "the web page is served" 120 page_ok
check "the API answers /api/stats" 120 curl -fsS "$BASE/api/stats"

order=$(curl -fsS -X POST "$BASE/api/orders" -H 'Content-Type: application/json' -d '{"item": "smoke test bicycle", "quantity": 1}')
if has "$order" '"status":"new"'; then pass "an order is created in PostgreSQL"; else fail "an order is created in PostgreSQL ($order)"; fi
order_id=$(sed -E 's/.*"id":([0-9]+).*/\1/' <<<"$order")

curl -fsS "$BASE/api/orders" >/dev/null
if curl -fsSi "$BASE/api/orders" | grep -qi 'x-cache: hit'; then pass "the second read of the list comes from Redis"; else fail "the second read of the list comes from Redis"; fi

processed() { k -n data exec postgres-0 -c postgres -- psql -U postgres -d shop -tAc "SELECT status FROM orders WHERE id = $order_id" | grep -q processed; }
check "the worker processed the order (Kafka -> worker -> PostgreSQL)" 90 processed

bad=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/orders" -H 'Content-Type: application/json' -d '{}')
if [ "$bad" = 400 ]; then pass "a bad order is rejected with 400"; else fail "a bad order is rejected with 400 (got $bad)"; fi

if $search_on; then
	echo "Search"
	found() { curl -fsS "$BASE/api/search?q=smoke" | grep -q 'smoke test bicycle'; }
	check "the order is found through Elasticsearch" 120 found
fi

if $monitoring_on; then
	echo "Monitoring"
	check "Prometheus answers through the ingress" 240 prom 'up'
	check "the API pods are scraped" 180 prom_positive 'sum(up{namespace="apps", pod=~"api-.*"})'
	check "the worker is scraped" 180 prom_positive 'sum(shop_orders_processed_total)'
	check "request metrics exist" 180 prom_positive 'sum(http_requests_total{route=~"/api/.*"})'
	check "PostgreSQL exporter: pg_up" 180 prom_positive 'pg_up'
	check "PostgreSQL exporter: connections and their maximum" 180 prom_positive 'sum(pg_stat_activity_count{datname="shop"}) * max(pg_settings_max_connections)'
	check "Redis exporter: memory against its limit" 180 prom_positive 'redis_memory_used_bytes / redis_memory_max_bytes'
	check "Kafka exporter: the consumer group is visible" 240 prom 'kafka_consumergroup_lag{consumergroup="order-workers"}'
	check "kube-state-metrics: ready API pods" 180 prom_positive 'kube_deployment_status_replicas_ready{namespace="apps",deployment="api"}'
	check "container CPU metrics for the API" 240 prom_positive 'sum(rate(container_cpu_usage_seconds_total{namespace="apps",pod=~"api-.*",container="api"}[2m]))'
	if $search_on; then
		check "Elasticsearch exporter: cluster health" 180 prom_positive 'sum(elasticsearch_cluster_health_status{color=~"green|yellow"})'
	fi
	# Every metric the alert rules and the dashboard rely on must exist under exactly this name
	names=$(curl -fsS -H 'Host: prometheus.localhost' "$BASE/api/v1/label/__name__/values" || true)
	wanted="pg_stat_activity_max_tx_duration pg_stat_database_deadlocks pg_stat_user_tables_n_dead_tup pg_stat_user_tables_n_live_tup
		pg_stat_database_blks_hit pg_stat_database_blks_read pg_stat_database_xact_commit
		redis_up redis_evicted_keys_total redis_rejected_connections_total kafka_brokers kafka_topic_partition_under_replicated_partition"
	$search_on && wanted="$wanted elasticsearch_jvm_memory_used_bytes elasticsearch_jvm_memory_max_bytes
		elasticsearch_filesystem_data_available_bytes elasticsearch_filesystem_data_size_bytes elasticsearch_thread_pool_rejected_count"
	missing=""
	for name in $wanted; do has "$names" "\"$name\"" || missing="$missing $name"; done
	if [ -z "$missing" ]; then pass "all metrics used by the alert rules exist"; else fail "metrics missing:$missing"; fi

	rules_loaded() { curl -fsS -H 'Host: prometheus.localhost' "$BASE/api/v1/rules" | grep ShopHighErrorRate | grep -q ElasticsearchWriteRejections; }
	check "the alert rules are loaded" 120 rules_loaded
	dashboard() { curl -fsS -u admin:admin -H 'Host: grafana.localhost' "$BASE/api/dashboards/uid/shop" | grep -q '"title":"Shop"'; }
	check "Grafana serves the Shop dashboard" 240 dashboard
fi

echo
if [ "$failed" -eq 0 ]; then echo "All checks passed."; else echo "$failed check(s) failed."; exit 1; fi
