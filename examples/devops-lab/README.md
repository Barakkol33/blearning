# devops-lab

A small production-like platform on your laptop: a Kubernetes cluster (kind) running a shop application with PostgreSQL, Redis, Kafka, Elasticsearch, Prometheus and Grafana. Everything is deployed by one Pulumi program in TypeScript, and built to be changed, loaded and broken.

It is the practical project of the [DevOps guide on blearning](https://barakkol33.github.io/blearning/tech/software-development/devops/lab/). The guide explains the architecture, walks through the code and has a list of experiments.

## Prerequisites

Linux, macOS or WSL, with:

| Tool | Check | Install |
|---|---|---|
| Docker | `docker info` | https://docs.docker.com/get-docker/ |
| kind | `kind version` | https://kind.sigs.k8s.io/docs/user/quick-start/#installation |
| kubectl | `kubectl version --client` | https://kubernetes.io/docs/tasks/tools/ |
| Node.js 20+ | `node --version` | https://nodejs.org/ |
| Pulumi CLI | `pulumi version` | `curl -fsSL https://get.pulumi.com \| sh` |

Docker needs about 6 GB of memory for the full lab. No Pulumi account is needed: the state is kept in a local folder.

## Quick start

```bash
./lab.sh up        # cluster + image + deploy. 5 to 10 minutes the first time
./lab.sh status
```

| What | Where |
|---|---|
| The shop | http://localhost:8090 |
| Grafana, dashboard "Shop" | http://grafana.localhost:8090 (admin / admin) |
| Prometheus | http://prometheus.localhost:8090 |

```bash
./lab.sh load on   # a stream of customers. Watch the dashboard
./lab.sh load off
./lab.sh down      # delete everything
```

Run `./lab.sh` with no arguments for all commands.

## Layout

```text
lab.sh                  commands: up, status, load, psql, redis, kafka, es, down...
kind-config.yaml        the cluster: 1 control-plane node + 2 workers
kind-config-small.yaml  a single-node cluster (LAB_SMALL=1)
apps/shop/              the application (Node.js): api, worker, load generator, one Dockerfile
apps/web/               the page nginx serves
infra/                  the Pulumi program
  index.ts              imports the layers, exports the URLs
  config.ts             settings and the Kubernetes provider
  platform.ts           namespaces, Traefik ingress, metrics-server
  data.ts               PostgreSQL, Redis, Kafka, Elasticsearch and their exporters
  apps.ts               web, api, worker, loadgen, autoscaler, ingress
  monitoring.ts         Prometheus, Grafana, a dashboard, alert rules
```

## Settings

Set with `pulumi config set <name> <value>` in `infra/`, then `./lab.sh deploy`. To run `pulumi` yourself, first:

```bash
cd infra
export PULUMI_BACKEND_URL="file://$PWD/../.pulumi-state" PULUMI_CONFIG_PASSPHRASE=""
```

| Name | Default | Meaning |
|---|---|---|
| `search` | `true` | Elasticsearch and the search feature (about 1 GB) |
| `monitoring` | `true` | Prometheus and Grafana (about 1 GB) |
| `workerMs` | `100` | Milliseconds the worker spends per order |
| `kubeContext` | `kind-devops-lab` | The kubectl context to deploy to |

## A smaller lab

```bash
LAB_SMALL=1 ./lab.sh up     # a single-node cluster
```

Use it when memory is short or when another kind cluster is already running. To also drop the heavy services, set `search` and `monitoring` to `false`.

## Troubleshooting

- **The cluster is not created, a worker fails to join.** Usually another kind cluster is running and the inotify limits are too low for both: `sudo sysctl fs.inotify.max_user_instances=512 fs.inotify.max_user_watches=524288`, or use `LAB_SMALL=1`.
- **Port 8090 is taken.** Change `hostPort` in `kind-config.yaml` before `up`.
- **Pods stay Pending or get OOMKilled.** Docker has too little memory. Switch off `search` and `monitoring`.
- **`pulumi up` timed out on a Helm release.** The first run downloads many images. Run `./lab.sh deploy` again: it continues where it stopped.
- **`grafana.localhost` does not open.** Some setups do not resolve `*.localhost`. Use `kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80` and open http://localhost:3000.
- **kubectl now points at the lab.** kind switches the current context to `kind-devops-lab`. Switch back with `kubectl config use-context <name>`.

## Not for production

Every data service is a single instance, there is no TLS, the password is a lab password and nothing is backed up. The guide's page "The lab in a cloud" lists what a real deployment replaces.
