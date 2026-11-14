---
title: CI/CD
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# CI/CD

**Level: intro**

CI/CD is the automated road from a commit to production. Every change is built and tested the same way, by a machine, and released by pressing merge. It is the center of DevOps work: most of what you build ends up as a step in a pipeline.

## Terms

| Term | Meaning |
|---|---|
| Continuous integration (CI) | Every change is merged often, and built and tested automatically |
| Continuous delivery | Every change that passes is ready to release. The release itself is one manual approval |
| Continuous deployment | Every change that passes goes to production with no manual step |
| Pipeline | The whole automated flow, defined in a file in the repository |
| Stage / job / step | The parts of a pipeline, from large to small. Jobs can run in parallel |
| Runner / agent | The machine that executes jobs |
| Trigger | What starts a pipeline: a push, a pull request, a tag, a schedule |
| Artifact | What a build produces: a container image, a package, a binary |
| Registry | Where artifacts are stored and versioned |
| Cache | Files kept between runs (dependencies, build layers) to make the pipeline faster |
| Environment | A deployment target: dev, staging, production. Often with its own secrets and approvals |
| Build once, deploy many | The same artifact goes through every environment. Only configuration changes |

## The tools

| Tool | Notes |
|---|---|
| **GitHub Actions** | Built into GitHub. A huge library of ready-made actions |
| **GitLab CI** | Built into GitLab. Strong for self-hosted setups |
| **Jenkins** | The veteran. Self-hosted, very flexible, and you maintain it |
| **Azure DevOps Pipelines** | Common in Microsoft shops |
| CircleCI, Buildkite, TeamCity | Hosted or hybrid alternatives |
| **Tekton, Argo Workflows** | Pipelines that run as Kubernetes objects |
| **Argo CD, Flux** | The deployment side, see [GitOps](gitops.md) |

The ideas are the same in all of them. Only the YAML differs.

## A small example: test, then build and push an image

`.github/workflows/ci.yml`:

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pytest

  image:
    needs: test                               # only if the tests passed
    if: github.ref == 'refs/heads/main'       # only on main, not on pull requests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
```

What it shows:

- A pull request runs only the tests. A merge to main also builds and pushes the image.
- The image is tagged with the commit hash, so every running version points back to its exact code. (The registry needs the repository name in lowercase.)
- The registry password is a short-lived token from the platform, not a secret someone typed in.

## What makes a pipeline good

- **Fast**: under ten minutes, or people stop waiting for it.
- **Reliable**: a red pipeline always means a real problem. Flaky tests are fixed or removed.
- **Reproducible**: pinned versions and lock files.
- **Secure**: least-privilege tokens, no long-lived cloud keys (see [Security](../10-security/security.md)).

## Where it goes next

- Beginner: a full pipeline for a real app, with tests, image scan, and deployment to a cluster.
- Advanced: self-hosted runners, caching strategy, monorepo pipelines, supply-chain hardening, measuring delivery (DORA metrics).

## See also

- [Deployment strategies](deployment-strategies.md), [GitOps](gitops.md)
- [DevOps intro: CI/CD](../../devops/01-get-started/intro.md)
