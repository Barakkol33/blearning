---
title: Linux internals
order: 5
lang: en
tags: [intro, beginner]
updated: 2026-11-15
---

# Linux internals

Almost everything you operate runs on Linux, and a container is only a Linux process with a few restrictions. Knowing what the kernel does for a process explains most of what you see in Docker and Kubernetes. The everyday commands are in [Linux and the command line](linux.md).

**Levels on this page:** [Intro](#intro) · [Beginner](#beginner)

## Intro

### Terms

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

### A small example: a container without Docker

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

## Beginner

### Troubleshooting a server

"The server is slow" or "the disk is full" are the most common calls. The answer is almost always one of four resources: **CPU, memory, disk, network**. For each, ask how much is used, whether work is waiting, and whether there are errors. Go through them in order, with these commands:

| Question | Command | Look at |
|---|---|---|
| How busy is it, and since when? | `uptime` | The load average, against the number of CPUs (`nproc`). 1, 5 and 15 minutes show if it is rising or falling |
| Which process uses the CPU and memory? | `top` (press `M` for memory, `P` for CPU), `ps` | `%CPU` per process: 100 means one core |
| Is memory running out? | `free -m` | `available`, not `free`. Linux fills free memory with cache on purpose |
| Is anything waiting? | `vmstat 1 5` | `r`: processes waiting for CPU. `wa`: CPU waiting for the disk. `si`, `so`: swapping |
| Is the disk full? | `df -h`, then `du -sh /*` | Which filesystem, then which directory |
| Who holds files open? | `lsof` | Deleted files that are still open, and processes with many open files |
| What is listening? | `ss -tlnp` | Ports and the process behind each |
| What happened? | `journalctl -u <service>`, `dmesg` | Service logs, and kernel messages such as the OOM killer |
| What is the process doing right now? | `strace -p <pid>` | The system calls it makes, live |

### A small example: three problems in one box

This example creates three problems on purpose in a container, then finds each one with the commands above. It needs only Docker:

```bash
docker run -d --name box --cap-add SYS_PTRACE \
  --memory 512m --memory-swap 512m --tmpfs /data:size=300m \
  ubuntu:24.04 sleep infinity
docker exec box bash -c 'apt-get update -qq && apt-get install -y -qq procps strace lsof iproute2 python3 curl'

# The problems: a CPU hog, a process that leaks open files,
# and a process that writes a 250 MB log and deletes it while it is still open
docker exec -d box bash -c '
  python3 -c "while True: pass" &
  python3 -c "import time; files = [open(\"/etc/hostname\") for _ in range(900)]; time.sleep(10**6)" &
  python3 -c "
import os, time
f = open(\"/data/app.log\", \"w\")
os.unlink(\"/data/app.log\")
for _ in range(250):
    f.write(\"x\" * 1048576); f.flush(); time.sleep(0.02)
time.sleep(10**6)" &
  python3 -m http.server 8000 &
  sleep infinity'

docker exec -it box bash
```

Inside the box. First, **CPU**:

```bash
uptime
#  20:59:38 up 5 min,  0 user,  load average: 7.51, 8.09, 3.86

ps -eo pid,%cpu,%mem,rss,etime,comm --sort=-%cpu | head -4
#     PID %CPU %MEM   RSS     ELAPSED COMMAND
#    2204 99.7  0.1  9164       00:08 python3        <- one full core
#    2206 10.3  0.1  9248       00:08 python3
#    2207  1.1  0.2 20008       00:08 python3
```

A load average far above the number of CPUs means work is waiting. One process at 100% is the hog. `kill 2204` (put your own PID) sends it `SIGTERM`, and it is gone.

Then **disk**. The filesystem is almost full, but nothing in it is big:

```bash
df -h /data
# Filesystem      Size  Used Avail Use% Mounted on
# tmpfs           300M  250M   50M  84% /data

du -sh /data
# 0       /data
```

`df` and `du` disagree. `df` asks the filesystem how much space is used. `du` adds up the files it can find. The difference is a file that was deleted while a process still has it open: its name is gone, its space is not. This is the classic result of deleting a log file that a service is still writing to. `lsof` finds it:

```bash
lsof -nP +L1          # open files with zero links: deleted, still held
# COMMAND  PID USER   FD   TYPE DEVICE  SIZE/OFF NLINK NODE NAME
# python3 2206 root    3w   REG  0,970 262144000     0    2 /data/app.log (deleted)
```

The space returns when that process closes the file, which means restarting it (or here, `kill 2206`). Then `df -h /data` shows 0%. To empty a log that is still being written to, truncate it in place with `: > /path/app.log` and do not delete it, or let the service reopen its files with `logrotate`.

Then **open files**. Every open file or socket is a file descriptor, and each process has a limit:

```bash
for p in $(pgrep python3); do echo "$p $(ls /proc/$p/fd | wc -l)"; done
# 2204 3
# 2205 903        <- far more than the others: a leak
# 2206 4
# 2207 4

ulimit -n           # the limit per process
```

A process that reaches its limit fails with `Too many open files` on its next file or connection. A count that only grows is a leak in the code. Raising the limit gives you time and does not fix it.

Then **network**, and what one process is doing:

```bash
ss -tlnp
# State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process
# LISTEN 0      5            0.0.0.0:8000      0.0.0.0:*     users:(("python3",pid=2207,fd=3))

strace -c -f -p 2207 &           # count the system calls of the web server
for i in 1 2 3 4 5; do curl -s -o /dev/null localhost:8000/; done
kill %1                          # stop strace: it prints the summary
# % time     seconds  usecs/call     calls    errors syscall
#  60.44    0.029199        2654        11           poll
#  18.12    0.008755          34       255        10 newfstatat
#   6.89    0.003330          97        34         6 futex
```

`strace` shows what a process asks the kernel for. A process that is stuck shows the one call it waits in (a `read` on a socket, a `futex` on a lock), and a process that fails often shows the error: a file it cannot open, a connection that is refused. Use it with care on production: it slows the traced process down.

Finally, **memory**. The box has 512 MB and no swap. Ask for more:

```bash
python3 -c "x = bytearray(800 * 1024 * 1024)"; echo "exit code $?"
# Killed
# exit code 137

grep oom_kill /sys/fs/cgroup/memory.events
# oom_kill 1
```

Exit code 137 is 128 + 9: the process was killed by signal 9, `SIGKILL`, sent by the kernel's OOM killer when the cgroup reached its limit. It is the same as `OOMKilled` in Kubernetes. The process gets no warning and writes nothing to its own log, so look in `dmesg`, in the cgroup's counters, or in `kubectl describe pod`.

```bash
exit
docker rm -f box
```

### A service under systemd

On a server, a long-running program is a systemd **unit**. systemd starts it at boot, restarts it when it fails, and collects its output in the journal. A unit is a small text file. This one runs as your user, so it needs no root (on WSL, systemd must be enabled):

`~/.config/systemd/user/ticker.service`:

```ini
[Unit]
Description=A service that writes a line every 5 seconds

[Service]
ExecStart=/bin/sh -c 'while true; do echo "tick $(date +%%T)"; sleep 5; done'
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload          # read the new unit file
systemctl --user start ticker
systemctl --user status ticker
# ● ticker.service - A service that writes a line every 5 seconds
#      Active: active (running) since ...; 6s ago
#    Main PID: 17172 (sh)

kill -9 17172                           # crash it
sleep 5
systemctl --user show -p MainPID -p NRestarts ticker
# MainPID=17444                         a new process
# NRestarts=1

journalctl --user -u ticker -n 5
# sh[17172]: tick 22:58:45
# systemd[2148]: ticker.service: Main process exited, code=killed, status=9/KILL
# systemd[2148]: ticker.service: Failed with result 'signal'.
# systemd[2148]: ticker.service: Scheduled restart job, restart counter is at 1.
# sh[17444]: tick 22:58:51

systemctl --user stop ticker
```

`Restart=on-failure` is the same idea as a Kubernetes Deployment bringing a pod back: the supervisor knows what should run, and makes it so. A system service is the same file in `/etc/systemd/system/`, used with `sudo systemctl` and without `--user`. `systemctl enable` makes it start at boot.

## In the lab

- The lab's pods are Linux processes in cgroups. `kubectl -n apps top pods` shows the same CPU and memory numbers as `ps`, and the CPU problem found in the [lab's first run](../13-lab/_index.md#status) was found with exactly these tools: `top` in a pod, then measuring each library alone.

## See also

- [Linux and the command line](linux.md)
- [Docker](../02-containers/docker.md)
- [Runtimes and engines](../05-code/runtimes.md): how language runtimes react to cgroup limits
