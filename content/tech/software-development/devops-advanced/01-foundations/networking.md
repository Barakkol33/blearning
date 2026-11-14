---
title: Networking
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# Networking

**Level: intro**

Most production problems end up being network problems: a name that does not resolve, a port that is closed, a certificate that expired. You do not need to be a network engineer, but you need to follow one request from the client to the server and know what can break at each step.

## Terms

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

## A small example: follow one request

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

## Where it goes next

- Beginner: build a small network yourself, with subnets, routing and a firewall, and capture packets with `tcpdump`.
- Advanced: TCP in depth, HTTP/2 and HTTP/3, BGP and how cloud networks are built, Kubernetes networking.

## See also

- [Proxies and load balancers](../08-services/proxies.md)
- [Cloud concepts](../02-cloud/concepts.md)
- [Linux practical guide](../../devops/01-get-started/linux.md)
