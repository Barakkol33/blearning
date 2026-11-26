---
title: "Authentication: cookies, tokens, JWT and OAuth"
sidebar:
  label: Authentication
order: 2
description: "How a request proves who sent it: cookies and sessions, the Authorization header, API keys, JWT, OAuth 2.0 and OpenID Connect."
lang: en
tags: [intro, beginner, advanced]
updated: 2026-11-24
---

# Authentication: cookies, tokens, JWT and OAuth

Every request that reaches a service has to answer one question: who sent it? A browser answers with a cookie, a script with an API key, a service with a token, a pipeline with a signed identity from its CI system. A DevOps engineer meets all of them, usually when they break: a 401 after a deploy, users logged out at random, a login that loops forever behind the new proxy, a pipeline that can no longer reach the cloud. This page explains how each mechanism works, so those failures can be read.

**Levels on this page:** [Intro](#intro) · [Beginner](#beginner) · [Advanced](#advanced)

## Intro

### Terms

| Term | Meaning |
|---|---|
| Authentication (authn) | Proving who you are |
| Authorization (authz) | Deciding what you may do. It comes after authentication |
| Credential | What proves identity: a password, a key, a token, a certificate |
| Session | The server remembers a logged-in user between requests, under a random ID |
| Cookie | A small named value the server asks the browser to store and send back on every request to that site |
| `Authorization` header | The standard HTTP header that carries a credential: `Authorization: <scheme> <value>` |
| Basic authentication | The scheme `Basic`: user name and password, base64-encoded, on every request |
| Bearer token | The scheme `Bearer`: a token, and whoever holds ("bears") it may use it |
| API key | A long random secret that identifies a program, not a person |
| Token | A string issued after authentication, used in its place on later requests |
| Access token | The token sent to an API. Short-lived: minutes to an hour |
| Refresh token | A long-lived token used only to get a new access token, without logging in again |
| JWT | JSON Web Token: a token that carries its own data (claims) and a signature, so it can be checked without a database. Said "jot" |
| Claim | One field inside a JWT: who (`sub`), issued by (`iss`), for whom (`aud`), until when (`exp`) |
| Identity provider (IdP) | The service that logs users in and issues tokens: Entra ID, Okta, Google, Keycloak, Auth0 |
| OAuth 2.0 | The standard for giving an application limited access to an API on a user's behalf, without the user's password |
| Scope | A named permission requested in OAuth, such as `repo:read` |
| OpenID Connect (OIDC) | A layer on OAuth 2.0 that adds login: an ID token that says who the user is |
| SSO | Single sign-on: log in once at the IdP, use many applications |
| SAML | An older XML-based SSO standard, still common in enterprises |
| PKCE | "Proof Key for Code Exchange", said "pixie": protects the OAuth login flow against a stolen code |
| CSRF | Cross-site request forgery: another site makes the browser send a request with your cookies |
| XSS | Cross-site scripting: an attacker's script runs inside your page and can read what the page can |
| CORS | The browser's rules for which other sites may call your API from JavaScript |
| mTLS | Mutual TLS: both sides present certificates. Proves the identity of services, not users |

### The problem: HTTP forgets

HTTP is stateless. The server does not remember the previous request, so **every request must carry its proof again**. There are two questions in every design:

1. **How is the proof carried?** In a **cookie**, which the browser stores and sends by itself, or in a **header** (usually `Authorization`), which the client code sets on each request.
2. **What is the proof?** A **reference**, a random session ID that the server looks up in its store, or a **self-contained token**, a JWT that the server checks by its signature without looking anything up.

| | Reference (session ID) | Self-contained (JWT) |
|---|---|---|
| **In a cookie** | The classic web login | Some single-page apps and gateways |
| **In a header** | API keys, opaque OAuth tokens | Most APIs, Kubernetes, cloud federation |

Browsers usually use cookies. Programs (scripts, services, CLIs, pipelines) usually use headers.

### Cookies

The server sets a cookie with a response header, and the browser sends it back with every later request to the same site:

```text
HTTP/1.1 200 OK
Set-Cookie: session=8f2a9c41e7; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600
```

```text
GET /orders HTTP/1.1
Host: shop.example.com
Cookie: session=8f2a9c41e7
```

The attributes decide when the browser sends it, and who can read it:

| Attribute | What it does |
|---|---|
| `Domain` | Which host names receive it. Without it: only the exact host that set it |
| `Path` | Which URL paths receive it |
| `Max-Age` / `Expires` | When it is deleted. Without them, it is a "session cookie" that is deleted when the browser closes |
| `Secure` | Sent only over HTTPS |
| `HttpOnly` | JavaScript cannot read it. A script injected by XSS cannot steal it |
| `SameSite` | Whether it is sent on requests started by other sites: `Strict` (never), `Lax` (only on top-level navigation, the default in browsers), `None` (always; requires `Secure`) |
| `__Host-` name prefix | The browser accepts it only with `Secure`, `Path=/` and no `Domain`. The strictest form |

**A session login, step by step:**

1. The user posts a user name and password to `/login`.
2. The server checks them, creates a session in its store (`8f2a9c41e7 → user dana, expires 18:00`) and returns `Set-Cookie: session=8f2a9c41e7`.
3. Every later request carries the cookie. The server looks up the ID and knows the user.
4. Logout deletes the session from the store. The cookie becomes worthless at once.

**Where the session store lives is a DevOps decision.** In the application's memory, it breaks as soon as there are two replicas: a request that reaches the other replica finds no session, and the user is logged out. The fixes are sticky sessions at the [load balancer](../08-services/proxies.md) (fragile: a restart still loses them) or, better, a shared store such as [Redis](../08-services/caching.md) or the database.

Cookies are sent automatically, and that is the weakness too: a form on another site that posts to your site carries your cookies (CSRF). `SameSite=Lax` stops most of it, and applications add a CSRF token to forms for the rest.

### The `Authorization` header

Programs send the credential themselves, in one header:

```text
Authorization: <scheme> <credentials>
```

| Scheme | Example | Notes |
|---|---|---|
| `Basic` | `Authorization: Basic ZGFuYTpzM2NyZXQ=` | base64 of `dana:s3cret`. Base64 is an encoding, not encryption: anyone who sees the header has the password. Only over HTTPS |
| `Bearer` | `Authorization: Bearer eyJhbGciOi...` | A token: opaque or a JWT. The most common scheme for APIs |
| `AWS4-HMAC-SHA256` | AWS Signature v4 | The request is signed with a secret key. The key itself is never sent |
| `Negotiate` | Kerberos | Windows domains, Active Directory |

When the credential is missing or wrong, the server answers **401** and says which scheme it expects in a `WWW-Authenticate` header:

```text
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="https://auth.docker.io/token",service="registry.docker.io"
```

A valid identity without the needed permission gets **403**. The difference matters when debugging: 401 is "I don't know who you are", 403 is "I know who you are, and no".

**API keys** are often sent in a header of their own, such as `X-API-Key`. Never in the URL (`?api_key=...`): URLs end up in access logs, proxy logs and browser history.

Things that happen to this header on the way:

- Proxies pass it on by default. Make sure access logs do not record it, nor `Cookie`.
- `curl -L` and most HTTP clients drop it when a redirect goes to another host, so the token does not leak there. A request that works directly and fails after a redirect often lost its header this way.
- A browser that calls an API on another domain sends an `OPTIONS` "preflight" first, without the header. If the API demands authentication on `OPTIONS` too, or answers without the CORS headers, the real request is never sent.

### JWT: a token that carries its own data

A JWT is three base64url-encoded parts joined by dots: **header.payload.signature**.

```text
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIwMjYtMTEifQ.eyJpc3MiOiJodHRwczovL2xvZ2luLmV4YW1wbGUuY29tIiwic3ViIjoiZGFuYSIs(…).Kx9fQ2mVr(…)
```

Decoded:

```json
{ "alg": "RS256", "typ": "JWT", "kid": "2026-11" }
```

```json
{
  "iss": "https://login.example.com",
  "sub": "dana",
  "aud": "orders-api",
  "iat": 1795557461,
  "exp": 1795558361,
  "scope": "orders:read orders:write"
}
```

The third part is a signature over the first two. Change one character of the payload and the signature no longer matches.

| Claim | Meaning | What the receiver checks |
|---|---|---|
| `iss` | Issuer: who created the token | It is the issuer it trusts |
| `sub` | Subject: who the token is about | Used as the user's identity |
| `aud` | Audience: which service it is for | It is this service. Otherwise a token for another service could be replayed here |
| `exp` | Expiry time, in seconds since 1970 | It is in the future |
| `nbf`, `iat` | Not before, issued at | Not in the future (with a small allowance for clock skew) |
| `jti` | A unique ID | Used to detect reuse or to revoke one token |
| Others | `scope`, `roles`, `groups`, `email` | Used for authorization |

Three facts to remember:

1. **Signed, not encrypted.** Anyone can decode and read a JWT. Never put secrets in it. Paste a token into a decoder and you see everything.
2. **Two kinds of signing keys.** `HS256` uses one shared secret: everyone who can verify can also create tokens. `RS256` and `ES256` use a key pair: the issuer signs with the private key, and services verify with the public key, which the issuer publishes at a JWKS URL (`/.well-known/jwks.json`). The `kid` in the header says which key to use, so keys can be rotated.
3. **It cannot be taken back.** A server that checks only the signature accepts the token until `exp`, even after logout or a password change. So access tokens live minutes, and refresh tokens (which are checked against a store) get new ones. Where instant revocation is needed, a denylist of `jti` values, or plain sessions.

Verifying a JWT properly means: check the signature with the algorithm you expect (never accept `"alg": "none"`, and never let the token choose the algorithm), check `exp` and `nbf`, check `iss` and `aud`. Use a library for this. Do not write it yourself.

| | Session ID | JWT |
|---|---|---|
| Server must look it up | Yes, on every request | No, only verify the signature |
| Revoke at once | Yes, delete the session | No, wait for `exp` (or keep a denylist) |
| Works across many services | Only with a shared store | Yes, each service needs only the public key |
| Size | Small | Hundreds of bytes to a few KB, on every request |
| Readable by the client | No, it is random | Yes, the payload is plain JSON |

### OAuth 2.0: access without the password

The problem: an application (a CI service, a dashboard, a mobile app) needs to call an API on your behalf, for example to read your repositories. Giving it your password would give it everything, forever. OAuth 2.0 gives it a **limited token** instead: only the scopes you approved, for a limited time, revocable.

The four roles:

| Role | Example |
|---|---|
| Resource owner | You, the user |
| Client | The application that wants access |
| Authorization server | The service that logs you in and issues tokens (the IdP) |
| Resource server | The API that accepts the token |

OAuth defines several **grants**, ways of getting a token, for different kinds of clients:

| Grant | Who uses it | How |
|---|---|---|
| **Authorization code + PKCE** | Web apps, single-page apps, mobile apps: a user is present | The browser is sent to the IdP to log in, comes back with a one-time code, and the app exchanges the code for tokens |
| **Client credentials** | Service to service, jobs, pipelines: no user | The client sends its own ID and secret (or a signed assertion) and gets a token |
| **Device code** | CLIs and TVs, without a browser at hand | The tool shows a code, you enter it at a URL on another device. `gh auth login` and `az login --use-device-code` work this way |
| **Refresh token** | Any client that got a refresh token | Trades it for a new access token |
| Implicit, password | Old clients | Deprecated. Do not use |

**The authorization code flow, step by step:**

1. The user clicks "Log in". The app sends the browser to the IdP:

   ```text
   https://login.example.com/authorize?response_type=code
       &client_id=dashboard
       &redirect_uri=https://dash.example.com/callback
       &scope=openid profile orders:read
       &state=x7Fq2
       &code_challenge=E9Melhoa2Owv...&code_challenge_method=S256
   ```

2. The user logs in at the IdP (password, MFA) and approves the scopes. The app never sees the password.
3. The IdP sends the browser back to `https://dash.example.com/callback?code=SplxlOBe&state=x7Fq2`. The app checks that `state` is the value it sent.
4. The app's server exchanges the code for tokens, in a direct call to the IdP, with its client secret and the PKCE verifier:

   ```bash
   curl -s https://login.example.com/token \
     -d grant_type=authorization_code -d code=SplxlOBe \
     -d redirect_uri=https://dash.example.com/callback \
     -d client_id=dashboard -d client_secret=... -d code_verifier=dBjftJeZ4CVP...
   ```

   ```json
   { "access_token": "eyJ...", "refresh_token": "8xLOxBtZp8", "id_token": "eyJ...",
     "token_type": "Bearer", "expires_in": 900 }
   ```

5. The app calls the API with `Authorization: Bearer <access_token>`, and often keeps its own session cookie for the browser.

The `redirect_uri` must match, character for character, one that is registered at the IdP. This is the most common configuration error after a move to a new domain or behind a new proxy.

**Client credentials** is simpler, and it is the one services and jobs use:

```bash
curl -s https://login.example.com/token \
  -d grant_type=client_credentials -d client_id=billing-job -d client_secret=... -d scope=orders:read
```

### OpenID Connect: login on top of OAuth

OAuth answers "may this app access this API?". It does not say who the user is. OpenID Connect adds that:

- The scope `openid` in the request.
- An **ID token**, a JWT about the user (`sub`, `email`, `name`), meant for the client, not for APIs.
- A `userinfo` endpoint.
- A **discovery document** at `<issuer>/.well-known/openid-configuration`, listing the IdP's endpoints and its JWKS URL. Most tools need only the issuer URL and find the rest there.

"Log in with Google", SSO with Entra ID or Okta, and Keycloak are all OIDC. So is the identity that GitHub Actions gives a pipeline, below.

### Where a DevOps engineer meets them

| Where | What happens |
|---|---|
| **Kubernetes ServiceAccounts** | Each pod gets a JWT, mounted at `/var/run/secrets/kubernetes.io/serviceaccount/token`, short-lived and rotated by the kubelet. The API server checks it, then [RBAC](../02-containers/kubernetes-production.md) decides what it may do |
| **People on a cluster** | `kubectl` logs in to the company IdP with OIDC (the kubelogin plugin) and sends the ID token. The cloud CLIs (`aws eks`, `az aks`, `gcloud`) do the same with their own tokens |
| **Pipelines to clouds** | GitHub Actions and GitLab issue the job an OIDC JWT (`sub: repo:my-org/my-repo:ref:refs/heads/main`). The cloud trusts that issuer and exchanges the token for short-lived credentials. No stored keys. See [DevSecOps](devsecops.md) |
| **Workloads to clouds** | EKS Pod Identity and IRSA, GKE Workload Identity, Azure Workload Identity: the ServiceAccount token is exchanged for cloud credentials the same way |
| **Container registries** | `docker login` and `docker pull` use the bearer flow: a 401 with `WWW-Authenticate`, a token from the registry's token service, and the retry. The example below runs it by hand |
| **Login in front of internal tools** | oauth2-proxy, or forward auth in Traefik and nginx (`auth_request`), puts an OIDC login in front of an application that has none, such as a Prometheus or Kibana UI |
| **API gateways** | Kong, Envoy and the cloud gateways check the JWT once at the edge, so each service does not have to |
| **Service mesh** | mTLS proves which service is calling. A JWT, checked by the mesh, says which user it is for (Istio `RequestAuthentication`) |
| **Webhooks** | The sender signs the body with a shared secret (`X-Hub-Signature-256` in GitHub). The receiver recomputes the HMAC and compares |

### Reading authentication failures

| Symptom | Common causes |
|---|---|
| Every request gets 401 after a deploy | Wrong issuer or audience in the new config. The JWKS URL is unreachable (egress blocked). An `HS256` secret that differs between replicas or environments |
| Valid tokens rejected as expired or "not yet valid" | Clock skew. A server clock a few minutes off breaks `exp` and `nbf`. Check NTP |
| Users logged out at random | Sessions kept in memory with several replicas, or a session store that was flushed. A signing key that changes on every restart |
| The browser does not keep the cookie | `Secure` over plain HTTP, `SameSite=None` without `Secure`, a `Domain` that does not match, or a cookie over 4 KB |
| A login loop, or "redirect_uri mismatch" | Behind a TLS-terminating proxy the app believes it is on `http://` and builds a wrong callback URL. Pass `X-Forwarded-Proto` and `X-Forwarded-Host`, and tell the framework to trust the proxy |
| The header never reaches the application | A proxy or gateway strips it, or a CORS preflight fails first |
| 403 with a valid token | Authentication worked. A scope, role or RBAC binding is missing |
| A pipeline's OIDC login is refused | The cloud trust policy expects another `sub` (another branch, a tag, a pull request) or another `aud` |

### The rules

1. **Tokens, cookies and keys are secrets.** Never log `Authorization` or `Cookie`, never put a credential in a URL, never commit one.
2. **HTTPS everywhere.** Every one of these mechanisms is broken over plain HTTP.
3. **Short-lived beats long-lived.** Access tokens in minutes, refresh tokens rotated, no permanent keys where federation is possible.
4. **In the browser, prefer `HttpOnly`, `Secure`, `SameSite` cookies** over tokens in `localStorage`, which any XSS can read.
5. **Check the audience.** A token valid for one service must not be accepted by another.
6. **Do not build your own.** Use an IdP and the standard libraries. Authentication code written from scratch is where the vulnerabilities are.

## Beginner

Three exercises with nothing but `curl`, `openssl` and Bash (Git Bash on Windows works). The third needs a Kubernetes cluster, such as the one from the [exercise](../12-exercise/instructions.md) or the [lab](../13-lab/_index.md).

### Cookies and the `Authorization` header with curl

[httpbin](https://httpbin.org) is a service that echoes what it receives. Use the public one, or run it locally with `docker run -p 8080:8080 mccutchen/go-httpbin` and set `H=http://localhost:8080`.

```bash
H=https://httpbin.org

# The server sets a cookie
curl -si "$H/cookies/set?session=abc123" | grep -iE '^HTTP|set-cookie'
# HTTP/1.1 302 Found
# set-cookie: session=abc123; Secure; Path=/

# curl stores it in a "cookie jar" and sends it back, as a browser does
curl -s -c jar.txt -L "$H/cookies/set?session=abc123" > /dev/null
curl -s -b jar.txt "$H/cookies"
# { "cookies": { "session": "abc123" } }

# Basic authentication: the header is only base64
curl -s -u dana:s3cret "$H/headers" | grep -i authorization
# "Authorization": "Basic ZGFuYTpzM2NyZXQ="
echo ZGFuYTpzM2NyZXQ= | base64 -d
# dana:s3cret

# Bearer: without a token, 401 and the expected scheme
curl -si "$H/bearer" | grep -iE '^HTTP|www-authenticate'
# HTTP/1.1 401 Unauthorized
# www-authenticate: Bearer
curl -s -H "Authorization: Bearer my-token" "$H/bearer"
# { "authenticated": true, "token": "my-token" }
```

### Make and verify a JWT by hand

A JWT is simple enough to build with `openssl`. Doing it once removes the mystery. Save as `jwt.sh` and run `bash jwt.sh`:

```bash
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
b64url_decode() {
  local s; s=$(tr '_-' '/+')
  while [ $(( ${#s} % 4 )) -ne 0 ]; do s="$s="; done
  printf '%s' "$s" | base64 -d
}

secret='change-me'
now=$(date +%s)

# Build: header.payload, then an HMAC-SHA256 signature over both
header=$(printf '%s' '{"alg":"HS256","typ":"JWT"}' | b64url)
payload=$(printf '{"iss":"demo","sub":"dana","aud":"orders-api","role":"viewer","iat":%d,"exp":%d}' \
  "$now" "$((now + 900))" | b64url)
signature=$(printf '%s' "$header.$payload" | openssl dgst -sha256 -hmac "$secret" -binary | b64url)
token="$header.$payload.$signature"
echo "$token"

# Anyone can read it
cut -d. -f2 <<<"$token" | b64url_decode; echo

# Verify: recompute the signature, then check the expiry
verify() {
  local h p s expected exp
  IFS=. read -r h p s <<<"$1"
  expected=$(printf '%s' "$h.$p" | openssl dgst -sha256 -hmac "$secret" -binary | b64url)
  [ "$s" = "$expected" ] || { echo "invalid signature"; return 1; }
  exp=$(b64url_decode <<<"$p" | grep -o '"exp":[0-9]*' | cut -d: -f2)
  [ "$(date +%s)" -lt "$exp" ] || { echo "expired"; return 1; }
  echo "valid"
}
verify "$token"

# Tamper: make yourself an admin, keep the old signature
forged=$(b64url_decode <<<"$payload" | sed 's/"viewer"/"admin"/' | b64url)
verify "$header.$forged.$signature"
```

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZW1vIiwic3ViIjoiZGFuYSIs...
{"iss":"demo","sub":"dana","aud":"orders-api","role":"viewer","iat":1795557461,"exp":1795558361}
valid
invalid signature
```

The payload was readable by anyone, and changing it broke the signature. Note what `HS256` means here: whoever knows `change-me` can verify tokens, and can also mint them. That is why issuers that serve many services use `RS256`, where the services hold only the public key.

### A real bearer flow: pulling from Docker Hub

`docker pull` does this behind the scenes. Run it by hand, with the two functions from the script above defined in the shell:

```bash
# 1. Ask without credentials: 401, and where to get a token
curl -si https://registry-1.docker.io/v2/library/nginx/tags/list | grep -iE '^HTTP|www-authenticate'
# HTTP/1.1 401 Unauthorized
# www-authenticate: Bearer realm="https://auth.docker.io/token",service="registry.docker.io",scope="repository:library/nginx:pull"

# 2. Get an anonymous token for exactly that scope
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/nginx:pull" \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')

# 3. It is a JWT. Read it
cut -d. -f1 <<<"$TOKEN" | b64url_decode; echo
cut -d. -f2 <<<"$TOKEN" | b64url_decode; echo
# {"alg":"RS256",...}
# {"access":[{"actions":["pull"],"name":"library/nginx",...}],"aud":"registry.docker.io",
#  "exp":...,"iat":...,"iss":"auth.docker.io","nbf":...}

# 4. Retry with the token
curl -s -H "Authorization: Bearer $TOKEN" https://registry-1.docker.io/v2/library/nginx/tags/list | head -c 100
# {"name":"library/nginx","tags":["1","1-alpine",...
```

Everything from the Intro is here: the 401 with `WWW-Authenticate`, a token limited to one scope, an audience, a lifetime of five minutes (`exp` minus `iat`), an `nbf` set a little in the past to allow for clock skew, and `RS256`, so the registry needs only the public key.

### A Kubernetes ServiceAccount token

```bash
TOKEN=$(kubectl create token default --duration=10m)
cut -d. -f2 <<<"$TOKEN" | b64url_decode; echo
```

```json
{"aud":["https://kubernetes.default.svc.cluster.local"],"exp":...,"iat":...,
 "iss":"https://kubernetes.default.svc.cluster.local",
 "kubernetes.io":{"namespace":"default","serviceaccount":{"name":"default","uid":"..."}},
 "sub":"system:serviceaccount:default:default"}
```

Call the API server with it, and then with a broken token:

```bash
API=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

curl -sk -H "Authorization: Bearer $TOKEN" "$API/api/v1/namespaces/default/pods"
# "message": "pods is forbidden: User \"system:serviceaccount:default:default\" cannot list resource \"pods\" ...", "code": 403

curl -sk -H "Authorization: Bearer ${TOKEN}x" "$API/api/v1/namespaces/default/pods"
# "message": "Unauthorized", "code": 401
```

The first is 403: the API server knows exactly who is calling, and RBAC gives the `default` ServiceAccount no permissions. The second is 401: the signature is broken, so the caller is nobody. Give the ServiceAccount a role and the first call succeeds:

```bash
kubectl create rolebinding default-view --clusterrole=view --serviceaccount=default:default
curl -sk -H "Authorization: Bearer $TOKEN" "$API/api/v1/namespaces/default/pods" | head -5
kubectl delete rolebinding default-view
```

(`-k` skips the TLS check because the cluster's CA is not in your trust store. Fine for a local cluster, not elsewhere.)

## Advanced

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **OAuth 2.0 in depth**: the grants, PKCE, token introspection and revocation, OAuth 2.1
- **OpenID Connect**: ID tokens, discovery, `userinfo`, logout flows
- **JWT security**: algorithm confusion, `alg: none`, key rotation with JWKS and `kid`, audience checks
- **JWE and PASETO**: encrypted tokens, and an alternative token format
- **Token storage in browsers**: `HttpOnly` cookies vs `localStorage`, the backend-for-frontend pattern
- **Refresh token rotation**: detecting a stolen refresh token by its reuse
- **Sender-constrained tokens**: DPoP and mTLS-bound tokens, so a stolen token is useless alone
- **Token exchange**: RFC 8693, swapping one token for another, the basis of workload federation
- **SAML**: assertions, IdP and SP metadata, why enterprises still use it
- **Identity providers**: Keycloak, Dex, Authentik, Entra ID, Okta, Auth0, Cognito
- **SCIM**: provisioning and removing users across applications from the IdP
- **Kubernetes authentication**: ServiceAccount token projection, OIDC for `kubectl`, the TokenReview API, impersonation
- **Workload identity federation**: GitHub Actions and GitLab OIDC, IRSA and EKS Pod Identity, GKE and Azure Workload Identity, SPIFFE and SPIRE
- **Authentication at the edge**: oauth2-proxy, Traefik ForwardAuth, nginx `auth_request`, JWT validation in API gateways and Envoy
- **Authorization models**: RBAC, ABAC, ReBAC (Zanzibar, OpenFGA), policy engines such as OPA and Cedar
- **CSRF, XSS and CORS**: the browser attacks on cookies and tokens, and the defenses
- **Webhook signatures**: HMAC over the body, timestamps against replay
- **Passkeys and WebAuthn**: login without passwords, with keys held by the device
- **MFA methods**: TOTP, push, hardware keys (FIDO2), and which resist phishing

## See also

- [DevSecOps](devsecops.md): secrets, least privilege, OIDC federation for pipelines
- [APIs](../05-code/apis.md): status codes and reading a call
- [Networking](../01-get-started/networking.md): TLS and certificates
- [Proxies and load balancers](../08-services/proxies.md): forwarded headers and sticky sessions
- [Caching and Redis](../08-services/caching.md): a shared session store
- [Service mesh](../08-services/service-mesh.md): mTLS between services
