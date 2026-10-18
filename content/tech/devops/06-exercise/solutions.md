---
title: Guestbook — Solution
lang: en
---

# Guestbook — Solution

Complete solution for the Guestbook on Kubernetes exercise.

## Structure

```
solution/
  code/              # source code, Dockerfile, and frontend
    public/          #   shared HTML/JS frontend
    node/            #   Node.js backend + Dockerfile
    python/          #   Python backend + Dockerfile
    README.md        #   how to build the Docker image
  k8s/               # Kubernetes deployment via Helm
    guestbook-chart/ #   Helm chart with all K8s manifests
    README.md        #   how to deploy with Helm
```

## Quick start

### 1. Build the image

Pick Node.js or Python, then build and load:

```bash
cd code

# Copy frontend into build context
cp -r public node/public    # or: cp -r public python/public

# Build
cd node                     # or: cd python
docker build -t guestbook:dev .
cd ../..

# Load into kind
kind load docker-image guestbook:dev --name demo
```

See *Source Code & Docker Image* below for details and local testing.

### 2. Deploy with Helm

```bash
cd k8s
helm install guestbook ./guestbook-chart \
  --namespace guestbook --create-namespace
```

See *Helm Chart* below for configuration, upgrades, and uninstall.

### 3. Access the app

```bash
kubectl port-forward svc/guestbook 8080:80 -n guestbook
# Open http://localhost:8080
```

### 4. Verify

```bash
kubectl get all -n guestbook
kubectl logs -n guestbook -l app=guestbook --tail=5
helm list -n guestbook
curl -sS http://localhost:8080/api/messages | jq .
```

### 5. Cleanup

```bash
helm uninstall guestbook -n guestbook
kubectl delete ns guestbook
```


## Guestbook — Source Code & Docker Image

### Structure

```
code/
  public/          # shared frontend (HTML/JS)
  node/            # Node.js backend solution + Dockerfile
  python/          # Python backend solution + Dockerfile
```

Both backends serve the same `public/` folder and expose the same API.

### Build the Docker image

Choose one language. Copy the shared frontend into the language directory, then build:

#### Node.js

```bash
cp -r public node/public
cd node
docker build -t guestbook:dev .
```

#### Python

```bash
cp -r public python/public
cd python
docker build -t guestbook:dev .
```

### Test locally (optional)

You need a running Redis to test. The easiest way:

```bash
## Start Redis
docker network create guestbook-test
docker run -d --name redis-test --network guestbook-test redis:7-alpine redis-server --requirepass testpass

## Run the app
docker run --rm --name guestbook-test --network guestbook-test \
  -p 3000:3000 \
  -e DB_HOST=redis-test \
  -e DB_PASSWORD=testpass \
  guestbook:dev

## Open http://localhost:3000 in your browser

## Cleanup
docker rm -f redis-test guestbook-test
docker network rm guestbook-test
```

### Load into kind

```bash
kind load docker-image guestbook:dev --name demo
```


## Guestbook — Helm Chart

### Structure

```
k8s/
  guestbook-chart/
    Chart.yaml           # chart metadata
    values.yaml          # configurable values
    templates/
      configmap.yaml
      secret.yaml
      redis-service.yaml
      redis-statefulset.yaml
      guestbook-deployment.yaml
      guestbook-service.yaml
      seed-job.yaml
```

### Configurable values

| Value | Default | Description |
|---|---|---|
| `replicaCount` | `2` | Number of guestbook app replicas |
| `image.repository` | `guestbook` | Docker image name |
| `image.tag` | `dev` | Docker image tag |
| `image.pullPolicy` | `Never` | Image pull policy (Never for kind) |
| `redis.password` | `p@ssword123` | Redis password |
| `seed.enabled` | `true` | Whether to run the seed Job |

### Preview rendered templates

```bash
helm template guestbook ./guestbook-chart
```

### Lint

```bash
helm lint ./guestbook-chart
```

### Install

```bash
helm install guestbook ./guestbook-chart \
  --namespace guestbook --create-namespace
```

### Upgrade

```bash
## Change replica count
helm upgrade guestbook ./guestbook-chart \
  -n guestbook --set replicaCount=3

## Change image tag
helm upgrade guestbook ./guestbook-chart \
  -n guestbook --set image.tag=v2
```

### Uninstall

```bash
helm uninstall guestbook -n guestbook
kubectl delete ns guestbook
```
