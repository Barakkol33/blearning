---
title: APIs
order: 4
lang: en
tags: [intro, advanced]
updated: 2026-11-13
---

# APIs

Services talk to each other through APIs. When something breaks between two services, you are the one reading the status code, the headers and the timeout. This page covers the styles of API and the vocabulary around them.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

### Terms

| Term | Meaning |
|---|---|
| API | The contract a service offers to other programs: what you may ask and what comes back |
| REST | APIs built on HTTP: resources as URLs, actions as methods (`GET`, `POST`, `PUT`, `DELETE`), usually JSON |
| gRPC | Binary remote procedure calls over HTTP/2, with the contract in a `.proto` file. Common between internal services |
| GraphQL | The client sends a query describing exactly the data it wants, to one endpoint |
| WebSocket | A long-lived two-way connection, for live updates |
| Webhook | A reverse API call: a service calls your URL when something happens |
| OpenAPI | A standard file format that describes a REST API (formerly Swagger) |
| Idempotent | A request that can safely be repeated. `GET`, `PUT` and `DELETE` should be. `POST` usually is not |
| Timeout | How long the caller waits before giving up. Every call needs one |
| Retry and backoff | Trying again after a failure, with growing waits, so a struggling service is not flooded |
| Rate limit | A cap on requests per client per time window. Over the cap: status 429 |
| API key | A secret string that identifies the caller |
| OAuth 2.0 / OIDC | Standards for delegated access and login. The caller presents a token, not a password |
| JWT | A signed token that carries claims (who, what, until when) and can be verified without a database |

How callers prove who they are (cookies, the `Authorization` header, API keys, JWT, OAuth and OIDC) is explained in full in [Authentication](../10-security/authentication.md).

### Status codes worth knowing by heart

| Code | Meaning | Whose problem |
|---|---|---|
| 200, 201, 204 | Success | - |
| 301, 302 | Redirect | - |
| 400 | Bad request | The caller |
| 401 | Not authenticated: no valid identity | The caller |
| 403 | Authenticated, and not allowed | The caller's permissions |
| 404 | Not found | The caller, or a wrong route |
| 429 | Too many requests | The caller, slow down |
| 500 | The server crashed on this request | The service |
| 502 | The proxy got a bad answer from the service behind it | The service or the proxy config |
| 503 | Service unavailable: overloaded or no healthy instance | The service |
| 504 | The proxy timed out waiting for the service | A slow service or a short timeout |

4xx: the request is wrong. 5xx: the server side is wrong. 502, 503 and 504 usually come from a [load balancer or proxy](../08-services/proxies.md), not from the application.

### A small example: reading a call

```bash
curl -i -X POST https://api.example.com/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 7f3c2a" \
  --max-time 5 \
  -d '{"item": "book", "quantity": 1}'
```

```text
HTTP/2 201
content-type: application/json
x-request-id: 9b1d4e
ratelimit-remaining: 98

{"id": "ord_123", "status": "created"}
```

What each part is for:

- `Authorization: Bearer` carries the token. Without it: 401. See [the `Authorization` header](../10-security/authentication.md#the-authorization-header).
- `Idempotency-Key` lets the client retry after a timeout without creating two orders.
- `--max-time 5` is the timeout.
- `x-request-id` appears in the logs of every service the request passed through. It is the first thing to search for when debugging.

## Advanced

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **OpenAPI**: describing an HTTP API, generating clients and docs
- **gRPC and Protocol Buffers**: fast typed calls between services, and their load-balancing quirks
- **GraphQL**: one endpoint, queries chosen by the client, and the cost of that
- **Webhooks**: calls back to you, signatures and retries
- **WebSockets and server-sent events**: long-lived connections and what they do to proxies
- **API versioning**: URL vs header versions, deprecating old versions
- **Authentication**: OAuth 2.0, OpenID Connect, JWT, API keys
- **Rate limiting**: token bucket, 429 and `Retry-After`
- **Idempotency keys**: making retries of POST safe
- **Pagination**: offset vs cursor
- **API gateways**: Kong, Apigee, AWS API Gateway
- **Contract testing**: Pact, schema checks in CI
- **AsyncAPI**: describing event-driven APIs

## See also

- [Networking](../01-get-started/networking.md)
- [Authentication](../10-security/authentication.md): cookies, tokens, JWT, OAuth and OIDC
- [Messaging and queues](../08-services/messaging.md): when not to call directly
