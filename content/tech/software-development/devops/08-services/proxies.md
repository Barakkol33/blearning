---
title: Proxies and load balancers
order: 6
lang: en
tags: [intro]
updated: 2026-11-13
---

# Proxies and load balancers

**Level: intro**

Between the user and the application there is almost always at least one proxy. It spreads traffic over servers, handles TLS, hides failed servers and routes by URL. Ingress controllers, API gateways and service meshes are all proxies with different configuration.

## Terms

| Term | Meaning |
|---|---|
| Reverse proxy | Receives client requests and forwards them to servers behind it |
| Forward proxy | Sits in front of clients and forwards their requests out, e.g. a company's outbound proxy |
| Load balancer | A proxy whose main job is to spread traffic over several servers |
| Upstream / backend | The servers behind the proxy |
| Layer 4 | Balancing TCP connections by address and port, without reading the content. Fast and simple |
| Layer 7 | Balancing HTTP requests. Can route by host, path or header, retry, and rewrite |
| TLS termination | The proxy decrypts HTTPS, so the servers behind it do not handle certificates |
| Health check | The proxy probes each backend and stops sending traffic to failed ones |
| Round robin / least connections | Balancing algorithms: each backend in turn / the least busy backend |
| Sticky session | Requests of one user always go to the same backend |
| API gateway | A layer-7 proxy with authentication, rate limiting and API management |
| Ingress controller | A proxy inside Kubernetes, configured by Ingress or Gateway API objects |
| Sidecar proxy | A proxy next to each service instance. The building block of a service mesh |
| `X-Forwarded-For` | The header in which a proxy passes on the real client address |

## The tools

| Tool | Notes |
|---|---|
| **nginx** | The classic web server and reverse proxy |
| **HAProxy** | A fast, dedicated load balancer for TCP and HTTP |
| **Envoy** | A modern proxy configured through an API. The engine inside Istio and many gateways |
| **Traefik** | Configures itself from Docker and Kubernetes labels |
| **Caddy** | Simple, with automatic HTTPS certificates |
| Cloud | AWS ALB (layer 7) and NLB (layer 4), Azure Application Gateway and Load Balancer, GCP Cloud Load Balancing |
| API gateways | Kong, Apigee, AWS API Gateway |

## A small example: nginx in front of two backends

`docker-compose.yml`:

```yaml
services:
  app1:
    image: hashicorp/http-echo
    command: ["-text=hello from app1"]
  app2:
    image: hashicorp/http-echo
    command: ["-text=hello from app2"]
  proxy:
    image: nginx:1.27
    ports: ["8080:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

`nginx.conf`:

```nginx
upstream app {
    server app1:5678;
    server app2:5678;
}

server {
    listen 80;

    location / {
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

```bash
docker compose up -d
for i in 1 2 3 4; do curl -s localhost:8080; done
# hello from app1
# hello from app2
# hello from app1
# hello from app2

docker compose stop app2
for i in 1 2 3 4; do curl -s localhost:8080; done
# hello from app1  (every time: nginx stopped using the failed backend)
```

## Reading proxy errors

| Status | What the proxy is telling you |
|---|---|
| 502 Bad Gateway | The backend refused the connection or sent a broken answer. Often: the application crashed or listens on another port |
| 503 Service Unavailable | No healthy backend to send to |
| 504 Gateway Timeout | The backend did not answer within the proxy's timeout |

In all three, the proxy is healthy and the problem is behind it.

## Where it goes next

- Beginner: TLS with a real certificate, path-based routing, rate limiting, an Ingress on Kubernetes.
- Advanced: Envoy and its configuration API, connection draining, HTTP/2 and gRPC balancing, global load balancing, service mesh.

## See also

- [Networking](../01-get-started/networking.md), [APIs](../05-code/apis.md)
- [Kubernetes in production](../02-containers/kubernetes-production.md)
