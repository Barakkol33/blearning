// Everything that can be switched from outside, in one place.
// Change a value with:  pulumi config set <name> <value>   (lab.sh does this for imageTag)
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const cfg = new pulumi.Config();

export const settings = {
    /** kubectl context to deploy to. This is the only line that knows the cluster is kind. */
    kubeContext: cfg.get("kubeContext") ?? "kind-devops-lab",
    /** Tag of the devops-lab/shop image that lab.sh built and loaded into the cluster. */
    imageTag: cfg.get("imageTag") ?? "dev",
    /** Elasticsearch and the search feature. About 1 GB of memory. */
    search: cfg.getBoolean("search") ?? true,
    /** Prometheus and Grafana. About 1 GB of memory. */
    monitoring: cfg.getBoolean("monitoring") ?? true,
    /** Milliseconds the worker spends on each order. Higher = lag builds faster. */
    workerMs: cfg.getNumber("workerMs") ?? 100,
    /** A lab password. A real system reads it from a secret manager. */
    dbPassword: cfg.getSecret("dbPassword") ?? pulumi.secret("lab-password"),
};

export const provider = new k8s.Provider("cluster", {
    context: settings.kubeContext,
    // By default Pulumi replaces a ConfigMap or Secret whose content changed (delete, then create),
    // and everything that refers to it is replaced with it: a new image tag would delete the
    // Deployments and cause downtime. With these two, the change is an update in place,
    // and the pods are rolled by the config hash in their template (see apps.ts).
    enableConfigMapMutable: true,
    enableSecretMutable: true,
});

/** Pods with this label and a container port named "metrics" are scraped by Prometheus (see monitoring.ts). */
export const scrapeLabel = { "lab-metrics": "true" };

/** Options every resource gets. */
export const opts: pulumi.CustomResourceOptions = { provider };
