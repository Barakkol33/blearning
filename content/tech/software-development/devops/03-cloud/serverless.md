---
title: Serverless
order: 5
lang: en
tags: [intro, advanced]
updated: 2026-11-15
---

# Serverless

Serverless means you hand the provider a function or a container, and the provider decides where and when to run it. There are servers, but you never see, patch or size them. You pay for what runs, and when nothing runs you pay nothing. It trades control for less operations work, and it changes what a DevOps engineer does: fewer machines to keep alive, more permissions, events and limits to get right.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

### Terms

| Term | Meaning |
|---|---|
| Function as a service (FaaS) | You deploy one function. The platform calls it once per event |
| Serverless container | You deploy a container image that answers HTTP. The platform scales it, down to zero |
| Event / trigger | What makes a function run: an HTTP request, a message on a queue, a new file in a bucket, a schedule |
| Handler | The function the platform calls, with the event as its argument |
| Invocation | One run of the function |
| Cold start | The first invocation after a pause: the platform must start an instance and load the code before it can answer |
| Warm instance | An instance kept alive after an invocation, so the next one is fast |
| Concurrency | How many instances run at the same moment. There is a limit per function and per account |
| Timeout | The longest a single invocation may run (15 minutes on AWS Lambda) |
| Scale to zero | No instances and no cost while there is no traffic |
| Stateless | An instance may disappear at any moment. Anything that must be kept goes to a database, a queue or object storage |
| Edge function | A function that runs in the CDN's locations, close to the user |

### The services

| | AWS | Azure | GCP | Others |
|---|---|---|---|---|
| Functions | Lambda | Functions | Cloud Run functions | Cloudflare Workers, Vercel and Netlify functions |
| Serverless containers | ECS on Fargate, App Runner | Container Apps | Cloud Run | Knative on your own Kubernetes |
| Around them | API Gateway, SQS, EventBridge, Step Functions | API Management, Service Bus, Event Grid, Logic Apps | API Gateway, Pub/Sub, Eventarc, Workflows | |

A function alone does little. A serverless system is functions wired to managed services: a queue in front, a database behind, an API gateway at the door.

### When it fits

| Fits | Does not fit |
|---|---|
| Traffic that comes in bursts, or is often zero | Steady high traffic, where an always-on service is cheaper |
| Glue: react to a file, a message, a schedule | Long jobs, beyond the timeout |
| A small team that should not run servers | Latency that must always be low: cold starts hurt |
| New products, where the load is unknown | Work that needs a GPU, local disks or special networking |

### A small example: a function, run locally

AWS publishes the image that Lambda itself runs, with an emulator of the service inside. That lets you run a real Lambda function with only Docker.

`app.py`:

```python
import json

def handler(event, context):
    name = event.get("name", "world")
    return {"statusCode": 200, "body": json.dumps({"message": f"hello, {name}"})}
```

```bash
docker run -d --name fn -p 9000:8080 -v "$PWD":/var/task:ro \
  public.ecr.aws/lambda/python:3.12 app.handler

curl -s -X POST localhost:9000/2015-03-31/functions/function/invocations -d '{"name": "Dana"}'
# {"statusCode": 200, "body": "{\"message\": \"hello, Dana\"}"}

curl -s -X POST localhost:9000/2015-03-31/functions/function/invocations -d '{}'

docker logs fn 2>&1 | grep REPORT
# REPORT RequestId: 8670...  Duration: 168.25 ms  Billed Duration: 169 ms  ...
# REPORT RequestId: bc3b...  Duration: 2.18 ms    Billed Duration: 3 ms    ...

docker rm -f fn
```

The two `REPORT` lines are the same lines Lambda writes to its log in the cloud, and they show the two things to know:

- **The first call took 168 ms and the second 2 ms.** The first one loaded the code: a small cold start. With a large framework or a JVM it is seconds.
- **You are billed for the duration**, per millisecond, multiplied by the memory you configured.

In a real account the same file is deployed with a tool (AWS SAM, the Serverless Framework, Terraform or Pulumi), together with its trigger and its IAM role.

### What to remember when operating one

- **Permissions are the main work.** Every function has a role. Give each function only what it needs: an over-broad role is the usual security finding.
- **Watch concurrency, not servers.** A burst of events starts a burst of instances, and each one opens a database connection. A function can take down a database that a fixed fleet never would. Put a queue or a connection proxy in between.
- **Set a concurrency limit and a budget alert.** A loop of functions that trigger each other scales without limit, and so does the bill.
- **Make handlers idempotent.** Most triggers deliver "at least once", so the same event can arrive twice.
- **Logs, metrics and traces come from the platform.** With many small functions, tracing a request across them matters more than in one service (see [Observability](../09-observability/concepts.md)).
- **Keep the deployment in code.** A system of 40 functions and their triggers that was clicked together in a console cannot be reviewed or rebuilt.

## Advanced

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **Cold starts**: what makes them slow, provisioned concurrency, SnapStart
- **Concurrency limits and throttling**: account and function limits, reserved concurrency
- **Event sources**: queues, streams, object events, schedules, API gateways
- **Retries, dead-letter queues and idempotency**: what happens when an invocation fails
- **Step Functions and workflows**: orchestrating several functions, Durable Functions on Azure
- **Event-driven architecture**: EventBridge, Event Grid, Eventarc
- **API Gateway**: routes, authorizers, throttling, usage plans
- **Function URLs and Lambda layers**: simple endpoints and shared code
- **Serverless containers**: Cloud Run, Fargate, Azure Container Apps
- **Knative and OpenFaaS**: serverless on your own Kubernetes
- **Edge functions**: Cloudflare Workers, Lambda@Edge
- **Frameworks**: AWS SAM, Serverless Framework, SST
- **Observability for functions**: structured logs, X-Ray and OpenTelemetry, per-invocation cost
- **Cost model**: pay per request and duration, and when a server becomes cheaper

## See also

- [Cloud concepts](concepts.md): where serverless sits among the ways to run code
- [AWS](aws.md), [Azure](azure.md), [GCP](gcp.md)
- [Messaging and queues](../08-services/messaging.md): the usual trigger
- [Cost (FinOps)](../11-reliability/finops.md)
