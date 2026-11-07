# adfs-auth

A thin library for FastAPI services that sit behind on-prem **ADFS (2016+)** on a private network.

- The caller sends either `Authorization: Bearer <ADFS access token>` or `X-API-Key: <key>`.
- The library checks it and builds a `Principal` with an identity, groups and **permissions**.
- Each route declares the permission it needs. If the caller lacks it, the route returns 403.
- No internet is needed. Signing keys come from your ADFS's JWKS endpoint, or from a pinned file.

Runtime dependencies are only `fastapi` and `pyjwt[crypto]`.

**Download:** [adfs-auth.zip](https://github.com/Barakkol33/blearning/releases/download/adfs-auth-latest/adfs-auth.zip). This link always serves the latest version.

**New here? Start with the [usage guide](docs/README.md)**, which walks through a small example service in [docs/example/](docs/example/).

## Quick start

```powershell
# inside the adfs-auth folder (unzipped or cloned)
python -m venv .venv ; .venv\Scripts\Activate.ps1      # Linux/macOS: source .venv/bin/activate
pip install -e ".[dev]"
pytest                                   # 18 tests, all offline, against the mock
```

To run the POC by hand, use two terminals from the `adfs-auth` folder:

```powershell
python -m adfs_auth.mock_adfs serve                 # 1: mock ADFS on http://localhost:9000
uvicorn poc.app:app --port 8000                     # 2: the sample service
```

```powershell
$alice = python -m adfs_auth.mock_adfs mint --user alice     # reader
$bob   = python -m adfs_auth.mock_adfs mint --user bob       # reader + writer
curl.exe -s localhost:8000/orders -H "Authorization: Bearer $alice"                 # 200
curl.exe -s -X POST localhost:8000/orders -H "Authorization: Bearer $alice" -H "Content-Type: application/json" -d '{\"item\":\"x\"}'   # 403
curl.exe -s -X POST localhost:8000/orders -H "Authorization: Bearer $bob"   -H "Content-Type: application/json" -d '{\"item\":\"x\"}'   # 201
curl.exe -s localhost:8000/orders -H "X-API-Key: poc-demo-key"               # 200 (API key, read only)
curl.exe -s localhost:8000/me -H "Authorization: Bearer $bob"                # shows the Principal
```

Swagger is at http://localhost:8000/docs. The **Authorize** button accepts either a token or an API key.

## Using it in a service

```python
from fastapi import Depends, FastAPI, Security
from adfs_auth import AdfsAuth, AuthSettings, Principal

auth = AdfsAuth(AuthSettings.from_env())        # ADFS_AUTH_* env vars / .env
app = FastAPI()

@app.get("/orders")
def orders(p: Principal = Security(auth.require("orders:read"))): ...

@app.post("/orders")
def create(p: Principal = Security(auth.require("orders:write"))): ...

@app.get("/health", dependencies=[Depends(auth.public)])
def health(): ...

auth.verify_routes(app)   # deny by default: startup fails if a route declares neither
```

`auth.require("a", "b")` needs both permissions. `auth.require("a", "b", any_of=True)` needs either one. `auth.authenticate` only requires a valid caller.

### Settings (`ADFS_AUTH_*`)

| var | example | notes |
|---|---|---|
| `AUDIENCE` | `urn:orders-api` | the Web API identifier in ADFS |
| `ISSUERS` | `http://adfs.corp.local/adfs/services/trust` | comma separated. ADFS **access** tokens use this odd `http://…/services/trust` value |
| `JWKS_URL` / `JWKS_FILE` | `https://adfs.corp.local/adfs/discovery/keys` | keys are cached for 1h. An unknown `kid` triggers a refetch, which handles cert rollover |
| `CA_BUNDLE` | `C:/certs/corp-root.pem` | your internal CA, used for the HTTPS call to ADFS |
| `POLICY_FILE` | `policy.json` | see below |
| `SUBJECT_CLAIMS` | `upn,unique_name,appid` | the first claim present becomes the identity |
| `MEMBERSHIP_CLAIMS` | `group,role` | ADFS sends one value as a string and several as a list. Both work |

### Policy file: what each caller may do in *this* service

```json
{
  "group_permissions":   { "CORP\\Orders-Writers": ["orders:read", "orders:write"] },
  "subject_permissions": { "batch-job": ["orders:read"] },
  "api_keys": { "<sha256 of the key>": { "name": "legacy-script", "permissions": ["orders:read"] } }
}
```

- ADFS only says who someone is and which groups they belong to. Each service decides what that means, so the ADFS admins never deal with fine-grained permissions.
- Group names are matched case-insensitively. A `"*"` permission grants everything.
- `subject_permissions` is for service-to-service tokens (client credentials). Those carry an `appid` and no groups.
- API keys are stored only as hashes. Create a hash with `python -m adfs_auth.mock_adfs hash-key <key>`. Prefer client-credentials tokens for new service callers, and keep API keys for scripts or legacy callers.

## Checking against the real ADFS: `adfs-auth-probe`

The POC was built against the mock. The probe tells you whether your real ADFS issues tokens the library accepts, and how they differ from the mock. It changes nothing in ADFS, and the only network calls it makes go to ADFS.

```powershell
# service token
adfs-auth-probe --adfs https://adfs.corp.local --audience urn:orders-api `
    --client-id <id> --ca-bundle C:\certs\corp-root.pem              # prompts for the secret

# user token: shows which group claims your claim rules emit
adfs-auth-probe --adfs https://adfs.corp.local --audience urn:orders-api `
    --client-id <id> --username CORP\alice --policy policy.json --expect orders:read

# or paste a token you already have
adfs-auth-probe --adfs https://adfs.corp.local --audience urn:orders-api --token-file token.txt --show-token
```

It runs through these checks:
1. discovery
2. JWKS
3. getting a token
4. what the token contains (alg, kid, iss, aud, exp, identity claim, group claims)
5. the token's shape compared with the mock (claim names, string vs list, `DOMAIN\name` vs SID format)
6. the library actually validating the token and mapping it through your policy

At the end it prints a ready-made `.env` block and one of these results: **PASS** (works the same as the mock), **WARN** (works, but review the differences) or **FAIL** (with a hint at the ADFS setting to fix).

To try the probe against the mock first:
```powershell
adfs-auth-probe --adfs http://localhost:9000 --audience urn:poc:orders-api --client-id poc-client `
    --client-secret poc-secret --username bob --password Passw0rd! --policy poc/policy.json --expect orders:write
```

## ADFS setup checklist (for the AD admin)

1. You need ADFS **2016 or later**. 2012 R2 has no OIDC discovery or JWKS.
2. **Application Group**, "Server application accessing a web API" template:
   - Server application: gives you the client id and secret, which is what callers use.
   - Web API: its **identifier** is the `AUDIENCE`, e.g. `urn:orders-api`.
   - Client permissions: allow the server application to call the Web API, with scope `openid`.
3. **Issuance transform rules** on the Web API:
   - `Send LDAP Attributes as Claims`: User-Principal-Name → `upn`.
   - Token-Groups – Qualified by Domain Name → `group`. Or emit `role` for selected groups only, which keeps tokens small.
4. Password grant is used only by the probe, to see a user token without a browser. Your real users will normally use authorization code flow through a frontend. The resource server code stays the same.

## Design notes

- **Dependency, not middleware.** Middleware runs before routing and can't see which permission a route needs. The dependency runs the same central code, but per route, shows up in OpenAPI, and is easy to override in tests.
- **A bearer token wins.** If a request has an invalid token, the library returns 401. It never falls back to the API key.
- **Error responses:** 401 carries `WWW-Authenticate: Bearer` and a short reason. 403 names the missing permission.
- **Ready-made alternatives:** PyJWT does the crypto here. `fastapi-azure-auth` targets Entra ID, not ADFS. Keycloak as a broker is overkill. There's no off-the-shelf package for "ADFS JWT + API key + route permissions", and this library is roughly 300 lines.

## Layout

```
adfs_auth/  config.py  principal.py  jwt_validator.py  apikey.py  fastapi_auth.py
            mock_adfs.py   (stand-in ADFS: discovery, JWKS, token endpoint, token minting)
            probe.py       (adfs-auth-probe: compare the real ADFS with the mock)
poc/        app.py  policy.json  .env.example
tests/      test_auth.py
```
