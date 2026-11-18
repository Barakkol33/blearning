---
title: Artifacts and registries
order: 2
lang: en
tags: [intro, advanced]
updated: 2026-11-15
---

# Artifacts and registries

An artifact is what a build produces and a deployment consumes: a container image, a Java `.jar`, an npm package, a Helm chart. An artifact repository stores them with versions and access control. It sits between CI and CD: the pipeline's build stage ends with a push to it, and every deployment starts with a pull from it.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

### Terms

| Term | Meaning |
|---|---|
| Artifact | A built, versioned file that is ready to run or to be used by another build |
| Registry / repository | A server that stores artifacts. "Registry" is the usual word for container images |
| Package manager | The client that downloads dependencies: npm, pip, Maven, NuGet, Go modules, apt |
| Tag | A readable name for an image version: `shop:1.4.2`. A tag can be moved to another image |
| Digest | The hash of an image's content: `shop@sha256:7dc2...`. It can never point to anything else |
| Immutable | Cannot be changed after publishing. What a release version should be |
| Local repository | Holds what your own builds publish |
| Remote (proxy) repository | A cache of a public source such as Docker Hub, npmjs or Maven Central |
| Virtual repository | One address that combines local and remote repositories, so clients configure a single URL |
| Promotion | Moving one artifact through stages (dev, staging, release) without building it again |
| Retention policy | Rules that delete old artifacts: keep the last 10 snapshots, keep releases for 2 years |
| SBOM | Software bill of materials: the list of every component inside an artifact |
| Build info / provenance | The record of what produced an artifact: commit, pipeline run, dependencies |

### Why not just use Docker Hub and npmjs directly

- **Builds keep working** when a public registry is down, slow, or limits how many pulls it allows.
- **Builds are repeatable.** A dependency that was deleted or replaced upstream is still in your cache, unchanged.
- **One place to control and scan.** What enters the company can be checked for known vulnerabilities and licenses, and blocked.
- **Private artifacts** need a home with permissions anyway.
- **Environments without internet access** can only install from an internal repository.

### The tools

| Tool | Notes |
|---|---|
| **JFrog Artifactory** | The universal repository manager: dozens of package types, local, remote and virtual repositories, promotion, replication between sites. Xray adds security scanning |
| **Sonatype Nexus Repository** | The other long-standing universal manager. Strong in the Java world |
| **Harbor** | Open-source registry for container images and Helm charts, with scanning, signing and replication |
| **GitHub Packages, GitLab Registry** | Built into the code platform. Enough for many teams |
| **AWS ECR, Google Artifact Registry, Azure Container Registry** | The clouds' registries, tied to their identity systems |
| Docker Hub, Quay | Public registries, with private plans |
| Cloudsmith | A hosted universal repository |

### A small example: a registry, a tag and a digest

Run a private registry on your machine, and push an image to it:

```bash
docker run -d --name registry -p 5000:5000 registry:2

docker pull alpine:3.20
docker tag alpine:3.20 localhost:5000/tools/alpine:3.20      # the name includes the registry's address
docker push localhost:5000/tools/alpine:3.20
# 3.20: digest: sha256:6c2a9711...  size: 527

curl -s localhost:5000/v2/_catalog                 # {"repositories":["tools/alpine"]}
curl -s localhost:5000/v2/tools/alpine/tags/list   # {"name":"tools/alpine","tags":["3.20"]}
```

Now push a **different** image under the same tag:

```bash
docker pull alpine:3.19
docker tag alpine:3.19 localhost:5000/tools/alpine:3.20
docker push localhost:5000/tools/alpine:3.20
# 3.20: digest: sha256:7dc2e94a...  size: 527      a different digest: the tag moved

docker rmi localhost:5000/tools/alpine:3.20        # forget the local copy, ask the registry

docker run --rm localhost:5000/tools/alpine:3.20 cat /etc/alpine-release
# 3.19.9     the tag says 3.20 and the content is 3.19

docker run --rm localhost:5000/tools/alpine@sha256:6c2a9711... cat /etc/alpine-release    # the full first digest
# 3.20.10    the digest still gives the original
```

The tag `3.20` now gives a different image than a minute ago, and nothing warned anyone. The digest cannot do that. This is why a deployment should name an image by a tag that is never reused (a version, or the commit hash) or by its digest, and why `latest` in production means "whatever was pushed last".

```bash
docker rm -f registry
```

### Rules that hold in every organization

- **Build once, promote the same artifact.** What was tested in staging is byte for byte what runs in production. Building again for production gives a different artifact that nobody tested.
- **Release versions are immutable.** Fixing a bug means a new version, never a new upload under the old one. Turn on tag immutability in the registry.
- **Pin what you depend on:** lock files for packages, digests or exact tags for base images.
- **Go through the proxy.** Developers and pipelines pull from the internal virtual repository, not from the internet.
- **Clean up automatically.** Snapshots and images of merged branches pile up fast, and storage is the main cost of a repository.
- **Know what is inside.** Generate an SBOM at build time, scan it, and keep it next to the artifact, so that on the day a vulnerability is announced you can answer "where do we run this?" in minutes.

## Advanced

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **Repository managers**: JFrog Artifactory, Sonatype Nexus, Harbor
- **Local, remote and virtual repositories**: your packages, proxies of public ones, one URL for both
- **Artifact promotion**: moving the same build from dev to staging to production
- **Immutable tags and digests**: why production deploys by digest
- **Retention and cleanup policies**: keeping storage under control
- **Package formats**: OCI, Helm, npm, PyPI, Maven, Go modules, Debian and RPM
- **OCI artifacts and ORAS**: storing charts, SBOMs and signatures in a container registry
- **Dependency confusion and typosquatting**: attacks through package names
- **Vulnerability scanning of artifacts**: Xray, Trivy, Grype
- **SBOMs**: SPDX and CycloneDX, what is inside every artifact
- **Signing and attestations**: cosign, in-toto, Notary
- **Replication and air-gapped registries**: registries in several regions, or without internet
- **Build info and traceability**: from an artifact back to its commit and pipeline

## In the lab

- The [lab](../13-lab/_index.md) has no registry: kind loads the image straight into the cluster's nodes (`./lab.sh images`). The tag is a hash of the application's files, so it is never reused. In [the cloud version](../13-lab/cloud.md) that step becomes a push to a registry.

## See also

- [CI/CD](ci-cd.md): the pipeline that builds and pushes
- [Docker](../02-containers/docker.md): images, layers and tags
- [Security](../10-security/_index.md): scanning and signing images
- [Hi-tech, DevOps & JFrog 101](../devops-101.md): slides for non-technical people
