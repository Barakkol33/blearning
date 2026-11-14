---
title: Observability
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# Observability

**Level: intro**

Monitoring answers "is it working?". Observability answers "why not?", including for problems nobody predicted. It rests on three kinds of data that the system emits (metrics, logs and traces) and on the discipline of alerting only on what matters.

## Terms

| Term | Meaning |
|---|---|
| Metric | A number measured over time: requests per second, memory in use |
| Log | A timestamped record of one event |
| Trace | The path of one request through all the services it touched |
| Span | One step in a trace: one service's work, with a start and a duration |
| Label (tag) | A key-value pair on a metric: `status="500"`, `service="cart"` |
| Cardinality | The number of distinct label combinations. Too high (a label per user ID) overloads the metrics system |
| Counter / gauge / histogram | Metric types: only goes up / goes up and down / a distribution of values, for percentiles |
| Percentile (p99) | The value that 99% of requests are faster than. Averages hide the slow tail |
| Instrumentation | The code that emits the data |
| OpenTelemetry (OTel) | The open standard and libraries for emitting metrics, logs and traces, independent of the vendor |
| Collector | An agent that receives telemetry, processes it and forwards it to storage |
| Dashboard | A screen of graphs |
| Alert | A rule that notifies a person when a condition holds |
| SLI / SLO | A measured indicator of service quality / the target for it. See [SRE](../11-reliability/sre.md) |

## Which signal answers what

| Signal | Answers | Cost |
|---|---|---|
| Metrics | Is something wrong? How much, since when? | Low |
| Traces | Where in the chain is the time or the error? | Medium (usually sampled) |
| Logs | What exactly happened in this one place? | High |

An investigation flows in this order: an alert on a metric, a trace to find the service, logs to find the cause.

## What to measure

- **For every service (RED):** Rate of requests, Errors, Duration.
- **For every resource (USE):** Utilization, Saturation, Errors, for CPU, memory, disk and network.
- **The four golden signals** (Google SRE): latency, traffic, errors, saturation. The same idea in other words.

## The tools

| Role | Open source | Commercial |
|---|---|---|
| Metrics | Prometheus, VictoriaMetrics, Mimir | Datadog, New Relic, Dynatrace, Grafana Cloud, and each cloud's own monitoring |
| Logs | Loki, Elasticsearch / OpenSearch | Splunk, Datadog |
| Traces | Jaeger, Tempo | Datadog, Honeycomb |
| Dashboards | Grafana | |
| Collection | OpenTelemetry Collector, Fluent Bit, Vector | |
| Alert routing and on-call | Alertmanager | PagerDuty, Opsgenie |

## A small example: an alert on the error rate

Given a counter `http_requests_total` with a `status` label, the share of failed requests over the last five minutes, in PromQL:

```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

As a Prometheus alert rule:

```yaml
groups:
  - name: web
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m])) > 0.05
        for: 10m
        labels:
          severity: page
        annotations:
          summary: "More than 5% of requests are failing"
          runbook: "https://wiki.example.com/runbooks/high-error-rate"
```

Three things make it a good alert:

- It measures what **users** feel (failed requests), not a cause (high CPU).
- `for: 10m` ignores short blips.
- It links to a runbook that says what to do.

## Rules for alerts

- An alert that wakes someone must need a human action now. Everything else is a ticket or a dashboard.
- Alert on symptoms. Use causes for diagnosis.
- Every false alert teaches people to ignore alerts. Fix or delete noisy ones.

## Where it goes next

- Beginner: instrument an application with OpenTelemetry, see its traces in Jaeger or Tempo, build a RED dashboard.
- Advanced: SLO-based alerting with burn rates, cardinality and cost control, sampling strategies, running Prometheus at scale, eBPF-based observability.

## See also

- The hands-on pages of this chapter: [Metrics](metrics.md), [Monitoring](monitoring.md), [Loki](loki.md)
- [Search](../08-services/search.md): the log stack
