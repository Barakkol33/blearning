---
title: Service mesh
order: 7
lang: en
tags: [intro]
updated: 2026-11-15
---

# Service mesh

When dozens of services call each other, every call needs the same things: encryption, a timeout, a retry, a metric, and a rule about who may call whom. A service mesh takes these out of the application code and puts them in the network layer of the platform, so they work the same for every service in every language. It is powerful, and it is one more complex system to run. Many teams do not need one.

**Levels on this page:** [Intro](#intro)

## Intro

### Terms

| Term | Meaning |
|---|---|
| East-west traffic | Calls between services inside the cluster. North-south is traffic from outside, through an ingress |
| Data plane | The proxies that carry the actual requests |
| Control plane | The component that configures all the proxies and hands out certificates |
| Sidecar | A proxy container added to every pod. All of the pod's traffic passes through it |
| Sidecar-less (ambient) | The newer design: one proxy per node, or eBPF in the kernel, with no container added to each pod |
| mTLS | Mutual TLS: both sides present a certificate, so the call is encrypted and each side knows who the other is |
| Service identity | The name in a workload's certificate, usually its Kubernetes service account |
| Authorization policy | A rule such as "only `orders` may call `payments`" |
| Traffic splitting | Sending a share of requests to another version: the basis of a canary release |
| Retry / timeout / circuit breaking | Protection against a slow or failing service, set in the mesh's configuration |
| Golden metrics | Request rate, error rate and latency, measured by the proxies for every pair of services |
| Gateway API | The Kubernetes standard for routing rules, which meshes now share with ingress controllers |

### The tools

| Tool | Notes |
|---|---|
| **Istio** | The most features and the widest use. Built on the Envoy proxy. Has a sidecar mode and an ambient mode |
| **Linkerd** | Small and simple, with its own light proxy written in Rust. mTLS and metrics work with no configuration |
| **Cilium** | A network plugin based on eBPF, with mesh features built in |
| Consul | From HashiCorp. Also connects services outside Kubernetes, on virtual machines |
| AWS VPC Lattice, GCP Cloud Service Mesh | Managed by the cloud |

### What a mesh gives you

| Need | Without a mesh | With a mesh |
|---|---|---|
| Encryption between services | TLS code and certificates in every service | mTLS everywhere, certificates rotated automatically |
| Who may call whom | Network policies by IP and port | Policies by service identity, down to the HTTP path |
| Retries and timeouts | A library in each language, configured in each service | One configuration for all |
| Metrics per call | Instrument every service | Measured by the proxies, the same for all |
| Canary releases | Limited to the share of pods | An exact percentage, or by a header |

### A small example: 10% of traffic to a new version

The mesh's configuration is Kubernetes objects. This rule, in the standard Gateway API form, sends one request in ten that is addressed to the `orders` Service to version 2:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: orders-canary
  namespace: shop
spec:
  parentRefs:
    - group: ""
      kind: Service
      name: orders          # applies to calls made to this Service
      port: 80
  rules:
    - backendRefs:
        - name: orders-v1
          port: 80
          weight: 90
        - name: orders-v2
          port: 80
          weight: 10
```

Nothing changes in the services that call `orders`. They keep calling the same name, and the proxies split the traffic. Moving to 50% and then to 100% is an edit of two numbers, and tools such as Argo Rollouts and Flagger make those edits automatically while they watch the error rate (see [Deployment strategies](../06-delivery/deployment-strategies.md)).

This example shows the shape of the configuration. It was not run as part of this guide: the lab has no mesh.

### What it costs

- **Another system that can break.** The control plane and every proxy are now in the path of every request. Mesh upgrades need care.
- **Resources and latency.** Each sidecar takes memory and CPU, and adds a little under a millisecond to a few milliseconds per hop. With hundreds of pods it adds up. The sidecar-less designs reduce this.
- **Harder debugging.** A failed request may have failed in the application, in either proxy, or in a policy. You need to learn the mesh's own tools.

### Do you need one?

Start from the need, not the tool:

- For **encryption and identity** between services because a regulation or a security model asks for it: a mesh is the simplest way to get it everywhere. Linkerd, or Istio in ambient mode, are the lighter choices.
- For **canary releases**: an ingress controller or Argo Rollouts may be enough.
- For **metrics**: instrumenting the services gives you more than the proxies can see.
- With **a handful of services**: a mesh is rarely worth its weight.

## See also

- [Proxies and load balancers](proxies.md): the building block
- [Kubernetes in production](../02-containers/kubernetes-production.md): network policies and ingress
- [Deployment strategies](../06-delivery/deployment-strategies.md): canary releases
- [Security](../10-security/_index.md)
