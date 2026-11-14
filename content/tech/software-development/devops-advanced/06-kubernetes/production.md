---
title: Kubernetes in production
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# Kubernetes in production

**Level: intro**

Getting an application to run on Kubernetes is the easy part, covered in the [Kubernetes basics](../../devops/02-containers/kubernetes.md). Production asks more: the application must survive node failures and upgrades, scale with load, be reachable securely, and not disturb its neighbors. This page names the pieces that do that.

## Terms

| Term | Meaning |
|---|---|
| Requests | The CPU and memory a container is guaranteed. The scheduler places pods by them |
| Limits | The most a container may use. Over the memory limit it is killed, over the CPU limit it is slowed |
| Liveness probe | "Is it stuck?" On failure the container is restarted |
| Readiness probe | "Can it take traffic?" On failure the pod is taken out of the Service |
| HPA | Horizontal Pod Autoscaler: changes the number of replicas by CPU or another metric |
| Cluster autoscaler / Karpenter | Adds and removes nodes when pods do not fit or nodes sit empty |
| PodDisruptionBudget (PDB) | How many pods of an application must stay up during planned work such as a node drain |
| Ingress / Gateway API | Routing of outside HTTP traffic to Services. Gateway API is the newer, richer standard |
| NetworkPolicy | A firewall between pods. By default every pod can reach every pod |
| RBAC | Who may do what in the cluster: Roles, bound to users or ServiceAccounts |
| ServiceAccount | The identity of a pod, inside the cluster and toward the cloud |
| CRD | Custom Resource Definition: a new object type added to the Kubernetes API |
| Operator | A controller that manages an application through CRDs, e.g. a database with its backups and failover |
| Admission controller | Checks or changes objects when they are created. Used for policy (Kyverno, OPA Gatekeeper) |
| Service mesh | A layer that adds encryption, retries and traffic control between services (Istio, Linkerd, Cilium) |

## The add-ons almost every cluster has

| Need | Common choice |
|---|---|
| Incoming traffic | An ingress or Gateway API controller (Envoy Gateway, Traefik, the cloud's own) |
| TLS certificates | cert-manager |
| DNS records | external-dns |
| Secrets from a vault | External Secrets Operator |
| Deployments | [Argo CD or Flux](../05-delivery/gitops.md) |
| Metrics, logs | Prometheus, Grafana, Loki (see [Observability](../09-observability/observability.md)) |
| Policy | Kyverno or OPA Gatekeeper |
| Node scaling | Cluster Autoscaler or Karpenter |

## A small example: scale with load, survive a node drain

Starting from a Deployment named `web` whose container declares requests:

```yaml
resources:
  requests: { cpu: 200m, memory: 256Mi }
  limits: { memory: 256Mi }
```

Add an autoscaler and a disruption budget:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70     # percent of the CPU request
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web
spec:
  minAvailable: 2
  selector:
    matchLabels: { app: web }
```

```bash
kubectl get hpa web -w          # replicas rise when average CPU passes 70%
kubectl drain <node> --ignore-daemonsets
# The drain evicts pods one by one and waits, so at least 2 stay ready.
```

The HPA works in percent of the **request**, which is one reason every container must declare requests.

## A checklist before production

- Requests on every container, and a memory limit.
- Readiness and liveness probes.
- At least two replicas, spread over nodes and zones, with a PDB.
- No secrets in manifests or images.
- NetworkPolicies and least-privilege RBAC.
- Metrics, logs and alerts in place before the first user.

## Where it goes next

- Beginner: probes, HPA and Ingress on a kind cluster, with a load test.
- Advanced: the scheduler, networking (CNI, eBPF), storage, writing an operator, cluster upgrades, multi-cluster.

## See also

- [Deployment strategies](../05-delivery/deployment-strategies.md)
- [Runtimes and engines](../04-code/runtimes.md): fitting a runtime to its limits
