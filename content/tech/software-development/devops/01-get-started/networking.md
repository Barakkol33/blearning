---
title: Networking
order: 4
lang: en
tags: [intro, beginner]
updated: 2026-11-15
---

# Networking

Most production problems end up being network problems: a name that does not resolve, a port that is closed, a certificate that expired. You do not need to be a network engineer, but you need to follow one request from the client to the server and know what can break at each step.

**Levels on this page:** [Intro](#intro) · [Beginner](#beginner)

## Intro

### Terms

| Term | Meaning |
|---|---|
| IP address | The address of a machine on a network, e.g. `10.0.1.25` (IPv4) |
| CIDR | A range of addresses written as address/prefix. `10.0.1.0/24` is the 256 addresses `10.0.1.0` to `10.0.1.255` |
| Subnet | A slice of a network with its own CIDR range. Public subnets can reach the internet directly, private ones cannot |
| Port | A number (1 to 65535) that picks one program on a machine. 22 = SSH, 80 = HTTP, 443 = HTTPS, 5432 = PostgreSQL |
| TCP / UDP | The two transport protocols. TCP is a reliable ordered connection, UDP sends single packets with no guarantee |
| DNS | Turns a name (`example.com`) into an IP address. An `A` record holds an address, a `CNAME` points to another name |
| TTL | How long a DNS answer may be cached. A long TTL means a change takes long to reach everyone |
| HTTP | The request/response protocol of the web: a method (`GET`, `POST`), a path, headers, and a status code in the answer |
| TLS | Encryption and identity on top of TCP. HTTPS is HTTP inside TLS. The server proves who it is with a certificate |
| NAT | Rewriting addresses so many private machines share one public address |
| Firewall | Rules for which traffic is allowed, by source, destination and port. In clouds: security groups |
| Load balancer | Spreads incoming traffic across several servers. Layer 4 works on TCP connections, layer 7 understands HTTP |
| Reverse proxy | A server that receives requests and passes them to the real servers behind it |

### A small example: follow one request

When `curl https://example.com` runs, four things happen in order. Each has its own tool.

```bash
# 1. DNS: name to address
dig +short example.com

# 2. TCP: can I reach the port at all?
nc -vz example.com 443

# 3. TLS: who is on the other side, and until when is the certificate valid?
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -dates

# 4. HTTP: the request and the answer, with all the steps printed
curl -v https://example.com -o /dev/null
```

Read the failure by the step that failed:

- Step 1 fails: a DNS problem (wrong record, or the resolver is unreachable).
- Step 2 hangs: a firewall drops the traffic. "Connection refused" means the machine answered but nothing listens on that port.
- Step 3 fails: an expired certificate, or a certificate for another name.
- Step 4 returns 5xx: the network is fine and the application is broken.

## Beginner

Five things you will do with your own hands: look up names, set up and debug TLS, find out where a request spends its time, reach a private machine through a bastion, and tell a firewall from a dead service. Every example runs on a laptop with Docker: containers on Docker networks stand in for servers on a real network.

### More terms

| Term | Meaning |
|---|---|
| Resolver | The DNS server a machine asks. It asks other servers for you and caches the answers. Set in `/etc/resolv.conf` |
| Record types | `A` and `AAAA` (an IPv4 and an IPv6 address), `CNAME` (an alias for another name), `MX` (mail servers), `TXT` (free text: domain ownership, mail policies), `NS` (who answers for the zone) |
| NXDOMAIN | The DNS answer "this name does not exist" |
| Certificate authority (CA) | Who signs certificates. A client trusts a certificate if it was signed by a CA in its trust store |
| SAN | Subject alternative name: the names a certificate is valid for. Clients check the name in the URL against it |
| Certificate chain | The server's certificate, then the intermediate CAs up to a root the client trusts |
| Bastion (jump host) | The one machine reachable from outside, through which you reach the private ones |
| SSH tunnel | A port on your machine that is forwarded through SSH to a port behind the bastion |
| DROP / REJECT | Two ways a firewall refuses traffic: say nothing, or answer "refused" |

### The toolbox

One small image with the tools of this section:

```dockerfile
# Dockerfile
FROM alpine:3.20
RUN apk add --no-cache bind-tools curl openssl netcat-openbsd openssh-client openssh-server iptables python3
```

```bash
mkdir netlab && cd netlab        # put the Dockerfile here
docker build -t nettools .
docker network create lab
```

### DNS: names inside a network, and on the internet

Docker runs a small DNS server for each network, the way Kubernetes does for a cluster. Start a web server, and look it up from another container:

```bash
docker run -d --name web --network lab --network-alias www nginx:1.27-alpine

docker run --rm --network lab nettools cat /etc/resolv.conf
# nameserver 127.0.0.11          Docker's resolver

docker run --rm --network lab nettools dig +noall +answer web www
# web.                  600     IN      A       172.20.0.2
# www.                  600     IN      A       172.20.0.2

docker run --rm --network lab nettools sh -c 'dig nothing-here | grep -o "status: [A-Z]*"'
# status: NXDOMAIN
```

Each answer line is a record: the name, the TTL in seconds, the class, the type and the value. Two names, one address: an alias is just another name for the same container. The same mechanism is what lets a pod in Kubernetes reach `postgres.data.svc.cluster.local`.

`dig` asks the DNS server directly. Programs go through the system's resolver library instead, which also reads `/etc/hosts`. When the two disagree, `getent hosts <name>` shows what programs really get.

Public names have more record types:

```bash
docker run --rm --network lab nettools sh -c '
  dig +noall +answer www.github.com A
  dig +short gmail.com MX | sort | head -2
  dig +noall +answer example.com NS'
# www.github.com.        809     IN      CNAME   github.com.
# github.com.            20      IN      A       20.217.135.5
# 10 alt1.gmail-smtp-in.l.google.com.
# 20 alt2.gmail-smtp-in.l.google.com.
# example.com.           8030    IN      NS      elliott.ns.cloudflare.com.
# example.com.           8030    IN      NS      hera.ns.cloudflare.com.
```

`www.github.com` is an alias (`CNAME`) for `github.com`, which has an address with a TTL of 20 seconds: a short TTL lets the owner move traffic quickly. Your output will differ: addresses and TTLs change. Before you change a DNS record in production, lower its TTL a day ahead, so the old answer is not cached for hours after the change.

### TLS: a certificate authority of your own

Create a CA, and a certificate for `shop.lab` signed by it, valid for 90 days. The `subjectAltName` is the name clients will check:

```bash
docker run --rm -v "$PWD":/w -w /w nettools sh -c '
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=Lab CA" -keyout ca.key -out ca.crt
  openssl req -newkey rsa:2048 -nodes -subj "/CN=shop.lab" -keyout shop.key -out shop.csr
  printf "subjectAltName=DNS:shop.lab\n" > san.ext
  openssl x509 -req -in shop.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 90 -extfile san.ext -out shop.crt
  openssl x509 -in shop.crt -noout -subject -issuer -dates -ext subjectAltName'
# subject=CN=shop.lab
# issuer=CN=Lab CA
# notBefore=Nov 15 21:19:28 2026 GMT
# notAfter=Feb 13 21:19:28 2027 GMT
# X509v3 Subject Alternative Name:
#     DNS:shop.lab
```

Serve it with nginx, under two names:

```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name shop.lab;
    ssl_certificate     /w/shop.crt;
    ssl_certificate_key /w/shop.key;
    location / { return 200 "hello over TLS\n"; }
}
```

```bash
docker run -d --name shop --network lab --network-alias shop.lab --network-alias other.lab \
  -v "$PWD":/w:ro -v "$PWD/nginx.conf":/etc/nginx/conf.d/default.conf:ro nginx:1.27-alpine
```

Now the three answers you will see most:

```bash
docker run --rm --network lab -v "$PWD":/w -w /w nettools sh -c '
  curl -sS https://shop.lab/
  curl -sS --cacert ca.crt https://shop.lab/
  curl -sS --cacert ca.crt https://other.lab/'
# curl: (60) SSL certificate problem: unable to get local issuer certificate
# hello over TLS
# curl: (60) SSL: no alternative certificate subject name matches target hostname 'other.lab'
```

| Error | Meaning | Usual cause |
|---|---|---|
| `unable to get local issuer certificate` | The client does not trust the CA that signed the certificate | An internal CA that is not in the client's trust store, or a server that does not send its intermediate certificate |
| `no alternative certificate subject name matches` | The certificate is valid, but for another name | Reaching a service by IP or by a new name, or a certificate issued for the wrong host |
| `certificate has expired` | The `notAfter` date has passed | Renewal was not automated, or the automation broke silently |

The third one, made on purpose by signing a certificate whose validity ended in 2025 and serving it:

```text
curl: (60) SSL certificate problem: certificate has expired
Verify return code: 10 (certificate has expired)          (from openssl s_client)
```

`curl -k` skips all of these checks. It is useful to see whether the rest works, and it must never stay in a script.

To inspect a server's certificate from the outside, and to check expiry before it happens:

```bash
docker run --rm --network lab -v "$PWD":/w -w /w nettools sh -c '
  openssl s_client -connect shop.lab:443 -servername shop.lab -CAfile ca.crt </dev/null 2>/dev/null \
    | grep -E "s:|i:|Verify return code|Cipher is"
  openssl x509 -in shop.crt -noout -checkend $((30*86400))  && echo "valid for 30 more days"
  openssl x509 -in shop.crt -noout -checkend $((120*86400)) || echo "expires within 120 days"'
#  0 s:CN=shop.lab
#    i:CN=Lab CA
# New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
# Verify return code: 0 (ok)
# valid for 30 more days
# expires within 120 days
```

`-checkend` exits with an error when the certificate expires within the given seconds. That one line is a monitoring check: run it daily and alert well before the date. In Kubernetes, cert-manager renews certificates automatically, and the alert still belongs on the expiry date in case it fails.

### HTTP: where the time goes

"The site is slow" is a question about which step is slow. `curl -w` prints the time at which each step ended:

```bash
docker run --rm --network lab -v "$PWD":/w -w /w nettools curl -s -o /dev/null --cacert ca.crt \
  -w "dns %{time_namelookup}  tcp %{time_connect}  tls %{time_appconnect}  first byte %{time_starttransfer}  total %{time_total}  status %{http_code}\n" \
  https://shop.lab/
# dns 0.001838  tcp 0.002148  tls 0.012265  first byte 0.012758  total 0.012920  status 200

docker run --rm --network lab nettools curl -s -o /dev/null \
  -w "dns %{time_namelookup}  tcp %{time_connect}  tls %{time_appconnect}  first byte %{time_starttransfer}  total %{time_total}  status %{http_code}\n" \
  https://example.com/
# dns 0.030629  tcp 0.040750  tls 0.074710  first byte 0.097574  total 0.097727  status 200
```

The numbers add up: each one is "seconds since the start". For `example.com`: DNS took 30 ms, the TCP connection 10 ms more, TLS 34 ms more, and the server took 23 ms to start answering. The gap between `tls` and `first byte` is the server's own work: when that one is large, the network is fine and the application is slow. A large `dns` is a resolver problem, a large `tcp` is distance or a congested network.

`curl -sI` shows only the response headers, which is often all you need:

```bash
docker run --rm --network lab nettools curl -sI http://web/
# HTTP/1.1 200 OK
# Server: nginx/1.27.5
# Content-Type: text/html
# Content-Length: 615
```

### SSH: keys, a bastion and a tunnel

The setup: a `bastion` reachable from the public network, and behind it, on a private network with no way out, an `app` server and a Redis database. You are on the public network only.

```text
 you ──public──▶ bastion ──private──▶ app
                                └───▶ db (Redis, port 6379)
```

A key pair, made once per person and per laptop. The private key never leaves your machine, the public key goes to every server you may log in to:

```bash
docker run --rm -v "$PWD":/w -w /w nettools ssh-keygen -q -t ed25519 -N "" -C "dana@laptop" -f id_ed25519
cat id_ed25519.pub
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINFuyR6SBrXujckXcVGAoHzC... dana@laptop
```

Each server runs this, which creates the user, installs the public key and turns off passwords:

```bash
# sshd.sh
adduser -D dana && passwd -u dana >/dev/null 2>&1
mkdir -p /home/dana/.ssh && cp /w/id_ed25519.pub /home/dana/.ssh/authorized_keys
chown -R dana /home/dana/.ssh && chmod 700 /home/dana/.ssh && chmod 600 /home/dana/.ssh/authorized_keys
ssh-keygen -A >/dev/null
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/; s/^#*AllowTcpForwarding.*/AllowTcpForwarding yes/' /etc/ssh/sshd_config
exec /usr/sbin/sshd -D -e
```

```bash
docker network create public
docker network create --internal private           # no route out
docker run -d --name bastion --network public -v "$PWD":/w:ro nettools sh /w/sshd.sh
docker network connect private bastion             # the bastion is on both
docker run -d --name app --network private -v "$PWD":/w:ro nettools sh /w/sshd.sh
docker run -d --name db  --network private redis:7-alpine
```

An `~/.ssh/config` turns long commands into names. `ProxyJump` says "to reach `app`, go through `bastion`":

```text
# ssh_config
Host bastion
    HostName bastion
    User dana
    IdentityFile ~/.ssh/id_ed25519

Host app
    HostName app
    User dana
    ProxyJump bastion
    IdentityFile ~/.ssh/id_ed25519
```

From a container on the public network, with the key and this config in `~/.ssh`:

```bash
docker run --rm -it --network public -v "$PWD":/w nettools sh
mkdir -p ~/.ssh && cp /w/id_ed25519 /w/ssh_config ~/.ssh/ && mv ~/.ssh/ssh_config ~/.ssh/config
chmod 600 ~/.ssh/id_ed25519

nc -vz -w 3 db 6379
# nc: getaddrinfo for host "db" port 6379: Name does not resolve      not reachable from here

ssh bastion hostname                 # (answer yes to the host key the first time)
# 1617c88084dc

ssh app hostname                     # through the bastion, in one command
# 366cf3af5e82

ssh -f -N -L 6380:db:6379 bastion    # a tunnel: local port 6380 -> db:6379, as seen from the bastion
printf "PING\r\nSET greeting hello\r\nGET greeting\r\n" | nc -w 2 localhost 6380
# +PONG
# +OK
# $5
# hello

ssh -o IdentityFile=/dev/null -o PreferredAuthentications=password -o BatchMode=yes bastion true
# dana@bastion: Permission denied (publickey,keyboard-interactive).
```

The database was never exposed: the tunnel carries the connection inside SSH, and the database sees it coming from the bastion. This is how people reach a private database for a migration or an investigation. The last command proves passwords are off: only a key gets in.

The rules that matter: one key per person and per machine, so that one can be removed when a laptop is lost. Private keys are readable by their owner only (`chmod 600`), or SSH refuses to use them. In clouds, prefer the provider's session tools (AWS Systems Manager, Azure Bastion, GCP IAP) to open SSH ports: they need no public port and log every session.

```bash
exit
docker rm -f bastion app db && docker network rm public private
```

### A firewall: timeout or refused

Two services on one machine, ports 8000 and 9000. Nothing on 7000:

```bash
docker run -d --name fw --network lab --cap-add NET_ADMIN nettools \
  sh -c 'python3 -m http.server 8000 & python3 -m http.server 9000 & sleep infinity'

docker run --rm --network lab nettools sh -c 'for p in 8000 9000 7000; do nc -vz -w 3 fw $p; done'
# Connection to fw (172.20.0.4) 8000 port [tcp/*] succeeded!
# Connection to fw (172.20.0.4) 9000 port [tcp/*] succeeded!
# nc: connect to fw (172.20.0.4) port 7000 (tcp) failed: Connection refused
```

Now block both ports, in the two different ways:

```bash
docker exec fw iptables -A INPUT -p tcp --dport 8000 -j DROP
docker exec fw iptables -A INPUT -p tcp --dport 9000 -j REJECT --reject-with tcp-reset

docker run --rm --network lab nettools sh -c 'for p in 8000 9000; do nc -vz -w 5 fw $p; done'
# nc: connect to fw (172.20.0.4) port 8000 (tcp) timed out: Operation in progress     after 5 seconds
# nc: connect to fw (172.20.0.4) port 9000 (tcp) failed: Connection refused           at once

docker exec fw iptables -L INPUT -n -v --line-numbers
# num   pkts bytes target     prot opt in     out     source      destination
# 1        5   300 DROP       6    --  *      *       0.0.0.0/0   0.0.0.0/0    tcp dpt:8000
# 2        1    60 REJECT     6    --  *      *       0.0.0.0/0   0.0.0.0/0    tcp dpt:9000 reject-with tcp-reset

docker exec fw iptables -D INPUT 1          # remove rule 1: port 8000 answers again
```

The lesson is in the timing:

| What you see | What it means |
|---|---|
| Succeeded | The port is open and something listens |
| **Refused**, at once | The machine was reached. Nothing listens on that port, or a firewall rejects it |
| **Timeout** | Nothing answered at all. A firewall drops the packets on the way, a security group does not allow it, or there is no route |

Cloud security groups and network ACLs drop, they never reject, so a missing rule in the cloud always looks like a timeout. When a connection hangs, look at firewalls and routes first. When it is refused, look at the service. The packet counters (`pkts`) show whether a rule is the one that matched.

```bash
docker rm -f web shop fw && docker network rm lab
```

## In the lab

- The [lab](../13-lab/_index.md) routes by name: one address, `localhost:8090`, and Traefik picks the service by the `Host` header, so `grafana.localhost` and `prometheus.localhost` reach different services through the same port.
- Inside its cluster, the services find each other by DNS names such as `postgres.data.svc.cluster.local`, resolved by the cluster's DNS server as Docker's resolver does above.
- The [lab in a cloud](../13-lab/cloud.md) adds what this section prepares for: private subnets, security groups and TLS on the ingress.

## See also

- [Proxies and load balancers](../08-services/proxies.md)
- [Cloud concepts](../03-cloud/concepts.md)
- [Linux and the command line](linux.md)
- [Security](../10-security/_index.md): certificates, keys and access
