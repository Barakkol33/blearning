---
title: Languages
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# Languages

**Level: intro**

A DevOps engineer writes code every day: scripts, pipelines, infrastructure definitions, small tools. And reads much more: the applications being deployed. You need to write well in two or three languages and to read the rest.

## Terms

| Term | Meaning |
|---|---|
| Compiled language | Source is turned into a machine-code binary before it runs (Go, Rust, C) |
| Interpreted language | Source is run directly by an interpreter program (Python, Bash) |
| Static typing | Types are checked before the program runs. Many mistakes are caught at build time |
| Dependency | A library the code needs. Listed in a manifest file (`requirements.txt`, `package.json`, `go.mod`) |
| Lock file | The exact version of every dependency, so every build gets the same ones |
| Package manager | The tool that downloads dependencies: `pip`, `npm`, `go`, Maven |
| Linter | A tool that finds mistakes and style problems without running the code |
| Standard library | What comes with the language, with nothing to install |

## Languages you write

| Language | Used for | Know at least |
|---|---|---|
| **Bash** | Glue: short scripts, pipeline steps, one-liners | Pipes, exit codes, `set -euo pipefail`, quoting |
| **Python** | Automation, tooling, cloud SDKs, data work | Functions, files, HTTP, JSON, virtual environments |
| **Go** | Infrastructure tools. Docker, Kubernetes, Terraform and Prometheus are written in it | Reading it, building a small CLI, goroutines |
| **YAML** | Kubernetes, CI pipelines, Ansible, Compose | Indentation, lists and maps, multi-line strings |
| **HCL** | [Terraform](../04-infrastructure-as-code/terraform.md) | Resources, variables, modules |
| **SQL** | Every relational [database](../07-databases/internals.md) | `SELECT` with joins, indexes, `EXPLAIN` |

A simple rule: Bash up to about 50 lines, Python beyond that, Go when it must ship as one fast binary.

## Languages you run

| Language | Typical use | What you notice in operations |
|---|---|---|
| **Java / Kotlin** | Large backend systems, big data tools (Kafka, Elasticsearch) | Slow start, large memory, needs JVM tuning |
| **JavaScript / TypeScript** | Frontends, Node.js backends | One thread per process, huge dependency trees |
| **Python** | Web backends, data and AI | Slower per request, one process per core |
| **Go** | Cloud-native services | Small static binary, fast start, small images |
| **C# (.NET)** | Enterprise backends, common with Azure | Similar to Java, lighter start |
| **Rust / C / C++** | Performance-critical systems, databases | Fast and small, long builds |

More on what this means in practice in [Runtimes and engines](runtimes.md).

## A small example: the same health check, twice

Bash, good for a pipeline step:

```bash
#!/usr/bin/env bash
set -euo pipefail

for url in https://example.com https://example.org; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" || echo 000)
  echo "$url $code"
  [[ "$code" == 200 ]] || exit 1
done
```

Python, better once it needs to grow (retries, JSON output, tests):

```python
import sys
import urllib.request

URLS = ["https://example.com", "https://example.org"]

def check(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            return response.status == 200
    except OSError:
        return False

failed = [url for url in URLS if not check(url)]
for url in failed:
    print(f"DOWN {url}")
sys.exit(1 if failed else 0)
```

Both end with an **exit code**: 0 for success, anything else for failure. That is how a pipeline, a Kubernetes probe or a cron job knows what happened.

## Where it goes next

- Beginner: a real CLI tool in Python and the same one in Go, packaged in a container.
- Advanced: writing a Kubernetes operator, a Terraform provider, performance profiling.
