---
title: GitOps
order: 3
lang: en
tags: [intro]
updated: 2026-11-13
---

# GitOps

**Level: intro**

In GitOps, a Git repository holds the full description of what should run, and a controller inside the cluster keeps the cluster equal to it. Nobody runs `kubectl apply` by hand and the pipeline does not push to the cluster. To change production you merge a commit.

## Terms

| Term | Meaning |
|---|---|
| Desired state | What Git says should run |
| Actual (live) state | What really runs in the cluster |
| Reconciliation | The loop that compares the two and fixes the difference |
| Sync | Applying the desired state to the cluster |
| Drift | A difference between the cluster and Git, usually from a manual change |
| Self-heal | The controller reverts drift automatically |
| Prune | Deleting from the cluster what was deleted from Git |
| Push model | A pipeline with cluster credentials runs the deployment |
| Pull model | A controller in the cluster pulls from Git. No cluster credentials leave the cluster |
| Config repository | The repository with manifests, separate from the application's source code |

## The tools

| Tool | Notes |
|---|---|
| **Argo CD** | The most common. A web UI that shows every application and its sync state |
| **Flux** | A set of controllers, no UI of its own, very composable |
| **Helm** | Packages manifests as charts with values per environment |
| **Kustomize** | Overlays on plain manifests: a base plus patches per environment |

Argo CD and Flux both deploy Helm charts, Kustomize overlays and plain YAML.

## What it gives you

- **History and audit**: `git log` is the full record of who changed what, when, and why.
- **Rollback**: `git revert`.
- **Review**: a production change is a pull request.
- **Recovery**: a lost cluster is rebuilt by pointing a new one at the repository.

## A small example: an Argo CD application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: guestbook
  syncPolicy:
    automated:
      prune: true        # delete what was removed from Git
      selfHeal: true     # revert manual changes
    syncOptions:
      - CreateNamespace=true
```

After `kubectl apply -f app.yaml`, Argo CD deploys everything in that folder and keeps watching. Try it:

```bash
kubectl -n guestbook scale deployment guestbook-ui --replicas 5
kubectl -n guestbook get deployment guestbook-ui -w
# Within moments the replicas go back to the number written in Git.
```

## How CI and GitOps fit together

1. The [CI pipeline](ci-cd.md) tests the code and pushes an image tagged with the commit hash.
2. The pipeline (or a bot) updates the image tag in the config repository, as a commit or a pull request.
3. The GitOps controller sees the commit and syncs the cluster.

CI never touches the cluster.

## Where it goes next

- Beginner: install Argo CD on a kind cluster and deploy an app from your own repository, with two environments.
- Advanced: app-of-apps and ApplicationSets, secrets in GitOps (External Secrets, SOPS), promotion between environments, many clusters.

## See also

- [Kubernetes and Helm](../02-containers/kubernetes.md)
- [Deployment strategies](deployment-strategies.md)
