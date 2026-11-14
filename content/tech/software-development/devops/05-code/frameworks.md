---
title: Frameworks
order: 3
lang: en
tags: [intro]
updated: 2026-11-13
---

# Frameworks

**Level: intro**

Almost no service is written from zero. A framework supplies the common parts: receiving HTTP requests, routing, talking to the database, configuration. Recognizing the framework tells you how to build the service, configure it, check its health and read its logs.

## Terms

| Term | Meaning |
|---|---|
| Framework | A skeleton for an application. You fill in the business logic |
| Library | Code you call. A framework is the opposite: it calls your code |
| Route / endpoint | A URL path and method that the application answers |
| Middleware | Code that runs on every request before the handler: logging, authentication |
| ORM | Object-relational mapper: database rows as objects in code (Hibernate, SQLAlchemy, Prisma) |
| Migration | A versioned change to the database schema, shipped with the code |
| Health endpoint | A URL that says whether the service is alive and ready, for load balancers and Kubernetes |
| Graceful shutdown | On `SIGTERM`: stop taking new requests, finish the open ones, then exit |
| Twelve-factor app | A known set of rules for services that are easy to operate: config from the environment, logs to stdout, stateless processes |

## The common ones

| Framework | Language | Notes |
|---|---|---|
| **Spring Boot** | Java / Kotlin | The enterprise standard. Health and metrics built in (Actuator) |
| **FastAPI** | Python | Modern APIs, async, generates OpenAPI docs |
| **Django** | Python | Full web framework with ORM, admin and migrations |
| **Flask** | Python | Minimal. Common in small services |
| **Express / NestJS** | Node.js | Minimal / structured |
| **Next.js** | Node.js + React | Frontend and backend in one. Server-side rendering |
| **Gin / net/http** | Go | Thin layers. Go's standard library does most of the work |
| **ASP.NET Core** | C# | The Microsoft stack |
| **Ruby on Rails** | Ruby | Classic full web framework |
| **React, Vue, Angular** | JavaScript | Frontend only. The build output is static files behind a web server or CDN |

## A small example: a service that is easy to operate

```python
# app.py
import os
from fastapi import FastAPI

GREETING = os.environ.get("GREETING", "Hello")   # config from the environment

app = FastAPI()

@app.get("/healthz")                              # for probes and load balancers
def healthz():
    return {"status": "ok"}

@app.get("/hello/{name}")
def hello(name: str):
    return {"message": f"{GREETING}, {name}!"}
```

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn
COPY app.py .
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t hello-api .
docker run -p 8000:8000 -e GREETING=Shalom hello-api

curl localhost:8000/healthz          # {"status":"ok"}
curl localhost:8000/hello/dana       # {"message":"Shalom, dana!"}
```

## What to ask of every service you deploy

1. **Configuration** comes from environment variables or mounted files, never baked into the image.
2. **Logs** go to stdout, one event per line, preferably JSON.
3. **Health endpoints** exist: one for "alive", one for "ready for traffic".
4. **Metrics** are exposed, usually at `/metrics`.
5. **Shutdown** is graceful on `SIGTERM`.
6. **State** is in a database or object storage, never on the local disk.

A service that does these six runs well on any platform.

## Where it goes next

- Beginner: add metrics, structured logs and graceful shutdown to the example, and deploy it to Kubernetes.
- Advanced: connection pools, async versus threads under load, framework-specific tuning (Spring Boot, Django).

## See also

- [APIs](apis.md), [Runtimes and engines](runtimes.md)
- [Observability](../09-observability/observability.md)
