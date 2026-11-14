// The platform layer: what the cluster needs before any application arrives.
// Namespaces, an ingress controller (the door from outside), and metrics-server (CPU numbers for autoscaling).
import * as k8s from "@pulumi/kubernetes";
import { opts } from "./config";

function namespace(name: string) {
    return new k8s.core.v1.Namespace(name, { metadata: { name } }, opts);
}

export const namespaces = {
    platform: namespace("platform"),
    data: namespace("data"),
    apps: namespace("apps"),
    monitoring: namespace("monitoring"),
};

// Traefik receives all HTTP traffic and routes it by the Ingress objects in the cluster.
// kind maps port 8090 of your machine to node port 30080 (see kind-config.yaml).
// In a cloud, this Service would be of type LoadBalancer and get a public address.
export const ingress = new k8s.helm.v3.Release("traefik", {
    name: "traefik",
    chart: "traefik",
    version: "42.4.0", // pinned: chart values change between major versions
    repositoryOpts: { repo: "https://traefik.github.io/charts" },
    namespace: namespaces.platform.metadata.name,
    timeout: 600,
    values: {
        service: { spec: { type: "NodePort" } },
        ports: {
            web: { nodePort: 30080 },
            websecure: { expose: { default: false } },
        },
    },
}, opts);

/** The ingress class the applications ask for. */
export const ingressClassName = "traefik";

// metrics-server collects CPU and memory use from the kubelets. `kubectl top` and the HPA read it.
// Managed clusters (EKS, GKE, AKS) ship it or an equivalent. kind does not.
export const metricsServer = new k8s.helm.v3.Release("metrics-server", {
    name: "metrics-server",
    chart: "metrics-server",
    version: "3.14.0",
    repositoryOpts: { repo: "https://kubernetes-sigs.github.io/metrics-server/" },
    namespace: "kube-system",
    timeout: 600,
    values: {
        // kind's kubelets use self-signed certificates
        args: ["--kubelet-insecure-tls"],
    },
}, opts);
