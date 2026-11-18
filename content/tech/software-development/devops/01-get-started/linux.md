---
title: Linux and the command line
updated: 2026-11-15
order: 3
lang: en
tags: [intro, beginner, advanced]
---

# Linux and the command line

Almost every server, container and CI runner is Linux, and you reach it through a terminal. The command line is the DevOps engineer's main tool: it is how you look inside a machine, how you automate, and often the only way in during an incident. This page is the everyday command set. What the kernel does underneath, and how to troubleshoot a sick server, are in [Linux internals](linux-internals.md).

**Levels on this page:** [Intro](#intro) · [Beginner](#beginner) · [Advanced](#advanced)

## Intro

### Terms

| Term | Meaning |
|---|---|
| Distribution | A Linux kernel with a package manager and a set of tools: Ubuntu and Debian (`apt`), RHEL, Rocky and Fedora (`dnf`), Alpine (`apk`, small, common in containers) |
| Shell | The program that reads your commands. Bash is the default almost everywhere, zsh on macOS |
| Terminal | The window the shell runs in. Over the network, SSH gives you a terminal on another machine |
| Standard input, output, error | Every program reads from stdin and writes to stdout, and writes errors to stderr. The basis of pipes and redirects |
| Pipe (`\|`) | Sends the output of one command to the input of the next |
| Exit code | The number a command returns: 0 is success, anything else is failure. Scripts and pipelines decide by it |
| Root and `sudo` | Root is the administrator. `sudo` runs one command as root |
| Permissions | Read, write and execute, for the owner, the group and everyone else |
| Package manager | Installs and updates software from the distribution's repositories |
| Environment variable | A named value a process inherits from its parent: `PATH`, `HOME`, and the configuration of most containers |
| `PATH` | The directories the shell searches for a command |
| Editor | You will edit files on servers: `nano` is the easy one, `vim` is on every machine and worth learning the basics of |

### What is different about it

- **Everything is a file.** Regular files, directories, devices, and even running processes (`/proc`) look like files. That is why `cat`, `grep` and redirects work on so many things.
- **Small tools, composed.** Each command does one thing. You combine them with pipes into an answer, with no program to write.
- **Text is the interface.** Configuration is text, logs are text, command output is text. Text processing is the skill with the highest return.

### A small example: questions to a log file

A web server's access log, one request per line:

```text
10.0.0.5 - - [15/Nov/2026:10:00:01 +0000] "GET /api/orders HTTP/1.1" 200 512
10.0.0.7 - - [15/Nov/2026:10:00:02 +0000] "POST /api/orders HTTP/1.1" 500 87
10.0.0.5 - - [15/Nov/2026:10:00:02 +0000] "GET /api/stats HTTP/1.1" 200 120
10.0.0.9 - - [15/Nov/2026:10:00:03 +0000] "POST /api/orders HTTP/1.1" 500 87
10.0.0.7 - - [15/Nov/2026:10:00:04 +0000] "GET /healthz HTTP/1.1" 200 15
10.0.0.9 - - [15/Nov/2026:10:00:05 +0000] "GET /api/search HTTP/1.1" 502 0
10.0.0.5 - - [15/Nov/2026:10:00:06 +0000] "POST /api/orders HTTP/1.1" 201 140
```

Four questions you ask in an incident, each one line. `awk` splits a line into fields by spaces: the status is field 9, the path field 7, the client field 1.

```bash
grep -c ' 50[0-9] ' access.log                                   # how many server errors?
# 3

awk '$9 >= 500 {print $7}' access.log | sort | uniq -c | sort -rn  # which paths fail?
#       2 /api/orders
#       1 /api/search

awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -3   # who sends the most?
#       3 10.0.0.5
#       2 10.0.0.9
#       2 10.0.0.7

awk '{print $9}' access.log | sort | uniq -c                       # all status codes
#       3 200
#       1 201
#       2 500
#       1 502
```

`sort | uniq -c | sort -rn` is the pattern to remember: count each distinct value, biggest first. On a real log of millions of lines it answers in seconds, on the server itself, with nothing installed.

## Beginner

### Navigation and filesystem

```bash
pwd                        # where am I?
cd /var/log                # go to a directory
cd -                       # go back to previous directory
ls -la                     # list all files with details (permissions, size, owner)
ls -lah                    # same but human-readable sizes (KB, MB, GB)
tree -L 2                  # visual directory tree, 2 levels deep
```

#### File operations

```bash
touch file.txt             # create empty file (or update timestamp)
mkdir -p a/b/c             # create nested directories
cp -r src/ dst/            # copy recursively
mv old.txt new.txt         # move / rename
rm file.txt                # delete file
rm -rf dir/                # delete directory recursively (careful!)
ln -s /path/to/target link # create symbolic link
```

#### Viewing file contents

```bash
cat file.txt               # print entire file
head -n 20 file.txt        # first 20 lines
tail -n 50 file.txt        # last 50 lines
tail -f /var/log/syslog    # follow log in real time (like docker logs -f)
less file.txt              # scrollable viewer (q to quit)
wc -l file.txt             # count lines
```

#### Searching

```bash
grep "error" app.log             # find lines containing "error"
grep -i "error" app.log          # case-insensitive
grep -r "TODO" src/              # recursive search in directory
grep -rn "pattern" .             # recursive + show line numbers
grep -c "error" app.log          # count matching lines
grep -v "debug" app.log          # invert — show lines NOT matching
```

#### Finding files

```bash
find . -name "*.yaml"                  # find files by name
find . -name "*.log" -mtime +7         # files modified more than 7 days ago
find . -type f -size +100M             # files larger than 100MB
find /etc -name "*.conf" 2>/dev/null   # suppress permission errors
which kubectl                          # where is this binary?
```

---

### Permissions and ownership

Every file has an owner (user), a group, and permission bits (read/write/execute) for user, group, and others.

```bash
ls -la
# -rw-r--r-- 1 user devs 4096 Mar 07 10:00 config.yaml
#  ^^^           user  group
#  user/group/others permissions
```

```bash
chmod +x script.sh         # make executable
chmod 755 script.sh        # rwxr-xr-x (common for scripts)
chmod 600 secrets.env      # rw------- (only owner can read/write)
chown user:devs file.txt  # change owner and group
```

**Why this matters for Docker/K8s:** Container images often run as non-root. Permission issues are one of the most common reasons containers fail to start — the process can't read config files or write to mounted volumes.

---

### Pipes, redirects, and composition

This is where Linux becomes powerful. You chain commands together:

```bash
# Pipe: send output of one command to input of another
cat app.log | grep "error" | wc -l          # count error lines
kubectl get pods | grep -v Running           # find non-running pods
docker ps -a | grep Exited                   # find exited containers

# Redirects
echo "hello" > file.txt     # write to file (overwrite)
echo "world" >> file.txt    # append to file
command 2>/dev/null          # suppress stderr
command > out.log 2>&1       # redirect both stdout and stderr to file
command &>/dev/null          # discard all output
```

#### Useful text processing

```bash
sort file.txt               # sort lines alphabetically
sort -n file.txt             # sort numerically
sort file.txt | uniq         # remove consecutive duplicates
sort file.txt | uniq -c      # count occurrences of each line
cut -d: -f1 /etc/passwd     # split by delimiter, take field 1
awk '{print $1, $3}' file   # print columns 1 and 3
sed 's/old/new/g' file.txt  # replace text (prints to stdout)
sed -i 's/old/new/g' file   # replace text in-place
```

**Real-world example** — find the top 10 most frequent error messages in a log:

```bash
grep "ERROR" app.log | awk '{$1=$2=$3=""; print $0}' | sort | uniq -c | sort -rn | head -10
```

---

### Process management

```bash
ps aux                      # list all processes
ps aux | grep nginx         # find a specific process
top                         # live process monitor (q to quit)
htop                        # better version of top (if installed)

kill <pid>                  # send SIGTERM (graceful shutdown)
kill -9 <pid>               # send SIGKILL (force kill, last resort)
killall nginx               # kill all processes by name

# Running processes in the background
./long-task.sh &            # run in background
nohup ./task.sh &           # run in background, survives terminal close
jobs                        # list background jobs
fg %1                       # bring job 1 to foreground
```

#### Signals (important for Docker)

Docker sends `SIGTERM` to containers on `docker stop`, then `SIGKILL` after a timeout. Your app should handle `SIGTERM` for graceful shutdown (close connections, flush data).

```bash
# Trap signals in a bash script:
trap "echo 'shutting down'; exit 0" SIGTERM SIGINT
```

---

### Networking

Networking commands are essential for debugging Docker/K8s connectivity issues.

```bash
# What's listening on which port?
ss -tlnp                              # show listening TCP ports with process names
lsof -i :8080                         # what's using port 8080?

# DNS
nslookup google.com                   # resolve hostname
dig google.com                        # detailed DNS lookup
cat /etc/resolv.conf                  # DNS resolver config

# Connectivity
ping -c 3 google.com                  # basic connectivity check
curl -sS http://localhost:8080        # HTTP request (most used tool in DevOps)
curl -sS -o /dev/null -w "%{http_code}" http://localhost:8080   # just get status code
wget -qO- http://localhost:8080       # alternative to curl
nc -zv host 5432                      # test if a TCP port is open (netcat)

# Network interfaces and routing
ip addr show                          # list network interfaces and IPs
ip route                              # show routing table
```

**K8s debugging example** — from inside a pod, test if another service is reachable:

```bash
kubectl exec -it pod/myapp -- sh -c 'curl -sS http://db:5432 || echo "connection failed"'
kubectl exec -it pod/myapp -- sh -c 'nslookup db.default.svc.cluster.local'
```

---

### Disk and resource usage

```bash
df -h                       # disk usage per filesystem
du -sh /var/log/*           # size of each item in a directory
du -sh .                    # total size of current directory
free -h                     # memory usage
uptime                      # load averages
```

**Docker context:** `docker system df` shows Docker-specific disk usage, but `df -h` tells you if the host disk is full — a common cause of "no space left on device" errors in containers.

---

### Environment variables

Environment variables are how you pass configuration in Docker, K8s, and CI/CD.

```bash
env                         # list all environment variables
echo $HOME                  # print a specific variable
export MY_VAR="hello"       # set a variable (available to child processes)
unset MY_VAR                # remove a variable

# Set for a single command only
LOG_LEVEL=debug ./myapp

# Load from a file
source .env                 # or: . .env
export $(cat .env | xargs)  # export all variables from a file
```

---

### Bash scripting essentials

CI/CD pipelines, Docker entrypoints, and automation scripts are written in bash. Here's what you need:

#### Script template

```bash
#!/usr/bin/env bash
set -euo pipefail    # exit on error, undefined vars, pipe failures

# -e: exit immediately if a command fails
# -u: treat unset variables as errors
# -o pipefail: a pipe fails if any command in it fails
```

`set -euo pipefail` should be at the top of every script. Without it, scripts silently continue after errors — a major source of bugs in CI pipelines.

#### Variables and conditionals

```bash
NAME="world"
echo "hello $NAME"

# Conditionals
if [ -f "config.yaml" ]; then
  echo "config exists"
elif [ -d "/data" ]; then
  echo "data directory exists"
else
  echo "nothing found"
fi

# Common test operators:
# -f file     file exists and is regular
# -d dir      directory exists
# -z "$var"   variable is empty
# -n "$var"   variable is not empty
# "$a" = "$b" string equality
```

#### Loops

```bash
# Loop over a list
for service in api worker scheduler; do
  echo "deploying $service"
  kubectl rollout restart deployment/"$service"
done

# Loop over command output
for pod in $(kubectl get pods -o name); do
  echo "checking $pod"
  kubectl describe "$pod" | tail -5
done

# While loop (e.g., wait for a condition)
while ! curl -sf http://localhost:8080/health; do
  echo "waiting for app..."
  sleep 2
done
echo "app is ready"
```

#### Functions

```bash
deploy() {
  local service="$1"
  local version="$2"
  echo "deploying $service:$version"
  kubectl set image deployment/"$service" "$service=$service:$version"
}

deploy api v1.2.3
deploy worker v1.2.3
```

#### Useful patterns

```bash
# Default value if variable is unset
REPLICAS="${REPLICAS:-3}"

# Exit with error message
die() { echo "ERROR: $*" >&2; exit 1; }
[ -f config.yaml ] || die "config.yaml not found"

# Run command and capture exit code
if kubectl get deployment/web &>/dev/null; then
  echo "deployment exists"
else
  echo "deployment not found"
fi
```

---

### systemd (service management)

On Linux servers, `systemd` manages services (like Docker itself).

```bash
systemctl status docker          # is Docker running?
systemctl start docker           # start it
systemctl stop docker            # stop it
systemctl restart docker         # restart
systemctl enable docker          # start on boot
systemctl disable docker         # don't start on boot
journalctl -u docker --tail=50   # view Docker daemon logs
journalctl -u kubelet -f         # follow kubelet logs (on K8s nodes)
```

---

### SSH (remote access)

```bash
ssh user@host                         # connect to remote machine
ssh -i ~/.ssh/key.pem user@host       # connect with specific key
scp file.txt user@host:/tmp/          # copy file to remote machine
scp user@host:/var/log/app.log .      # copy file from remote machine
ssh user@host 'kubectl get pods'      # run a command remotely
```

#### SSH config (saves typing)

```bash
# ~/.ssh/config
Host myserver
  HostName 10.0.1.5
  User user
  IdentityFile ~/.ssh/mykey.pem

# Now just:
ssh myserver
```

---

### Common DevOps one-liners

```bash
# Watch a command repeatedly (every 2 seconds)
watch -n 2 kubectl get pods

# Run something periodically in bash
while true; do curl -s http://localhost:8080/health; sleep 5; done

# JSON processing with jq
kubectl get pods -o json | jq '.items[].metadata.name'
docker inspect container_name | jq '.[0].NetworkSettings.IPAddress'
curl -s http://api/data | jq '.results[] | {name: .name, status: .status}'

# Base64 encode/decode (used in K8s Secrets)
echo -n "my-password" | base64
echo "bXktcGFzc3dvcmQ=" | base64 -d

# Generate a random password
openssl rand -base64 24

# Check if a port is available before starting a service
ss -tlnp | grep :8080 && echo "port in use" || echo "port free"

# Tar and compress / extract
tar czf backup.tar.gz /data/        # compress
tar xzf backup.tar.gz               # extract
tar xzf backup.tar.gz -C /target/   # extract to specific directory
```

---

### Key files and directories

| Path | Purpose |
|---|---|
| `/etc/` | System configuration files |
| `/var/log/` | Log files |
| `/proc/` | Virtual filesystem for process/kernel info |
| `/proc/<pid>/` | Info about a specific process |
| `/etc/hosts` | Local DNS overrides |
| `/etc/resolv.conf` | DNS resolver config (important in containers) |
| `/etc/environment` | System-wide environment variables |
| `~/.bashrc` | User shell config (aliases, exports) |
| `~/.ssh/` | SSH keys and config |

## Advanced

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **Advanced bash**: `set -euo pipefail`, arrays, parameter expansion, `trap`, here-docs, subshells
- **ShellCheck**: a linter that finds the common bugs in shell scripts
- **awk and sed in depth**: field processing and stream editing for one-line reports
- **jq and yq**: querying and editing JSON and YAML on the command line
- **find, xargs and GNU parallel**: running a command over many files or inputs, in parallel
- **Package management**: apt, dnf, apk; repositories, pinning versions, unattended upgrades
- **Users, sudo and sudoers**: privilege rules, least privilege for operators
- **ACLs, setuid and capabilities**: permissions beyond user/group/other
- **SSH hardening**: keys only, no root login, `AllowUsers`, fail2ban, bastion hosts
- **tmux**: sessions that survive a dropped SSH connection
- **cron and systemd timers**: scheduled jobs, and why timers are easier to monitor
- **Filesystems, LVM and RAID**: ext4 and XFS, resizing volumes, mount options, `/etc/fstab`
- **Logs: journald and rsyslog**: `journalctl` filters, log rotation with logrotate

## In the lab

- The [lab](../13-lab/_index.md) is driven by a Bash script, `examples/devops-lab/lab.sh`. It uses most of this page: `set -euo pipefail`, functions, a `case` over the command, here-documents, and a pipeline that hashes the application's files into an image tag.

## See also

- [Linux internals](linux-internals.md): processes, memory and troubleshooting
- [Networking](networking.md)
- [Cheatsheet](../cheatsheet.md), [Windows cheatsheet](../cheatsheet-windows.md)
