---
title: Linux internals
order: 5
lang: en
tags: [intro]
updated: 2026-11-13
---

# Linux internals

**Level: intro**

Almost everything you operate runs on Linux, and a container is only a Linux process with a few restrictions. Knowing what the kernel does for a process explains most of what you see in Docker and Kubernetes. The commands themselves are in the [Linux practical guide](linux.md).

## Terms

| Term | Meaning |
|---|---|
| Kernel | The core of the operating system. It manages memory, CPU time, disks and the network for all programs |
| Process | A running program. It has an ID (PID), memory of its own, and a parent process |
| Thread | A unit of execution inside a process. Threads of one process share its memory |
| System call | A request from a program to the kernel: open a file, send on a socket, start a process |
| Signal | A message to a process. `SIGTERM` asks it to stop, `SIGKILL` stops it without asking |
| File descriptor | A number a process holds for each open file or socket. There is a limit per process (`ulimit -n`) |
| systemd | The first process on most distributions (PID 1). It starts and supervises services, defined as units |
| Namespace | A kernel feature that gives a process its own view of something: its own PIDs, network, mounts, hostname |
| cgroup | A kernel feature that limits and measures what a group of processes uses: CPU, memory, I/O |
| OOM killer | When memory runs out, the kernel kills a process to free some. In a container: when it passes its memory limit |
| Load average | The average number of processes running or waiting for CPU or disk, over 1, 5 and 15 minutes |

**A container = a process + namespaces (what it sees) + cgroups (what it may use) + an image (its files).**

## A small example: a container without Docker

`unshare` starts a process in new namespaces. Here, a shell with its own PID namespace:

```bash
sudo unshare --pid --fork --mount-proc bash

# Inside the new shell:
ps aux
# Only two processes: bash (PID 1) and ps. The host's processes are invisible.

exit
```

And the limits side. Every process belongs to a cgroup, and the limit is a plain file:

```bash
cat /proc/self/cgroup                          # which cgroup am I in?

docker run -d --name limited --memory 100m nginx
docker exec limited cat /sys/fs/cgroup/memory.max
# 104857600  -> 100 MiB, enforced by the kernel
docker rm -f limited
```

`--memory 100m` in Docker and `resources.limits.memory` in Kubernetes both end up as that one number.

## Where it goes next

- Beginner: systemd units and `journalctl`, reading `top`, `vmstat` and `iostat`, tracing a process with `strace`.
- Advanced: the scheduler, memory management and the page cache, the I/O stack, eBPF, kernel tuning.

## See also

- [Docker](../02-containers/docker.md)
- [Runtimes and engines](../05-code/runtimes.md): how language runtimes react to cgroup limits
