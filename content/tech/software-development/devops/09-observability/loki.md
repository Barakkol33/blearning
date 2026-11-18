---
title: "Loki & LogQL"
order: 4
lang: en
tags: [beginner, advanced]
---

# Loki & LogQL

LogQL is the query language for **Grafana Loki** logs.

**Levels on this page:** [Beginner](#beginner) · [Advanced](#advanced)

## Beginner

### Useful UI features (Grafana Explore)
- **Logs view** shows matching log lines for your query.
- **Sort** logs by newest/oldest.
- **Expand / Collapse** log lines to see full details.
- Tip: select text inside a log line and use **Filter** / **Exclude** to quickly refine the query.

---

### Core idea: select streams, then filter/process lines
Most LogQL queries look like:

1) Pick log streams by **labels**
2) Apply **pipeline stages** (filter, parse, format)

#### 1. Stream selector (labels)
```logql
{container="myapp"}
```

---

### Common filters
#### Substring match / exclude
```logql
{container="myapp"} |= "error"
```

```logql
{container="myapp"} != "healthcheck"
```

#### Regex match / exclude
```logql
{container="myapp"} |~ "timeout|reset"
```

```logql
{container="myapp"} !~ "(/health|/metrics)"
```

---

### Parse JSON and filter by fields
If your log lines are JSON, you can parse them and then filter on keys:

```logql
{container="myapp"} | json | level="error"
```

---

### Format the output line
After parsing JSON, you can format the displayed log line:

```logql
{container="myapp"} | json | line_format "{{.downstream_local_address}} {{.response_code}} {{.method}} {{.path}}"
```

---

### Full example (search + parse + format)
```logql
{container="myapp"} |= "error" | json | line_format "{{.downstream_local_address}} {{.response_code}} {{.method}} {{.path}}"
```

## Advanced

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **Loki architecture**: distributor, ingester, querier, compactor; object storage for chunks
- **Labels vs log content**: few labels, and filtering the rest at query time
- **Structured metadata**: high-cardinality fields without labels
- **LogQL metric queries**: `rate`, `count_over_time`, `unwrap`
- **Log alerting**: Loki ruler rules
- **Retention and deletion**: per-tenant retention, the compactor
- **Collectors**: Grafana Alloy, Promtail (deprecated), Fluent Bit, Vector
- **Multi-tenancy**: the `X-Scope-OrgID` header
- **Scaling**: monolithic, simple scalable and microservices modes
- **Other log stacks**: ELK and EFK, OpenSearch, ClickHouse for logs, Splunk
- **Log levels and sampling**: keeping costs down at high volume
