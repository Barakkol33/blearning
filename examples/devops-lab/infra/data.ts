// The data layer: PostgreSQL, Redis, Kafka and (optionally) Elasticsearch, each with a metrics exporter.
// They are single instances with small limits: built to be played with and broken, not to be relied on.
// In a cloud most of this file is replaced by managed services (see the guide's "In a cloud" page).
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { opts, scrapeLabel, settings } from "./config";
import { namespaces } from "./platform";

const ns = namespaces.data.metadata.name;
const metricsPort = (containerPort: number) => ({ name: "metrics", containerPort });

// ---------------------------------------------------------------------------------------------
// PostgreSQL: a StatefulSet, because the pod needs a stable name and its own disk
// ---------------------------------------------------------------------------------------------
const postgresSecret = new k8s.core.v1.Secret("postgres", {
    metadata: { name: "postgres", namespace: ns },
    stringData: { password: settings.dbPassword },
}, opts);

const postgresLabels = { app: "postgres" };

new k8s.core.v1.Service("postgres", {
    metadata: { name: "postgres", namespace: ns },
    spec: {
        clusterIP: "None", // headless: the name resolves straight to the pod
        selector: postgresLabels,
        ports: [{ name: "postgres", port: 5432 }],
    },
}, opts);

export const postgres = new k8s.apps.v1.StatefulSet("postgres", {
    metadata: { name: "postgres", namespace: ns },
    spec: {
        serviceName: "postgres",
        replicas: 1,
        selector: { matchLabels: postgresLabels },
        template: {
            metadata: { labels: { ...postgresLabels, ...scrapeLabel } },
            spec: {
                enableServiceLinks: false,
                containers: [
                    {
                        name: "postgres",
                        image: "postgres:17-alpine",
                        args: [
                            "-c", "shared_preload_libraries=pg_stat_statements", // query statistics
                            "-c", "log_min_duration_statement=200",              // log queries slower than 200 ms
                            "-c", "max_connections=50",                          // small on purpose: easy to exhaust
                        ],
                        env: [
                            { name: "POSTGRES_DB", value: "shop" },
                            { name: "POSTGRES_PASSWORD", valueFrom: { secretKeyRef: { name: postgresSecret.metadata.name, key: "password" } } },
                            { name: "PGDATA", value: "/var/lib/postgresql/data/pgdata" },
                        ],
                        ports: [{ name: "postgres", containerPort: 5432 }],
                        readinessProbe: { exec: { command: ["pg_isready", "-U", "postgres", "-d", "shop"] }, periodSeconds: 5 },
                        resources: { requests: { cpu: "100m", memory: "256Mi" }, limits: { memory: "512Mi" } },
                        volumeMounts: [{ name: "data", mountPath: "/var/lib/postgresql/data" }],
                    },
                    {
                        name: "exporter",
                        image: "quay.io/prometheuscommunity/postgres-exporter:v0.15.0",
                        env: [
                            { name: "DATA_SOURCE_URI", value: "localhost:5432/shop?sslmode=disable" },
                            { name: "DATA_SOURCE_USER", value: "postgres" },
                            { name: "DATA_SOURCE_PASS", valueFrom: { secretKeyRef: { name: postgresSecret.metadata.name, key: "password" } } },
                        ],
                        ports: [metricsPort(9187)],
                        resources: { requests: { cpu: "10m", memory: "32Mi" }, limits: { memory: "64Mi" } },
                    },
                ],
            },
        },
        volumeClaimTemplates: [{
            metadata: { name: "data" },
            spec: { accessModes: ["ReadWriteOnce"], resources: { requests: { storage: "1Gi" } } },
        }],
    },
}, opts);

/** Connection string for the applications. A secret, because it contains the password. */
export const databaseUrl = pulumi.interpolate`postgresql://postgres:${settings.dbPassword}@postgres.data.svc.cluster.local:5432/shop`;

// ---------------------------------------------------------------------------------------------
// Redis: a cache, so a plain Deployment with no disk. Losing it loses nothing but speed.
// ---------------------------------------------------------------------------------------------
const redisLabels = { app: "redis" };

new k8s.core.v1.Service("redis", {
    metadata: { name: "redis", namespace: ns },
    spec: { selector: redisLabels, ports: [{ name: "redis", port: 6379 }] },
}, opts);

export const redis = new k8s.apps.v1.Deployment("redis", {
    metadata: { name: "redis", namespace: ns },
    spec: {
        replicas: 1,
        selector: { matchLabels: redisLabels },
        template: {
            metadata: { labels: { ...redisLabels, ...scrapeLabel } },
            spec: {
                enableServiceLinks: false,
                containers: [
                    {
                        name: "redis",
                        image: "redis:7-alpine",
                        // A cache must have a memory cap and a rule for what to drop when it is full
                        args: ["redis-server", "--maxmemory", "64mb", "--maxmemory-policy", "allkeys-lru"],
                        ports: [{ name: "redis", containerPort: 6379 }],
                        readinessProbe: { exec: { command: ["redis-cli", "ping"] }, periodSeconds: 5 },
                        resources: { requests: { cpu: "50m", memory: "64Mi" }, limits: { memory: "128Mi" } },
                    },
                    {
                        name: "exporter",
                        image: "oliver006/redis_exporter:v1.62.0",
                        ports: [metricsPort(9121)],
                        resources: { requests: { cpu: "10m", memory: "16Mi" }, limits: { memory: "64Mi" } },
                    },
                ],
            },
        },
    },
}, opts);

export const redisUrl = "redis://redis.data.svc.cluster.local:6379";

// ---------------------------------------------------------------------------------------------
// Kafka: one broker in KRaft mode (no ZooKeeper). Data is in an emptyDir: it is lost when the pod is deleted.
// ---------------------------------------------------------------------------------------------
const kafkaLabels = { app: "kafka" };
const kafkaHost = "kafka-0.kafka.data.svc.cluster.local";

new k8s.core.v1.Service("kafka", {
    metadata: { name: "kafka", namespace: ns },
    spec: {
        clusterIP: "None",
        selector: kafkaLabels,
        ports: [{ name: "kafka", port: 9092 }],
    },
}, opts);

export const kafka = new k8s.apps.v1.StatefulSet("kafka", {
    metadata: { name: "kafka", namespace: ns },
    spec: {
        serviceName: "kafka",
        replicas: 1,
        selector: { matchLabels: kafkaLabels },
        template: {
            metadata: { labels: kafkaLabels },
            spec: {
                // Without this, Kubernetes injects KAFKA_PORT=tcp://... and the image reads it as a broker setting
                enableServiceLinks: false,
                containers: [{
                    name: "kafka",
                    image: "apache/kafka:3.9.0",
                    env: [
                        { name: "KAFKA_NODE_ID", value: "1" },
                        { name: "KAFKA_PROCESS_ROLES", value: "broker,controller" },
                        { name: "KAFKA_LISTENERS", value: "PLAINTEXT://:9092,CONTROLLER://:9093" },
                        // The address the broker tells clients to connect to. Wrong here = clients connect and then hang.
                        { name: "KAFKA_ADVERTISED_LISTENERS", value: `PLAINTEXT://${kafkaHost}:9092` },
                        { name: "KAFKA_CONTROLLER_LISTENER_NAMES", value: "CONTROLLER" },
                        { name: "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP", value: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT" },
                        { name: "KAFKA_CONTROLLER_QUORUM_VOTERS", value: "1@localhost:9093" },
                        // One broker, so every internal topic has one replica
                        { name: "KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", value: "1" },
                        { name: "KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR", value: "1" },
                        { name: "KAFKA_TRANSACTION_STATE_LOG_MIN_ISR", value: "1" },
                        { name: "KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS", value: "0" },
                        { name: "KAFKA_NUM_PARTITIONS", value: "3" }, // for topics that get created automatically
                        { name: "KAFKA_LOG_RETENTION_HOURS", value: "2" },
                        { name: "KAFKA_HEAP_OPTS", value: "-Xms384m -Xmx384m" },
                    ],
                    ports: [{ name: "kafka", containerPort: 9092 }],
                    readinessProbe: { tcpSocket: { port: 9092 }, initialDelaySeconds: 10, periodSeconds: 5 },
                    resources: { requests: { cpu: "100m", memory: "512Mi" }, limits: { memory: "768Mi" } },
                }],
            },
        },
    },
}, opts);

export const kafkaBrokers = `${kafkaHost}:9092`;

// Kafka does not publish consumer lag as a metric by itself. This exporter asks the broker and publishes it.
const kafkaExporterLabels = { app: "kafka-exporter" };
new k8s.apps.v1.Deployment("kafka-exporter", {
    metadata: { name: "kafka-exporter", namespace: ns },
    spec: {
        replicas: 1,
        selector: { matchLabels: kafkaExporterLabels },
        template: {
            metadata: { labels: { ...kafkaExporterLabels, ...scrapeLabel } },
            spec: {
                enableServiceLinks: false,
                containers: [{
                    name: "exporter",
                    image: "danielqsj/kafka-exporter:v1.8.0",
                    args: [`--kafka.server=${kafkaBrokers}`],
                    ports: [metricsPort(9308)],
                    resources: { requests: { cpu: "10m", memory: "32Mi" }, limits: { memory: "64Mi" } },
                }],
            },
        },
    },
}, { ...opts, dependsOn: [kafka] });

// ---------------------------------------------------------------------------------------------
// Elasticsearch: one node, security off, a small heap. Switch off with: pulumi config set search false
// ---------------------------------------------------------------------------------------------
export let searchUrl = "";

if (settings.search) {
    const searchLabels = { app: "elasticsearch" };

    new k8s.core.v1.Service("elasticsearch", {
        metadata: { name: "elasticsearch", namespace: ns },
        spec: { selector: searchLabels, ports: [{ name: "http", port: 9200 }] },
    }, opts);

    new k8s.apps.v1.StatefulSet("elasticsearch", {
        metadata: { name: "elasticsearch", namespace: ns },
        spec: {
            serviceName: "elasticsearch",
            replicas: 1,
            selector: { matchLabels: searchLabels },
            template: {
                metadata: { labels: { ...searchLabels, ...scrapeLabel } },
                spec: {
                    enableServiceLinks: false,
                    containers: [
                        {
                            name: "elasticsearch",
                            image: "docker.elastic.co/elasticsearch/elasticsearch:8.15.0",
                            env: [
                                { name: "discovery.type", value: "single-node" },
                                { name: "xpack.security.enabled", value: "false" },
                                // Heap = half of the container's memory. The other half is for the file system cache.
                                { name: "ES_JAVA_OPTS", value: "-Xms512m -Xmx512m" },
                            ],
                            ports: [{ name: "http", containerPort: 9200 }],
                            readinessProbe: {
                                httpGet: { path: "/_cluster/health", port: 9200 },
                                initialDelaySeconds: 20,
                                periodSeconds: 10,
                            },
                            resources: { requests: { cpu: "200m", memory: "1Gi" }, limits: { memory: "1Gi" } },
                        },
                        {
                            name: "exporter",
                            image: "quay.io/prometheuscommunity/elasticsearch-exporter:v1.8.0",
                            args: ["--es.uri=http://localhost:9200", "--es.indices", "--es.shards"],
                            ports: [metricsPort(9114)],
                            resources: { requests: { cpu: "10m", memory: "32Mi" }, limits: { memory: "64Mi" } },
                        },
                    ],
                },
            },
        },
    }, opts);

    searchUrl = "http://elasticsearch.data.svc.cluster.local:9200";
}
