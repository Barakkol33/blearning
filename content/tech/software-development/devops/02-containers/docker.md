---
title: Docker
order: 1
lang: en
tags: [intro, beginner, advanced]
updated: 2026-11-17
---

# Docker

Docker packages an application together with everything it needs to run (the libraries, the runtime, the configuration) into one file, an **image**, and runs it as an isolated process, a **container**. The same image runs on a laptop, in CI and in production, which ends "it works on my machine". Almost everything in modern delivery is built on it: CI builds an image, a registry stores it, and [Kubernetes](kubernetes.md) runs it.

**Levels on this page:** [Intro](#intro) · [Beginner](#beginner) · [Advanced](#advanced)

## Intro

### Terms

| Term | Meaning |
|---|---|
| Image | A read-only package: a filesystem with the application and its dependencies, plus metadata (the command to run, the user, the ports). Built once, run many times |
| Container | A running instance of an image. A normal Linux process with its own view of files, network and processes |
| Dockerfile | The recipe an image is built from, one instruction per line |
| Layer | Each instruction in a Dockerfile adds a layer: the files it changed. An image is a stack of layers, and unchanged layers are reused |
| Build context | The folder sent to the builder. `COPY` can only take files from it |
| Base image | The image a Dockerfile starts `FROM`: `node:22-alpine`, `python:3.12-slim`, `debian:12` |
| Registry | A server that stores images: Docker Hub, GitHub Container Registry (ghcr.io), ECR, Artifact Registry, ACR, Artifactory |
| Tag | A movable name for an image version: `nginx:1.27-alpine`. `latest` is only the default tag, not "the newest" |
| Digest | The fixed ID of an image's content, `sha256:...`. Unlike a tag it never moves |
| Volume | Storage managed by Docker that outlives a container: database files, uploads |
| Bind mount | A host folder mounted into a container, mostly for development |
| Network | A virtual network between containers. On a network you create, containers find each other by name |
| Compose | A YAML file that describes several containers that run together, started with `docker compose up` |

### What is different about it

A container is not a small virtual machine. A VM has its own kernel on emulated hardware. A container is a process on the host's kernel that the kernel isolates:

| Mechanism | What it gives the container |
|---|---|
| **Namespaces** | Its own view: process IDs (the app is PID 1), network interfaces and ports, the filesystem, the host name, users |
| **cgroups** | Limits: CPU, memory, I/O. Above its memory limit, the kernel kills it (`OOMKilled`, exit code 137) |
| **A layered filesystem** (OverlayFS) | The image's read-only layers, with a thin writable layer on top. The writable layer is thrown away with the container |

What follows from it:

- A container starts in milliseconds and costs almost nothing beyond its own process.
- Many containers of the same image share its layers on disk.
- Anything written inside a container that is not on a volume is lost when the container is removed. That is a feature: a container can be replaced at any time, which is what Kubernetes does all day.
- The isolation is weaker than a VM's: all containers share one kernel. A process that is root in a container, with the wrong settings, is close to root on the host. This is why [the image should not run as root](#run-as-a-normal-user).
- A container lives as long as its main process. When it exits, the container stops.

### A small example: a web server

```bash
docker run -d --name web -p 127.0.0.1:8088:80 nginx:1.27-alpine
docker ps
curl -s 127.0.0.1:8088/ | grep title
docker logs web | tail -1
docker stop web && docker rm web
```

```text
CONTAINER ID   IMAGE               STATUS        PORTS                    NAMES
4178d62f0b62   nginx:1.27-alpine   Up 1 second   127.0.0.1:8088->80/tcp   web

<title>Welcome to nginx!</title>

172.17.0.1 - - [17/Nov/2026:19:20:23 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/8.5.0" "-"
```

Docker pulled the image from Docker Hub, started nginx as a process, and forwarded port 8088 on the host to port 80 in the container (`-p HOST:CONTAINER`). The `127.0.0.1` in front makes the port reachable only from this machine. Without it, the port is open to the whole network.

### Docker and Kubernetes

The image is the unit of delivery. On one machine, Docker (or Compose) runs it. On many machines, Kubernetes runs the same image as a container in a Pod, and adds what one machine cannot: scheduling, restarts on another node, scaling, rolling updates, load balancing. Kubernetes does not use Docker itself to run containers (it uses containerd), but it runs exactly the images that `docker build` makes.

## Beginner

The commands you use every day, and then the part that matters most in production: building images that are small, quick to build and safe. Every command was run with Docker 27.4 in WSL (Ubuntu). Your IDs, times and dates will be different.

### Everyday commands

#### Images

| Command | What it does |
|---|---|
| `docker pull nginx:1.27-alpine` | Download an image. Name the tag: without one, you get `latest`, which changes under you |
| `docker images` | List local images and their sizes |
| `docker build -t myapp:dev .` | Build the Dockerfile in the current folder, and name the result |
| `docker tag myapp:dev ghcr.io/me/myapp:1.0.0` | Give an image a second name, usually a registry address before a push |
| `docker push ghcr.io/me/myapp:1.0.0` | Upload to a registry (after `docker login ghcr.io`) |
| `docker history myapp:dev` | The layers and how much each one added |
| `docker rmi myapp:dev` | Remove a local image |

#### Containers

| Command | What it does |
|---|---|
| `docker run --rm -it alpine:3.20 sh` | A throwaway container with a shell. `--rm` deletes it on exit |
| `docker run -d --name web -p 127.0.0.1:8088:80 nginx:1.27-alpine` | Run in the background, with a name and a published port |
| `docker ps`, `docker ps -a` | Running containers; all of them, including stopped ones |
| `docker logs web --tail 50`, `docker logs -f web` | Its output (stdout and stderr); follow it |
| `docker exec -it web sh` | A shell inside a running container |
| `docker stats --no-stream` | CPU and memory per container |
| `docker inspect web` | Everything about it as JSON: exit code, mounts, networks, environment |
| `docker stop web`, `docker rm web` | Stop it (SIGTERM, then SIGKILL after 10 seconds), then remove it |

```bash
docker exec web nginx -v
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" web
```

```text
nginx version: nginx/1.27.5
NAME      CPU %     MEM USAGE / LIMIT
web       0.00%     12.49MiB / 7.624GiB
```

The limit is the whole machine, because none was set. Set one with `--memory` and see what happens above it:

```bash
docker run --rm --memory 32m node:22-alpine node -e "const a=[]; for(;;) a.push(Buffer.alloc(1e6,1))"
echo "exit code $?"
```

```text
exit code 137
```

137 is 128 + 9: the process got signal 9 (SIGKILL) from the kernel. In Kubernetes the same thing shows as `OOMKilled`.

#### Data that must survive: volumes

```bash
docker volume create mydata
docker run --rm -v mydata:/data busybox:1.36 sh -c "echo hello > /data/msg"
docker run --rm -v mydata:/data busybox:1.36 cat /data/msg       # a new container
docker volume rm mydata
```

```text
hello
```

The first container is gone, the file is not. A bind mount (`-v "$PWD":/work`) maps a host folder instead, which is handy in development to edit code on the host and run it in the container.

#### Containers that talk to each other: networks

```bash
docker network create appnet
docker run -d --name redis --network appnet redis:7-alpine
docker run --rm --network appnet redis:7-alpine redis-cli -h redis PING    # on the network
docker run --rm redis:7-alpine redis-cli -h redis PING                     # not on it
docker rm -f redis && docker network rm appnet
```

```text
PONG
Could not connect to Redis at redis:6379: Name does not resolve
```

On a network you created, Docker runs a DNS server, and a container's name is its host name. `localhost` inside a container is the container itself, never another container.

#### Several containers together: Compose

```yaml
# compose.yaml
services:
  api:
    build: .
    ports:
      - "127.0.0.1:8089:8080"
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devpass
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
docker compose up -d --build
docker compose ps
docker compose exec api getent hosts db      # services find each other by name
docker compose down -v                       # stop, remove, and delete the volume
```

```text
SERVICE   STATUS        PORTS
api       Up 1 second   127.0.0.1:8089->8080/tcp
db        Up 1 second   5432/tcp

172.20.0.2        db  db
```

Compose creates a network for the project, so `api` reaches the database at `db:5432`. `depends_on` only orders the start: it does not wait until PostgreSQL accepts connections. The application should retry, as it must in production anyway.

#### When a container misbehaves

1. `docker ps -a`: is it running, or did it exit? With which exit code?
2. `docker logs <name> --tail 200`: what did it print before it stopped? A missing variable or file shows up here.
3. `docker inspect <name>`: exit code, `OOMKilled`, mounts, networks, environment.
4. `docker exec -it <name> sh`: if it is running, look from inside.

| Symptom | Usual cause |
|---|---|
| Exits right after it starts | The main process failed: read the logs. Or the command finished, because a container lives only as long as its main process |
| Exit code 137 | Killed: out of memory, or did not stop within the timeout after SIGTERM |
| `port is already allocated`, `address already in use` | Something else holds the host port. Choose another one |
| Cannot reach another container | Not on the same network, or using `localhost` |
| Data gone after a restart | It was not on a volume |
| Disk full | Old images and build cache: `docker system df`, then `docker image prune`, `docker builder prune` |

### Small and safe images

A real image is built thousands of times and runs in production, so three things matter: how big it is (pull time, disk, start time), how fast it builds (every CI run), and what an attacker finds inside it. This section takes a small TypeScript web service from a first, careless Dockerfile to a good one, measuring each step.

The service: `src/server.ts` with Express, compiled by `tsc` (a dev dependency) into `dist/`. The folder also has a `.git` folder, a local `node_modules`, and a `.env` file with a password, as a real project folder does:

```typescript
import express from "express";

const app = express();
app.get("/", (_req, res) => { res.send("hello\n"); });

const server = app.listen(8080, () => console.log("listening on 8080"));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
```

#### The starting point

```dockerfile
FROM node:22
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
```

```bash
docker build -t hello:naive .
docker images hello
docker run --rm hello:naive ls -a
docker run --rm hello:naive cat .env
docker run --rm hello:naive id
```

```text
REPOSITORY   TAG       IMAGE ID       CREATED         SIZE
hello        naive     9f16a24ce110   2 seconds ago   1.16GB

.  ..  .env  .git  .gitignore  Dockerfile  dist  node_modules  package-lock.json  package.json  src  tsconfig.json

DB_PASSWORD=s3cret

uid=0(root) gid=0(root) groups=0(root)
```

It works, and it has five problems:

1. **1.16 GB.** The `node:22` base is a full Debian with compilers, and the image keeps TypeScript and every dev dependency.
2. **The password is in the image.** `COPY . .` took `.env`, and `.git` with the whole history. Anyone who can pull the image can read them. `.gitignore` does not apply to Docker.
3. **The host's `node_modules` was copied in**, built for another system perhaps, before `npm install` ran over it.
4. **It runs as root.**
5. **Every code change reinstalls all dependencies.** Change one line and build again:

```bash
echo "// a comment" >> src/server.ts
docker build --progress=plain -t hello:naive .
```

```text
#6 [2/5] WORKDIR /app
#6 CACHED
#7 [3/5] COPY . .
#7 DONE 0.2s
#8 [4/5] RUN npm install
#8 DONE 2.2s
#9 [5/5] RUN npm run build
#9 DONE 3.5s
```

#### The build cache and `.dockerignore`

Docker reuses a layer only when the instruction and everything before it are unchanged. For `COPY`, unchanged means the copied files are the same. `COPY . .` copies everything, so any change to any file invalidates it and every step after it.

The fix is to copy what changes rarely first. The dependency list changes rarely, the code changes all the time:

```dockerfile
FROM node:22
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
```

`npm ci` installs exactly what `package-lock.json` says, and fails if it does not match `package.json`. Use it in builds, never `npm install`. And a `.dockerignore` keeps the rest out of the build context:

```text
node_modules
dist
.git
.env
Dockerfile
.dockerignore
```

The same one-line change now:

```text
#7 [3/6] COPY package.json package-lock.json ./
#7 CACHED
#8 [4/6] RUN npm ci
#8 CACHED
#9 [5/6] COPY . .
#10 [6/6] RUN npm run build
#10 DONE 3.1s
```

The install is `CACHED`. In a project with hundreds of dependencies that is minutes saved on every build. And `.env` and `.git` are no longer in the image:

```text
.  ..  .gitignore  dist  node_modules  package-lock.json  package.json  src  tsconfig.json
```

The same rule works in every language: copy `requirements.txt` before the code in Python, `go.mod` and `go.sum` in Go, `pom.xml` in Maven.

When the dependencies do change, a **cache mount** keeps npm's download cache between builds, so only new packages are downloaded: `RUN --mount=type=cache,target=/root/.npm npm ci`. It is used in the next Dockerfile.

#### A multi-stage build

The compiler is needed to build, not to run. A multi-stage build uses one image to build, and starts the final image from a small base, copying only the result:

```dockerfile
# syntax=docker/dockerfile:1

# Stage 1: build. Has the compiler and all the dev dependencies
FROM node:22 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Stage 2: run. Only the compiled code and the production dependencies
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
```

```text
REPOSITORY   TAG       IMAGE ID       CREATED          SIZE
hello        small     1d2c350222d7   1 second ago     172MB
hello        cache     c17267748ed2   26 seconds ago   1.17GB
hello        naive     ff3d62fd2666   48 seconds ago   1.16GB
```

From 1.16 GB to 172 MB. The stage `build` is thrown away; only what `COPY --from=build` takes reaches the final image. `npm prune --omit=dev` removes the dev dependencies after the build, so only the production ones are copied.

Of the 172 MB, `node:22-alpine` itself is 168 MB. Alpine is a small Linux built on musl and BusyBox. It is the usual choice for Node and Python services, and fine for most, but a few native modules behave differently on musl. The `-slim` Debian images are the other common choice.

For a compiled language the gain is bigger: a Go binary needs no runtime at all, and the final stage can be `FROM scratch` or `gcr.io/distroless/static`, a few megabytes.

#### Run as a normal user

`USER node` makes the process run as the user `node` (uid 1000), which the Node images create for this:

```bash
docker run --rm hello:small id
docker run --rm hello:naive sh -c "echo hacked > /usr/local/bin/node && echo wrote to the node binary"
docker run --rm hello:small sh -c "echo hacked > /usr/local/bin/node"
docker run --rm hello:small sh -c "echo x > dist/server.js"
```

```text
uid=1000(node) gid=1000(node) groups=1000(node)
wrote to the node binary
sh: can't create /usr/local/bin/node: Permission denied
sh: can't create dist/server.js: Permission denied
```

As root, someone who breaks into the application can replace any file in the container, install tools, and is one kernel bug or one bad setting away from the host. As `node`, they cannot even change the application's own code, because the files were copied in as root and are only readable. Kubernetes can enforce this with `runAsNonRoot: true`, and many clusters refuse root containers.

Notice also the command: `node dist/server.js`, not `npm start`. With `npm start`, npm is PID 1 and node is its grandchild:

```text
    PID    PPID COMMAND
      1       0 npm start
     18       1 sh -c node dist/server.js
     19      18 node dist/server.js
```

`docker stop` sends SIGTERM to PID 1 only. The npm of this image passes it on, but then reports a failure, so every normal stop looks like a crash (exit code 1, and `npm error signal SIGTERM` in the logs). Older npm versions, and shell scripts as entrypoint, often do not pass it on at all, and the container is killed after the timeout without finishing its requests. Start the process itself, in the JSON form of `CMD` (`["node", "..."]`, not `node ...`, which wraps it in a shell):

```text
naive: stopped in 1.2s, exit code 1
small: stopped in 0.5s, exit code 0
```

#### Scan the image

An image scanner lists the packages in an image and checks them against known vulnerabilities (CVEs). Trivy is the common free one, and runs as a container:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:0.58.1 image -q --scanners vuln hello:naive
```

The totals, for the naive image and the multi-stage one:

```text
hello:naive (debian 12.15)
Total: 4391 (UNKNOWN: 92, LOW: 1543, MEDIUM: 2054, HIGH: 682, CRITICAL: 20)
Node.js (node-pkg)
Total: 31 (UNKNOWN: 0, LOW: 3, MEDIUM: 16, HIGH: 12, CRITICAL: 0)

hello:small (alpine 3.24.4)
Total: 1 (UNKNOWN: 0, LOW: 0, MEDIUM: 1, HIGH: 0, CRITICAL: 0)
Node.js (node-pkg)
Total: 31 (UNKNOWN: 0, LOW: 3, MEDIUM: 16, HIGH: 12, CRITICAL: 0)
```

The small base removed thousands of findings in operating system packages that the service never used. The Node.js findings stayed. `--severity HIGH,CRITICAL` and `--format json` show where they are (shortened):

```text
HIGH body-parser 1.20.3 -> 1.20.9     app/node_modules/body-parser
HIGH path-to-regexp 0.1.12 -> 0.1.13  app/node_modules/path-to-regexp
HIGH brace-expansion 2.0.2 -> 2.1.6   usr/local/lib/node_modules/npm/node_modules/brace-expansion
HIGH pacote 19.0.2 -> 21.5.1          usr/local/lib/node_modules/npm/node_modules/pacote
HIGH sigstore 3.1.0 -> 4.1.1          usr/local/lib/node_modules/npm/node_modules/sigstore
...
```

Two sources, two fixes:

- **`app/node_modules`**: the service's own dependencies. `express` was pinned to an old version, 4.21.2. Updating it to 4.22.3 brings fixed versions of both.
- **`usr/local/lib/node_modules/npm`**: npm, which comes with the base image. The service runs `node`, never `npm`. Remove it in the final stage:

```dockerfile
FROM node:22-alpine
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
```

```text
hello:safe (alpine 3.24.4)
Total: 1 (UNKNOWN: 0, LOW: 0, MEDIUM: 1, HIGH: 0, CRITICAL: 0)
```

No HIGH and no CRITICAL left. Removing npm did not make the image smaller (171 MB): its files are in a layer of the base image, and a later layer can only hide them, not take them out. It did remove the findings, and a tool that someone inside the container could use.

How to use a scanner in practice:

- **In CI, on every build.** Fail the build on `CRITICAL` (and `HIGH`, when the team can keep up) with `--exit-code 1 --severity CRITICAL,HIGH`. `--ignore-unfixed` hides findings that have no fix yet, which you cannot act on.
- **Again on a schedule.** New CVEs are published every day, so an image that was clean last month is not clean today. Registries such as ECR, Artifactory and Harbor scan stored images.
- **Rebuild often.** Most fixes arrive by rebuilding on the current base image. A bot such as Renovate or Dependabot opens a pull request when the base image or a dependency has a new version.
- A finding is a lead, not a verdict. A HIGH in a package the service never loads matters less than a MEDIUM in the web framework. Read where it is, as above.

**Smaller is not always cleaner.** A distroless image (only the runtime, no shell, no package manager) was smaller still, and had more findings, because its Debian packages were older than Alpine's:

```text
REPOSITORY   TAG          SIZE
hello        distroless   150MB

hello:distroless (debian 12.13)
Total: 96 (UNKNOWN: 5, LOW: 31, MEDIUM: 53, HIGH: 6, CRITICAL: 1)
```

Distroless images have a real advantage, no shell for an attacker (`exec: "sh": executable file not found`), and a real cost, no shell for you during an incident either. Whichever base you choose, measure it with the scanner rather than assume.

#### Pin what you build from

`FROM node:22-alpine` is a tag, and it moves: next week it is another image. Builds are then not reproducible, and a broken base image arrives without anyone changing anything. The strongest pin is the digest:

```bash
docker inspect --format "{{index .RepoDigests 0}}" node:22-alpine
```

```text
node@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a
```

```dockerfile
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a
```

A digest never gets security fixes by itself, so it needs Renovate or Dependabot to move it. Without such a bot, a specific tag (`node:22.23-alpine3.24`) is a reasonable middle ground. Never `latest`.

#### Limit the container at run time

The image decides the user. The way it is run can take away more:

```bash
docker run -d --name hello -p 127.0.0.1:8082:8080 \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --memory 128m --cpus 0.5 hello:safe
curl -s 127.0.0.1:8082/
docker exec hello sh -c "touch /tmp/x"
```

```text
hello
touch: /tmp/x: Read-only file system
```

| Option | What it takes away | In Kubernetes |
|---|---|---|
| `--read-only` | Writing anywhere in the container's filesystem. Mount a volume (or `--tmpfs /tmp`) where the app must write | `readOnlyRootFilesystem: true` |
| `--cap-drop ALL` | Linux capabilities such as changing file owners or binding ports below 1024 | `capabilities: drop: [ALL]` |
| `--security-opt no-new-privileges` | Gaining privileges through setuid programs | `allowPrivilegeEscalation: false` |
| `--memory`, `--cpus` | Using more than its share of the machine | `resources.limits` |

#### Checklist

| | Check | Why |
|---|---|---|
| 1 | A `.dockerignore` with `.git`, `.env`, `node_modules` and build output | Secrets and junk stay out, the build context is small |
| 2 | Dependency files copied and installed before the code | The install is cached |
| 3 | `npm ci` (or the language's lock-file install) | The image has exactly the tested dependencies |
| 4 | Multi-stage: build tools only in the build stage | Size, and fewer packages to attack |
| 5 | A small base image, pinned by a specific tag or a digest | Size, findings, reproducible builds |
| 6 | Tools the app does not use removed (package managers, compilers) | Fewer findings, fewer tools for an attacker |
| 7 | `USER` with a non-root user, files owned by root | A break-in cannot change the code or the system |
| 8 | `CMD ["the-process", ...]` in JSON form, and the app handles SIGTERM | Clean stops and rolling updates |
| 9 | No secrets in the image, in `ENV` or in build arguments | Images are copied to many places. Secrets come at run time, from the platform |
| 10 | A scan in CI that can fail the build, and regular rebuilds | Known vulnerabilities are found and fixed |

### The lab's Dockerfile, checked

The [lab](../13-lab/_index.md) builds one image for its shop (API, worker and load generator). It was checked against the list above:

| | Check | The shop | |
|---|---|---|---|
| 1 | `.dockerignore` | `node_modules` and `npm-debug.log`. The build context is `apps/shop`, which has no `.git` or `.env` | ✓ |
| 2 | Dependencies before code | `package.json` and `package-lock.json`, then `src` | ✓ |
| 3 | Lock-file install | `npm ci --omit=dev` | ✓ |
| 4 | Multi-stage | Not needed for the build: plain JavaScript, nothing to compile. Added for check 6 | ✓ now |
| 5 | Small, pinned base | `node:22-alpine`: small, but a moving tag. Kept, so the lab gets fixes on every rebuild. A real service would pin and let a bot update | ~ |
| 6 | Unused tools removed | npm was in the image. Trivy found 10 HIGH, **all** in npm's own packages; the shop's dependencies had none | ✓ now |
| 7 | Non-root | `USER node` | ✓ |
| 8 | Process as PID 1, handles SIGTERM | `CMD ["node", "src/api.js"]`, and `common.js` closes its connections on SIGTERM within Kubernetes' 30 seconds | ✓ |
| 9 | No secrets in the image | The database password comes from a Kubernetes Secret at run time | ✓ |
| 10 | Scan in CI | The lab's workflow runs Trivy, report only (it does not fail the build) | ~ |

The change: install the dependencies in a first stage, and start the final stage without npm. The scan before and after:

```text
shop:check (alpine 3.24.4)          Total: 1 (MEDIUM: 1)
Node.js                             Total: 23 (LOW: 1, MEDIUM: 12, HIGH: 10)

shop:check2 (alpine 3.24.4)         Total: 1 (MEDIUM: 1)
```

The image is 174 MB, runs as `node`, and its modules load.

## Advanced

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **OCI image and runtime specs**: the open standards behind images and containers
- **containerd and runc**: the layers under Docker that actually run containers
- **Image layers and OverlayFS**: how layers are stored and combined, copy-on-write
- **BuildKit and buildx**: parallel builds, cache mounts, secrets at build time, multi-platform images
- **Distroless and scratch images**: images without a shell or a package manager
- **Rootless containers and user namespaces**: running containers without root on the host
- **Seccomp, capabilities and AppArmor profiles**: limiting what a container can ask of the kernel
- **Podman and Buildah**: daemonless alternatives to Docker
- **Container networking**: bridge, host and macvlan networks, port publishing, embedded DNS
- **Storage drivers and volume plugins**: where container data lives
- **Image scanning and SBOMs**: Trivy, Grype, Syft
- **Signing images**: cosign and Sigstore
- **Logging drivers**: json-file, journald, and log rotation
- **Resource limits**: `--memory`, `--cpus`, and the cgroups underneath

## In the lab

- The [lab](../13-lab/_index.md) builds one image and runs it in three roles (API, worker, load generator), each with its own command. Its Dockerfile is [checked above](#the-labs-dockerfile-checked).
- The image tag is a hash of the application's files, so a code change gives a new tag and a new tag rolls the pods: [experiment 11](../13-lab/experiments.md#11-a-bad-release-and-a-rollback).
- The pods run with a memory limit. Above it they are `OOMKilled`, exactly as the `docker run --memory 32m` example above.

## See also

- [Kubernetes](kubernetes.md): running the images on a cluster
- [Linux internals](../01-get-started/linux-internals.md): processes, signals and cgroups underneath
- [Artifacts and registries](../06-delivery/artifacts.md): where images are stored and promoted
- [DevSecOps](../10-security/devsecops.md): scanning and the supply chain
