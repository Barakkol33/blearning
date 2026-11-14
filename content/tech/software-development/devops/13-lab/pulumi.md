---
title: "Pulumi: how the lab is deployed"
sidebar:
  label: Pulumi
order: 1
lang: en
tags: [beginner]
updated: 2026-11-14
---

# Pulumi: how the lab is deployed

**Level: beginner**

The [lab](_index.md) is deployed by one Pulumi program written in TypeScript. Pulumi is infrastructure as code like [Terraform](../04-infrastructure-as-code/terraform.md): you describe what should exist, it works out what to create, change and delete. The difference is the language. In Pulumi the description is a real program, with functions, loops, imports and types.

## Terms

| Term | Meaning |
|---|---|
| Program | The code that declares the resources. Here: `infra/index.ts` and the files it imports |
| Project | A folder with a `Pulumi.yaml`. It names the program and its runtime (Node.js here) |
| Stack | One deployed instance of a project, with its own configuration and state: `local`, `staging`, `production` |
| Resource | One thing Pulumi manages. `new k8s.apps.v1.Deployment(...)` declares one |
| Provider | The plugin that talks to one API: Kubernetes here, AWS or GCP in a cloud |
| State | Pulumi's record of what it created. In a local folder for the lab, in a bucket or Pulumi Cloud for real work |
| Config | Per-stack settings, read in the program. Set with `pulumi config set` |
| Secret | A config value or output that Pulumi encrypts in the state and hides in its output |
| Output | A value known only after a resource exists (an address, a generated name). Passing one resource's output to another is how Pulumi learns the order |
| Preview / up / destroy | Show the planned changes / apply them / delete everything |

The same ideas as in Terraform, with other names: a stack is a workspace, `pulumi up` is `terraform apply`, `pulumi preview` is `terraform plan`.

## The layout

```text
devops-lab/
├── lab.sh              the commands: up, status, load, psql, down...
├── kind-config.yaml    the cluster: 1 control-plane node, 2 workers
├── apps/
│   ├── shop/           the application (Node.js): api, worker, load generator, one Dockerfile
│   └── web/            the page nginx serves
└── infra/              the Pulumi program
    ├── index.ts        imports the layers, exports the URLs
    ├── config.ts       settings and the Kubernetes provider
    ├── platform.ts     namespaces, ingress controller, metrics-server
    ├── data.ts         PostgreSQL, Redis, Kafka, Elasticsearch and their exporters
    ├── apps.ts         web, api, worker, loadgen, autoscaler, ingress
    └── monitoring.ts   Prometheus, Grafana, a dashboard, alert rules
```

Each file is one layer, and a layer uses only what the layers before it export. `apps.ts` does not know how PostgreSQL is run. It imports `databaseUrl` from `data.ts`. Replace the pod with a managed database and `apps.ts` does not change (see [the lab in a cloud](cloud.md)).

## What `./lab.sh up` does

1. **`kind create cluster`**: three Docker containers that act as Kubernetes nodes.
2. **`docker build`** the shop image, tagged with a hash of the application's files, and **`kind load`** to copy it into the nodes. With a real cluster this step is a push to a registry.
3. **`pulumi up`**: runs the program, compares the declared resources with the state, and creates what is missing.

Pulumi's state is kept in `.pulumi-state/` inside the project, so there is no account and no login.

## Reading the code

### A resource

```typescript
new k8s.core.v1.Service("api", {
    metadata: { name: "api", namespace: ns },
    spec: { selector: apiLabels, ports: [{ name: "http", port: 80, targetPort: 8080 }] },
}, opts);
```

The same fields as a YAML manifest, written as an object. The editor completes every field and marks a wrong one before anything is deployed, which YAML cannot do.

### Outputs connect resources

```typescript
const postgresSecret = new k8s.core.v1.Secret("postgres", { ... });

env: [{
    name: "POSTGRES_PASSWORD",
    valueFrom: { secretKeyRef: { name: postgresSecret.metadata.name, key: "password" } },
}]
```

`postgresSecret.metadata.name` is an output of the Secret. By using it, the StatefulSet depends on the Secret, so Pulumi creates the Secret first. Nobody writes the order down.

### A real language pays off

One function builds every dashboard panel:

```typescript
panel(6, "Kafka consumer lag", 16, 7, [
    { expr: `sum(kafka_consumergroup_lag{consumergroup="order-workers"})`, legend: "orders waiting" },
]),
```

A setting switches a whole part on or off with an ordinary `if`:

```typescript
if (settings.search) {
    new k8s.apps.v1.StatefulSet("elasticsearch", { ... });
    searchUrl = "http://elasticsearch.data.svc.cluster.local:9200";
}
```

And a hash of the configuration is put on the pods, so a config change rolls them:

```typescript
const configHash = shopConfig.data.apply((data) =>
    crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 12));
```

### Helm charts from code

Large third-party software is installed from its Helm chart, with the values written in TypeScript:

```typescript
new k8s.helm.v3.Release("monitoring", {
    chart: "kube-prometheus-stack",
    repositoryOpts: { repo: "https://prometheus-community.github.io/helm-charts" },
    namespace: ns,
    values: { grafana: { adminPassword: "admin" }, alertmanager: { enabled: false } },
});
```

## Hands-on

All from the `devops-lab` folder, after `./lab.sh up`.

**1. Change a setting and read the preview.**

```bash
cd infra
export PULUMI_BACKEND_URL="file://$PWD/../.pulumi-state" PULUMI_CONFIG_PASSPHRASE=""

pulumi config set workerMs 500        # each order now takes the worker half a second
pulumi preview --diff                 # what would change? the ConfigMap, and the pods' hash annotation
pulumi up
```

The preview shows an update to the ConfigMap, and to the `api` and `worker` Deployments because their hash annotation changed. Kubernetes then rolls the pods.

**2. Switch a layer off.**

```bash
pulumi config set search false
pulumi preview                        # the Elasticsearch resources are marked for deletion
```

Decide whether to apply it. Set it back with `pulumi config set search true`.

**3. Cause drift and repair it.**

```bash
kubectl -n apps delete service web    # a change behind Pulumi's back
pulumi preview                        # no changes: Pulumi trusts its state
pulumi refresh --yes                  # compares the state with the real cluster, and notices
pulumi up --yes                       # recreates the Service
```

**4. Add a resource.** In `infra/apps.ts`, add a second worker Deployment that reads the same topic in another consumer group, or a CronJob that deletes orders older than a day. Run `pulumi preview`, then `pulumi up`.

**5. Look at the state.**

```bash
pulumi stack                          # every resource Pulumi manages
pulumi stack output                   # the exported URLs
pulumi stack export | head -50        # the raw state: what Pulumi remembers
```

## Pulumi or Terraform?

| | Pulumi | Terraform / OpenTofu |
|---|---|---|
| Language | TypeScript, Python, Go, C#, Java | HCL |
| Abstraction | Functions and classes, tests with the language's own tools | Modules |
| Ecosystem and hiring | Smaller, growing | The industry default |
| Risk | Freedom: a program can become too clever to read | A limited language keeps configurations uniform |

Both are good. Teams of developers who also run their infrastructure often prefer Pulumi. Organizations with a platform team and many existing modules usually stay with Terraform. Know one well and be able to read the other.

## See also

- [Terraform](../04-infrastructure-as-code/terraform.md), [Configuration and images](../04-infrastructure-as-code/configuration.md)
- [Experiments](experiments.md): things to do with the running lab
