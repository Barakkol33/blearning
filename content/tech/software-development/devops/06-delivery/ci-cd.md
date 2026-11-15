---
title: CI/CD
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# CI/CD

CI/CD is the automated road from a commit to production. Every change is built and tested the same way, by a machine, and released by pressing merge. It is the center of DevOps work: most of what you build ends up as a step in a pipeline.

**Levels on this page:** [Intro](#intro)

## Intro

### Terms

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

### The tools

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

### A small example: test, then build and push an image

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

### The same flow in GitLab CI

The stages are the same in every tool. This is the shape of a pipeline with a staging deployment and a manual approval before production, in `.gitlab-ci.yml`. The deploy jobs are placeholders: with Kubernetes they usually run `helm upgrade --install` or `kubectl apply`, or only update a Git repository that [GitOps](gitops.md) watches.

```yaml
stages: [test, build, deploy_staging, approve_prod, deploy_prod]

test:
  stage: test
  image: alpine:3.20
  script:
    - echo "run unit tests here"

build:
  stage: build
  image: docker:27
  services: ["docker:27-dind"]
  variables:
    DOCKER_TLS_CERTDIR: ""
  script:
    - docker build -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA" .
    - docker push "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"

deploy_staging:
  stage: deploy_staging
  image: alpine:3.20
  script:
    - echo "deploy to staging"

approve_prod:
  stage: approve_prod
  when: manual                     # a person presses the button
  script:
    - echo "approval gate"

deploy_prod:
  stage: deploy_prod
  image: alpine:3.20
  script:
    - echo "deploy to production"
```

Real pipelines add caching, artifacts, environments and protected variables.

### What makes a pipeline good

- **Fast**: under ten minutes, or people stop waiting for it.
- **Reliable**: a red pipeline always means a real problem. Flaky tests are fixed or removed.
- **Reproducible**: pinned versions and lock files.
- **Secure**: least-privilege tokens, no long-lived cloud keys (see [Security](../10-security/_index.md)).

## In the lab

- The [lab](../13-lab/_index.md) has a GitHub Actions workflow that creates a cluster on the runner, deploys the whole lab and runs its smoke test (`.github/workflows/devops-lab.yml`).
- `./lab.sh test` is that smoke test: it checks every part, and sends one order through all of them.

## See also

- [Git and code hosting](git.md): where a pipeline starts
- [Artifacts and registries](artifacts.md): where its output goes
- [Deployment strategies](deployment-strategies.md), [GitOps](gitops.md)
- [What is DevOps](../01-get-started/intro.md#getting-a-change-to-users): the stages of a delivery flow
