---
title: Security
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# Security

**Level: intro**

The DevOps engineer holds the keys: cloud accounts, pipelines, clusters, secrets. An attacker who gets into the pipeline gets into production. Security here is not a separate team's checklist at the end. It is built into the daily tools, which is what "DevSecOps" and "shift left" mean.

## Terms

| Term | Meaning |
|---|---|
| Authentication | Proving who you are |
| Authorization | Deciding what you may do |
| Least privilege | Every person and service gets only the permissions it needs, and no more |
| Secret | Any value that gives access: a password, an API key, a token, a private key |
| Secret manager | A service that stores secrets encrypted, controls who reads them and logs every read |
| Rotation | Replacing a secret regularly, so a leaked one stops working |
| Short-lived credentials | Tokens that expire in minutes or hours, issued on demand in place of permanent keys |
| OIDC federation | A pipeline or workload proves its identity to a cloud with a signed token, with no stored key |
| MFA | Multi-factor authentication: a second proof besides the password |
| Encryption in transit / at rest | Protecting data on the network (TLS) / on disk |
| mTLS | Mutual TLS: both sides present certificates. Common between services |
| Zero trust | No request is trusted because of where it comes from. Each is authenticated and authorized |
| CVE | A publicly catalogued vulnerability, with an ID such as CVE-2021-44228 |
| Supply chain | Everything that goes into your software: dependencies, base images, build tools, the pipeline |
| SBOM | Software bill of materials: the list of every component inside an artifact |
| SAST / DAST | Scanning source code for flaws / testing the running application from outside |
| Image scanning | Checking the packages in a container image against known CVEs |
| Image signing | A cryptographic proof of who built an image, verified before it runs |
| Policy as code | Security rules written as code and enforced automatically |

## The areas and their tools

| Area | Tools |
|---|---|
| Secrets | HashiCorp Vault, OpenBao, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, External Secrets Operator, SOPS |
| Secret leaks in Git | gitleaks, TruffleHog, GitHub secret scanning |
| Dependencies and images | Trivy, Grype, Snyk, Dependabot, Renovate |
| Code | Semgrep, CodeQL, SonarQube |
| Infrastructure code | Checkov, Trivy |
| Signing and provenance | Sigstore cosign, SLSA |
| Cluster policy | Kyverno, OPA Gatekeeper |
| Runtime detection | Falco |

## A small example: scan an image

```bash
docker run --rm aquasec/trivy image nginx:1.21
```

```text
nginx:1.21 (debian 11)
Total: 400+ (UNKNOWN: ..., LOW: ..., MEDIUM: ..., HIGH: ..., CRITICAL: ...)

┌──────────┬────────────────┬──────────┬───────────────────┬───────────────┐
│ Library  │ Vulnerability  │ Severity │ Installed Version │ Fixed Version │
├──────────┼────────────────┼──────────┼───────────────────┼───────────────┤
│ openssl  │ CVE-...        │ CRITICAL │ ...               │ ...           │
```

An old image carries hundreds of known vulnerabilities, almost all from the base operating system packages. Compare with a current tag, and with a minimal base:

```bash
docker run --rm aquasec/trivy image --severity HIGH,CRITICAL nginx:stable
docker run --rm aquasec/trivy image --severity HIGH,CRITICAL nginx:stable-alpine
```

The lessons: **rebuild images regularly** on updated bases, and **use small base images**, because a package that is not there cannot be vulnerable. In a pipeline, the same command with `--exit-code 1` fails the build on serious findings.

## The habits that matter most

1. **No secrets in Git, in images or in pipeline logs.** A secret that was pushed is leaked, even if deleted later. Rotate it.
2. **No long-lived cloud keys.** People use single sign-on with MFA, workloads use roles, pipelines use OIDC federation.
3. **Least privilege everywhere**: IAM policies, Kubernetes RBAC, database roles, pipeline tokens.
4. **Patch continuously.** Automated dependency updates and image rebuilds.
5. **Everything is logged**: who did what, in the cloud (audit logs) and in the cluster.
6. **Private by default**: networks, buckets, databases. Open only what must be open.

## Where it goes next

- Beginner: a Vault dev server and an application that reads a secret from it, Trivy and gitleaks in a pipeline, OIDC from GitHub Actions to a cloud.
- Advanced: threat modeling, supply-chain hardening (SLSA, signing, admission policies), network segmentation and mTLS, incident response, compliance frameworks (SOC 2, ISO 27001).

## See also

- [Cloud concepts](../03-cloud/concepts.md): IAM and shared responsibility
- [CI/CD](../06-delivery/ci-cd.md), [Kubernetes in production](../02-containers/kubernetes-production.md)
