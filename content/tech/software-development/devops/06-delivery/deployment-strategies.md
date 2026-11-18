---
title: Deployment strategies
order: 3
lang: en
tags: [intro, advanced]
updated: 2026-11-13
---

# Deployment strategies

Replacing version 1 with version 2 while users are on the system is the riskiest routine action in operations. A deployment strategy decides how traffic moves to the new version, and how fast you can go back.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

### Terms

| Term | Meaning |
|---|---|
| Recreate | Stop the old version, start the new one. Simple, with downtime |
| Rolling update | Replace instances a few at a time. The default in Kubernetes |
| Blue-green | Run the new version (green) next to the old (blue), then switch all traffic at once |
| Canary | Send a small share of traffic (say 5%) to the new version, watch, and grow the share |
| Feature flag | A switch in the code that turns a feature on or off without a deployment |
| Rollback | Returning to the previous version |
| Roll forward | Fixing a bad release with a new release, when going back is not possible |
| Deploy vs release | Deploy: the code is running in production. Release: users get the feature. Flags separate the two |
| Expand and contract | Changing a database schema in backward-compatible steps, so old and new code both work during the switch |

### Comparing them

| Strategy | Downtime | Rollback | Cost | Risk |
|---|---|---|---|---|
| Recreate | Yes | Slow: redeploy | Low | High |
| Rolling | No | Medium: roll back gradually | Low | Medium: two versions serve together |
| Blue-green | No | Instant: switch back | Double resources for a while | Low |
| Canary | No | Fast: shift the traffic back | Low to medium | Lowest: few users see a problem |

### A small example: a rolling update in Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # at most 1 extra pod during the update
      maxUnavailable: 0    # never fewer than 4 ready pods
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: nginx:1.27
          readinessProbe:               # traffic arrives only when this passes
            httpGet: { path: /, port: 80 }
```

```bash
kubectl apply -f web.yaml
kubectl set image deployment/web web=nginx:1.28     # start the rollout
kubectl rollout status deployment/web               # watch: one pod at a time

kubectl rollout history deployment/web
kubectl rollout undo deployment/web                 # rollback to the previous version
```

The readiness probe is what makes this safe: a new pod that never becomes ready stops the rollout, and the old pods keep serving.

### The hard part is the database

Code can go back in seconds. Data cannot. To rename a column without downtime, expand and contract:

1. **Expand**: add the new column. The old code ignores it.
2. Deploy code that writes to both columns and reads from the new one. Copy the old data over.
3. **Contract**: after everything runs on the new code, drop the old column.

Each step is its own deployment, and each can be rolled back.

## Advanced

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **Rolling updates in depth**: `maxSurge`, `maxUnavailable`, readiness gates
- **Blue-green deployments**: two environments and a switch, the cost of double capacity
- **Canary releases**: a small share of traffic first, automated analysis
- **Progressive delivery tools**: Argo Rollouts, Flagger
- **Feature flags**: deploy is not release; dark launches
- **A/B testing**: experiments on users vs safety rollouts
- **Shadow traffic**: copying real requests to a new version
- **Rollback vs roll forward**: and why database changes make rollback hard
- **Expand and contract migrations**: schema changes that work with the old and the new version
- **Zero-downtime deploys**: connection draining, graceful shutdown, `preStop`
- **Deployment windows and change freezes**: and why small frequent deploys are safer
- **Automated rollback on SLOs**: rolling back when error rate or latency rises

## In the lab

- A rolling update with `maxUnavailable: 0`, a release that fails, and a rollback: [experiment 11](../13-lab/experiments.md#11-a-bad-release-and-a-rollback).

## See also

- [CI/CD](ci-cd.md), [GitOps](gitops.md)
