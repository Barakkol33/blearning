---
title: Messaging and queues
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# Messaging and queues

**Level: intro**

When service A calls service B directly, A waits for B and fails when B is down. A message system sits between them: A hands over a message and moves on, and B takes it when it can. This decouples services, absorbs bursts of load and lets work be retried. [Kafka](kafka.md) is the best known, and it is one of several kinds.

## Terms

| Term | Meaning |
|---|---|
| Producer / consumer | The side that sends messages / the side that receives them |
| Broker | The server that holds the messages in between |
| Queue | Each message goes to one consumer, and is removed once handled. For distributing work |
| Pub/sub (topic) | Each message goes to every subscriber. For announcing events |
| Log (stream) | Messages are appended and kept. Consumers read at their own position and can re-read. Kafka's model |
| Acknowledgement (ack) | The consumer's confirmation that a message was handled. Without it the message is delivered again |
| At-least-once | A message is never lost and may arrive twice. The common guarantee |
| At-most-once | A message is never duplicated and may be lost |
| Idempotent consumer | A consumer for which handling the same message twice is harmless. Required with at-least-once |
| Dead-letter queue (DLQ) | Where messages go after failing several times, so they do not block the rest |
| Consumer lag | How many messages wait unhandled. The main health metric |
| Backpressure | Slowing producers when consumers cannot keep up |
| Ordering | Whether messages are handled in the order they were sent. Usually guaranteed only per partition or per key |

## The tools

| Tool | Model | Use it for |
|---|---|---|
| **Kafka** | Log | High-volume event streams, data pipelines, replay |
| **Redpanda** | Log, Kafka-compatible | Same API, simpler to run |
| **RabbitMQ** | Queues with flexible routing | Task queues, classic messaging between services |
| **NATS** | Lightweight pub/sub, with optional persistence (JetStream) | Fast, simple messaging between services |
| **Apache Pulsar** | Log and queue | Multi-tenant, geo-replicated setups |
| **Redis Streams** | Simple log | Small needs when Redis is already there |
| **AWS SQS / SNS** | Managed queue / pub/sub | The default on AWS |
| **Google Pub/Sub** | Managed pub/sub | The default on GCP |
| **Azure Service Bus / Event Hubs** | Managed queue / log | The default on Azure |

Queue or log? If messages are **tasks** to do once (send this email), a queue. If they are **events** that several systems read and may replay (an order was placed), a log.

## A small example: a work queue with RabbitMQ

```bash
docker run -d --name rabbit -p 5672:5672 -p 15672:15672 rabbitmq:4-management
pip install pika
```

`send.py`:

```python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
channel = connection.channel()
channel.queue_declare(queue="emails", durable=True)

for n in range(5):
    channel.basic_publish(exchange="", routing_key="emails", body=f"email {n}")
print("sent 5")
connection.close()
```

`worker.py`:

```python
import time
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
channel = connection.channel()
channel.queue_declare(queue="emails", durable=True)
channel.basic_qos(prefetch_count=1)          # one message at a time per worker

def handle(ch, method, properties, body):
    print("sending", body.decode())
    time.sleep(1)                             # the slow work
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_consume(queue="emails", on_message_callback=handle)
channel.start_consuming()
```

Run `send.py` with no worker: the messages wait in the queue (see them at `http://localhost:15672`, user and password `guest`). Start two workers: they share the work. Kill a worker in the middle of a message: it was never acknowledged, so the broker gives it to the other worker.

## Where it goes next

- Beginner: exchanges and routing in RabbitMQ, a dead-letter queue, the same flow on SQS.
- Advanced: Kafka in depth (replication, KRaft, tuning), exactly-once semantics, the outbox pattern, schema registries, running brokers in production.

## See also

- [Kafka](kafka.md)
- [APIs](../05-code/apis.md): the synchronous alternative
