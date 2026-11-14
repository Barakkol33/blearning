---
title: Runtimes and engines
order: 2
lang: en
tags: [intro]
updated: 2026-11-13
---

# Runtimes and engines

**Level: intro**

A runtime is the engine that executes a program: the JVM for Java, V8 inside Node.js, the Python interpreter. Each one manages memory and CPU in its own way. Those differences decide how you size containers, why a service is slow to start and why it gets killed.

## Terms

| Term | Meaning |
|---|---|
| Runtime | The software that executes a program and gives it memory management, threads and I/O |
| Virtual machine (language) | A runtime that executes bytecode and not machine code: the JVM, the .NET CLR |
| Bytecode | A compact intermediate form of a program, between source and machine code |
| JIT | Just-in-time compilation: the runtime compiles hot code to machine code while the program runs |
| Garbage collector (GC) | The part of the runtime that frees memory the program no longer uses. It can pause the program |
| Heap | The memory area where the program's objects live. The GC manages it |
| Event loop | One thread that handles many connections by never waiting on I/O (Node.js, Python asyncio) |
| GIL | Python's global interpreter lock: only one thread runs Python code at a time |
| Goroutine | Go's very cheap thread. A service can run hundreds of thousands |
| Static binary | One executable with everything inside. It needs nothing installed on the machine |
| Cold start | The time from starting a process until it can serve its first request |

## The main engines

| Engine | Languages | Concurrency | In operations |
|---|---|---|---|
| **JVM** | Java, Kotlin, Scala | Real threads on all cores | Slow start, warms up over minutes. Heap size must be set to fit the container |
| **Node.js (V8)** | JavaScript, TypeScript | One event-loop thread | One process uses one core. CPU-heavy work blocks everyone |
| **CPython** | Python | GIL, so one core per process | Scale with several worker processes |
| **Go runtime** | Go | Goroutines on all cores | Static binary, starts in milliseconds, low memory |
| **.NET CLR** | C#, F# | Real threads on all cores | Like the JVM, with faster start |
| **Native** (no runtime) | Rust, C, C++ | Threads | Smallest and fastest. No GC pauses |

## A small example: memory limits in a container

A container has a memory limit ([a cgroup](../01-foundations/linux-internals.md)). The runtime must know about it, or it grows past the limit and the kernel kills the process (`OOMKilled` in Kubernetes).

```yaml
# Kubernetes container with a 1 GiB limit
resources:
  limits:
    memory: 1Gi
```

How to tell each runtime:

```bash
# JVM: heap = 75% of the container limit. The rest is for threads and native memory.
java -XX:MaxRAMPercentage=75 -jar app.jar

# Node.js: old-generation heap limit, in MiB
node --max-old-space-size=768 server.js

# Go: a soft limit that makes the GC work harder as it gets close
GOMEMLIMIT=900MiB ./app

# Python: no heap setting. Limit the number of worker processes.
gunicorn --workers 2 app:app
```

The same thinking applies to CPU. A Node.js or Python process cannot use more than one core, so a CPU limit of 4 on one such process wastes three. Run more replicas with one core each.

## Where it goes next

- Beginner: watch a JVM and a Go service under load, reading heap and GC metrics.
- Advanced: garbage collectors and their tuning, profiling (flame graphs), thread dumps and heap dumps, GraalVM native images, WebAssembly.

## See also

- [Frameworks](frameworks.md)
- [Kubernetes in production](../06-kubernetes/production.md): requests and limits
