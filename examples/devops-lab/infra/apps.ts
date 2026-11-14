// The application layer: the shop. A web page, an API, a worker and a load generator.
// This file would stay almost the same in any cloud: it only knows Kubernetes.
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as k8s from "@pulumi/kubernetes";
import { opts, scrapeLabel, settings } from "./config";
import { namespaces, ingressClassName, ingress, metricsServer } from "./platform";
import { databaseUrl, kafka, kafkaBrokers, postgres, redis, redisUrl, searchUrl } from "./data";

const ns = namespaces.apps.metadata.name;
const image = `devops-lab/shop:${settings.imageTag}`;

// --- configuration: plain values in a ConfigMap, the password in a Secret ----------------------
const shopConfig = new k8s.core.v1.ConfigMap("shop-config", {
    metadata: { name: "shop-config", namespace: ns },
    data: {
        REDIS_URL: redisUrl,
        KAFKA_BROKERS: kafkaBrokers,
        SEARCH_URL: searchUrl,
        APP_VERSION: settings.imageTag,
        WORK_MS: String(settings.workerMs),
    },
}, opts);

const shopSecret = new k8s.core.v1.Secret("shop-db", {
    metadata: { name: "shop-db", namespace: ns },
    stringData: { DATABASE_URL: databaseUrl },
}, opts);

const envFrom = [
    { configMapRef: { name: shopConfig.metadata.name } },
    { secretRef: { name: shopSecret.metadata.name } },
];

// Pods read the ConfigMap only when they start. This hash changes when the config changes,
// which changes the pod template, which makes Kubernetes roll the pods.
const configHash = shopConfig.data.apply((data) =>
    crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 12));

const dataLayer = [postgres, redis, kafka];

// --- api -----------------------------------------------------------------------------------
const apiLabels = { app: "api" };

export const api = new k8s.apps.v1.Deployment("api", {
    metadata: { name: "api", namespace: ns },
    spec: {
        // No `replicas` here: the HorizontalPodAutoscaler below owns that number
        selector: { matchLabels: apiLabels },
        strategy: { rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } },
        template: {
            metadata: { labels: { ...apiLabels, ...scrapeLabel }, annotations: { "lab/config-hash": configHash } },
            spec: {
                enableServiceLinks: false,
                // Prefer to put the replicas on different nodes, so one node failure does not take all of them
                topologySpreadConstraints: [{
                    maxSkew: 1,
                    topologyKey: "kubernetes.io/hostname",
                    whenUnsatisfiable: "ScheduleAnyway",
                    labelSelector: { matchLabels: apiLabels },
                }],
                containers: [{
                    name: "api",
                    image,
                    command: ["node", "src/api.js"],
                    envFrom,
                    ports: [{ name: "metrics", containerPort: 8080 }], // serves the API and /metrics
                    readinessProbe: { httpGet: { path: "/readyz", port: 8080 }, periodSeconds: 5 },
                    livenessProbe: { httpGet: { path: "/healthz", port: 8080 }, periodSeconds: 10, failureThreshold: 3 },
                    // The HPA works in percent of the CPU request. No request = no autoscaling.
                    resources: { requests: { cpu: "100m", memory: "128Mi" }, limits: { memory: "256Mi" } },
                }],
            },
        },
    },
}, { ...opts, dependsOn: dataLayer });

new k8s.core.v1.Service("api", {
    metadata: { name: "api", namespace: ns },
    spec: { selector: apiLabels, ports: [{ name: "http", port: 80, targetPort: 8080 }] },
}, opts);

new k8s.autoscaling.v2.HorizontalPodAutoscaler("api", {
    metadata: { name: "api", namespace: ns },
    spec: {
        scaleTargetRef: { apiVersion: "apps/v1", kind: "Deployment", name: api.metadata.name },
        minReplicas: 2,
        maxReplicas: 6,
        metrics: [{ type: "Resource", resource: { name: "cpu", target: { type: "Utilization", averageUtilization: 70 } } }],
    },
}, { ...opts, dependsOn: [metricsServer] });

// During planned work (a node drain), at least one api pod must stay up
new k8s.policy.v1.PodDisruptionBudget("api", {
    metadata: { name: "api", namespace: ns },
    spec: { minAvailable: 1, selector: { matchLabels: apiLabels } },
}, opts);

// --- worker --------------------------------------------------------------------------------
const workerLabels = { app: "worker" };

export const worker = new k8s.apps.v1.Deployment("worker", {
    metadata: { name: "worker", namespace: ns },
    spec: {
        replicas: 1, // the topic has 3 partitions, so up to 3 workers do useful work
        selector: { matchLabels: workerLabels },
        template: {
            metadata: { labels: { ...workerLabels, ...scrapeLabel }, annotations: { "lab/config-hash": configHash } },
            spec: {
                enableServiceLinks: false,
                containers: [{
                    name: "worker",
                    image,
                    command: ["node", "src/worker.js"],
                    envFrom,
                    ports: [{ name: "metrics", containerPort: 9100 }],
                    livenessProbe: { httpGet: { path: "/healthz", port: 9100 }, periodSeconds: 10 },
                    resources: { requests: { cpu: "50m", memory: "96Mi" }, limits: { memory: "192Mi" } },
                }],
            },
        },
    },
}, { ...opts, dependsOn: dataLayer });

// --- load generator: deployed switched off -------------------------------------------------
const loadgenLabels = { app: "loadgen" };

new k8s.apps.v1.Deployment("loadgen", {
    metadata: { name: "loadgen", namespace: ns },
    spec: {
        replicas: 0, // `./lab.sh load on` scales it to 1
        selector: { matchLabels: loadgenLabels },
        template: {
            metadata: { labels: loadgenLabels },
            spec: {
                enableServiceLinks: false,
                containers: [{
                    name: "loadgen",
                    image,
                    command: ["node", "src/loadgen.js"],
                    env: [
                        { name: "API_URL", value: "http://api.apps.svc.cluster.local" },
                        { name: "ORDERS_PER_SECOND", value: "20" },
                        { name: "BURN_MS", value: "20" },
                    ],
                    resources: { requests: { cpu: "50m", memory: "64Mi" }, limits: { memory: "128Mi" } },
                }],
            },
        },
    },
    // Scaling by hand must not be undone by the next `pulumi up`
}, { ...opts, ignoreChanges: ["spec.replicas"] });

// --- web: a static page served by nginx ------------------------------------------------------
const webLabels = { app: "web" };
const html = fs.readFileSync(path.join(__dirname, "..", "apps", "web", "index.html"), "utf8");

const webContent = new k8s.core.v1.ConfigMap("web-content", {
    metadata: { name: "web-content", namespace: ns },
    data: { "index.html": html },
}, opts);

new k8s.apps.v1.Deployment("web", {
    metadata: { name: "web", namespace: ns },
    spec: {
        replicas: 2,
        selector: { matchLabels: webLabels },
        template: {
            metadata: {
                labels: webLabels,
                annotations: { "lab/content-hash": crypto.createHash("sha256").update(html).digest("hex").slice(0, 12) },
            },
            spec: {
                enableServiceLinks: false,
                containers: [{
                    name: "nginx",
                    image: "nginx:1.27-alpine",
                    ports: [{ name: "http", containerPort: 80 }],
                    readinessProbe: { httpGet: { path: "/", port: 80 }, periodSeconds: 5 },
                    resources: { requests: { cpu: "10m", memory: "16Mi" }, limits: { memory: "64Mi" } },
                    volumeMounts: [{ name: "content", mountPath: "/usr/share/nginx/html" }],
                }],
                volumes: [{ name: "content", configMap: { name: webContent.metadata.name } }],
            },
        },
    },
}, opts);

new k8s.core.v1.Service("web", {
    metadata: { name: "web", namespace: ns },
    spec: { selector: webLabels, ports: [{ name: "http", port: 80 }] },
}, opts);

// --- the door: one address, routed by path ---------------------------------------------------
new k8s.networking.v1.Ingress("shop", {
    metadata: { name: "shop", namespace: ns },
    spec: {
        ingressClassName,
        rules: [{
            http: {
                paths: [
                    { path: "/api", pathType: "Prefix", backend: { service: { name: "api", port: { number: 80 } } } },
                    { path: "/", pathType: "Prefix", backend: { service: { name: "web", port: { number: 80 } } } },
                ],
            },
        }],
    },
}, { ...opts, dependsOn: [ingress] });
