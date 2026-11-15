// The observability layer: Prometheus (metrics and alert rules) and Grafana (dashboards).
// Switch off with: pulumi config set monitoring false
import * as k8s from "@pulumi/kubernetes";
import { opts, scrapeLabel, settings } from "./config";
import { namespaces, ingressClassName, ingress } from "./platform";

const ns = namespaces.monitoring.metadata.name;

// A dashboard is JSON. Building it in code keeps every panel one readable line.
function panel(id: number, title: string, x: number, y: number, exprs: { expr: string; legend: string }[], unit = "short") {
    return {
        id,
        title,
        type: "timeseries",
        datasource: { type: "prometheus", uid: "prometheus" },
        gridPos: { x, y, w: 8, h: 7 },
        fieldConfig: { defaults: { unit, min: 0 }, overrides: [] },
        targets: exprs.map((e, i) => ({ refId: String.fromCharCode(65 + i), expr: e.expr, legendFormat: e.legend })),
    };
}

const api = `route=~"/api/.*"`;
const dashboard = {
    uid: "shop",
    title: "Shop",
    tags: ["lab"],
    timezone: "browser",
    refresh: "5s",
    time: { from: "now-15m", to: "now" },
    schemaVersion: 39,
    panels: [
        // Row 1: what users feel (RED: rate, errors, duration)
        panel(1, "Requests per second, by status", 0, 0, [
            { expr: `sum by (status) (rate(http_requests_total{${api}}[1m]))`, legend: "{{status}}" },
        ], "reqps"),
        panel(2, "Error ratio", 8, 0, [
            { expr: `sum(rate(http_requests_total{${api},status=~"5.."}[1m])) / sum(rate(http_requests_total{${api}}[1m]))`, legend: "errors" },
        ], "percentunit"),
        panel(3, "Latency", 16, 0, [
            { expr: `histogram_quantile(0.5, sum by (le) (rate(http_request_duration_seconds_bucket{${api}}[1m])))`, legend: "p50" },
            { expr: `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{${api}}[1m])))`, legend: "p95" },
        ], "s"),
        // Row 2: the application's resources
        panel(4, "API pods and their CPU", 0, 7, [
            { expr: `kube_deployment_status_replicas_ready{namespace="apps",deployment="api"}`, legend: "ready pods" },
            { expr: `sum(rate(container_cpu_usage_seconds_total{namespace="apps",pod=~"api-.*",container="api"}[1m])) * 10`, legend: "CPU cores x10" },
        ]),
        panel(5, "Orders: created and processed per second", 8, 7, [
            { expr: `sum(rate(shop_orders_created_total[1m]))`, legend: "created" },
            { expr: `sum(rate(shop_orders_processed_total[1m]))`, legend: "processed" },
        ]),
        panel(6, "Kafka consumer lag", 16, 7, [
            { expr: `sum(kafka_consumergroup_lag{consumergroup="order-workers"})`, legend: "orders waiting" },
        ]),
        // Row 3: the data layer
        panel(7, "Redis: cache hit ratio and memory", 0, 14, [
            { expr: `sum(rate(shop_cache_lookups_total{result="hit"}[1m])) / sum(rate(shop_cache_lookups_total[1m]))`, legend: "hit ratio" },
            { expr: `redis_memory_used_bytes / redis_memory_max_bytes`, legend: "memory used / max" },
        ], "percentunit"),
        panel(8, "PostgreSQL: connections", 8, 14, [
            { expr: `sum(pg_stat_activity_count{datname="shop"})`, legend: "in use" },
            { expr: `pg_settings_max_connections`, legend: "max" },
        ]),
        panel(9, "PostgreSQL: transactions per second", 16, 14, [
            { expr: `rate(pg_stat_database_xact_commit{datname="shop"}[1m])`, legend: "commits" },
            { expr: `rate(pg_stat_database_xact_rollback{datname="shop"}[1m])`, legend: "rollbacks" },
        ]),
    ],
};

// Alert rules for the data layer: one per "worry when" in the Advanced sections of the guide's database pages
// that the exporters can measure. severity "page" = wake someone, "ticket" = look at it today.
function alertRule(alert: string, severity: "page" | "ticket", wait: string, expr: string, summary: string) {
    return { alert, expr, for: wait, labels: { severity }, annotations: { summary } };
}

const dataAlerts = {
    name: "data",
    rules: [
        // PostgreSQL
        alertRule("PostgresIdleInTransaction", "ticket", "1m",
            `max(pg_stat_activity_max_tx_duration{state="idle in transaction"}) > 60`,
            "A session has been idle in a transaction for over a minute: it holds locks and blocks vacuum"),
        alertRule("PostgresLongTransaction", "ticket", "1m",
            `max(pg_stat_activity_max_tx_duration{state="active"}) > 300`,
            "A query or transaction has been running for over 5 minutes"),
        alertRule("PostgresDeadlocks", "ticket", "0m",
            `increase(pg_stat_database_deadlocks{datname="shop"}[5m]) > 0`,
            "Deadlocks were detected in the last 5 minutes"),
        alertRule("PostgresDeadRows", "ticket", "10m",
            `sum(pg_stat_user_tables_n_dead_tup) > 10000 and sum(pg_stat_user_tables_n_dead_tup) / sum(pg_stat_user_tables_n_live_tup) > 0.2`,
            "Dead rows are over 20% of live rows: vacuum is not keeping up, or is blocked"),
        alertRule("PostgresCacheHitRatioLow", "ticket", "10m",
            `sum(rate(pg_stat_database_blks_hit{datname="shop"}[5m])) / (sum(rate(pg_stat_database_blks_hit{datname="shop"}[5m])) + sum(rate(pg_stat_database_blks_read{datname="shop"}[5m]))) < 0.95`,
            "Under 95% of page reads are served from memory"),
        // Redis
        alertRule("RedisDown", "page", "30s", `redis_up == 0`, "The exporter cannot reach Redis"),
        alertRule("RedisEvicting", "ticket", "2m",
            `rate(redis_evicted_keys_total[1m]) > 0`,
            "Redis is evicting keys: the cache is full. Check the hit ratio and the load on the database"),
        alertRule("RedisRejectedConnections", "page", "0m",
            `increase(redis_rejected_connections_total[5m]) > 0`,
            "Redis refused connections: the client limit was reached"),
        // Kafka
        alertRule("KafkaBrokerMissing", "page", "1m",
            `absent(kafka_brokers) or kafka_brokers < 1`,
            "No Kafka broker is reachable"),
        alertRule("KafkaUnderReplicatedPartitions", "page", "2m",
            `sum(kafka_topic_partition_under_replicated_partition) > 0`,
            "Some partitions have fewer in-sync replicas than configured"),
        // Elasticsearch
        alertRule("ElasticsearchRed", "page", "1m",
            `elasticsearch_cluster_health_status{color="red"} == 1`,
            "A primary shard is missing: part of the data is unavailable"),
        alertRule("ElasticsearchYellow", "ticket", "5m",
            `elasticsearch_cluster_health_status{color="yellow"} == 1`,
            "Replica shards are unassigned: there is no spare copy (see experiment 9 in the guide)"),
        alertRule("ElasticsearchHeapHigh", "ticket", "5m",
            `elasticsearch_jvm_memory_used_bytes{area="heap"} / elasticsearch_jvm_memory_max_bytes{area="heap"} > 0.9`,
            "JVM heap has stayed above 90%"),
        alertRule("ElasticsearchDiskHigh", "ticket", "5m",
            `1 - elasticsearch_filesystem_data_available_bytes / elasticsearch_filesystem_data_size_bytes > 0.8`,
            "A data node's disk is over 80% full. At 85% it stops receiving shards"),
        alertRule("ElasticsearchWriteRejections", "ticket", "0m",
            `increase(elasticsearch_thread_pool_rejected_count{type="write"}[5m]) > 0`,
            "Indexing requests were rejected: the write queue was full"),
    ],
};

if (settings.monitoring) {
    const stack = new k8s.helm.v3.Release("monitoring", {
        name: "monitoring",
        chart: "kube-prometheus-stack",
        version: "93.3.0",
        repositoryOpts: { repo: "https://prometheus-community.github.io/helm-charts" },
        namespace: ns,
        timeout: 900,
        values: {
            // By default the chart only picks up monitors and rules that carry its own labels. Pick up all of them.
            prometheus: {
                prometheusSpec: {
                    podMonitorSelectorNilUsesHelmValues: false,
                    serviceMonitorSelectorNilUsesHelmValues: false,
                    ruleSelectorNilUsesHelmValues: false,
                    retention: "6h",
                    resources: { requests: { cpu: "100m", memory: "400Mi" } },
                },
                ingress: { enabled: true, ingressClassName, hosts: ["prometheus.localhost"], paths: ["/"] },
            },
            grafana: {
                adminPassword: "admin",
                ingress: { enabled: true, ingressClassName, hosts: ["grafana.localhost"] },
            },
            // No notifications in the lab. Firing alerts are visible in the Prometheus UI.
            alertmanager: { enabled: false },
            // kind does not expose these control-plane parts for scraping. Without this they show as broken targets.
            kubeEtcd: { enabled: false },
            kubeControllerManager: { enabled: false },
            kubeScheduler: { enabled: false },
            kubeProxy: { enabled: false },
        },
    }, { ...opts, dependsOn: [ingress] });

    const afterStack = { ...opts, dependsOn: [stack] };

    // One rule for the whole lab: scrape every pod that has the label and a port named "metrics".
    // A new service gets monitored by adding one label, with no change here.
    new k8s.apiextensions.CustomResource("lab-pods", {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "PodMonitor",
        metadata: { name: "lab-pods", namespace: ns },
        spec: {
            namespaceSelector: { any: true },
            selector: { matchLabels: scrapeLabel },
            podMetricsEndpoints: [{ port: "metrics", interval: "10s" }],
        },
    }, afterStack);

    new k8s.apiextensions.CustomResource("lab-alerts", {
        apiVersion: "monitoring.coreos.com/v1",
        kind: "PrometheusRule",
        metadata: { name: "lab-alerts", namespace: ns },
        spec: {
            groups: [dataAlerts, {
                name: "shop",
                rules: [
                    {
                        alert: "ShopHighErrorRate",
                        expr: `sum(rate(http_requests_total{${api},status=~"5.."}[1m])) / sum(rate(http_requests_total{${api}}[1m])) > 0.05`,
                        for: "1m",
                        labels: { severity: "page" },
                        annotations: { summary: "More than 5% of API requests are failing" },
                    },
                    {
                        alert: "ShopOrdersLagging",
                        expr: `sum(kafka_consumergroup_lag{consumergroup="order-workers"}) > 500`,
                        for: "1m",
                        labels: { severity: "ticket" },
                        annotations: { summary: "More than 500 orders are waiting for a worker" },
                    },
                    {
                        alert: "PostgresDown",
                        expr: "pg_up == 0",
                        for: "30s",
                        labels: { severity: "page" },
                        annotations: { summary: "The exporter cannot reach PostgreSQL" },
                    },
                    {
                        alert: "PostgresConnectionsNearLimit",
                        expr: "sum(pg_stat_activity_count) / max(pg_settings_max_connections) > 0.8",
                        for: "1m",
                        labels: { severity: "ticket" },
                        annotations: { summary: "More than 80% of PostgreSQL connections are in use" },
                    },
                ],
            }],
        },
    }, afterStack);

    // Grafana's sidecar loads every ConfigMap with this label as a dashboard
    new k8s.core.v1.ConfigMap("shop-dashboard", {
        metadata: { name: "shop-dashboard", namespace: ns, labels: { grafana_dashboard: "1" } },
        data: { "shop.json": JSON.stringify(dashboard) },
    }, afterStack);
}
