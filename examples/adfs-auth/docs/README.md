# Using adfs-auth in your FastAPI service

This guide shows how to protect a FastAPI service with ADFS logins and API keys. The finished result is in [example/](example/), a small inventory service with tests.

## What the library does for you

```
request ──► Authorization: Bearer <ADFS token>   ─┐
        └─► X-API-Key: <key>                       ├─► Principal(subject, groups, permissions) ─► route
                                                   │        403 if the route's permission is missing
            nothing / invalid                     ─┘─► 401
```

- **ADFS** tells you *who* the caller is and *which AD groups* they are in.
- **Your service** decides what those groups may do. That goes in `policy.json`, which stays next to your code.
- **Each route** states the permission it needs, for example `inventory:write`.

## 1. Install

```powershell
pip install -e path\to\adfs-auth          # or: pip install adfs-auth  from your internal index
```

Get the code from the [latest zip](https://github.com/Barakkol33/blearning/releases/download/adfs-auth-latest/adfs-auth.zip) or the [source on GitHub](https://github.com/Barakkol33/blearning/tree/main/examples/adfs-auth).

The only runtime dependencies are `fastapi` and `pyjwt[crypto]`. On a network with no internet, build a wheelhouse once on a machine that has access (`pip download adfs-auth -d wheels`). Then install from it with `pip install --no-index -f wheels adfs-auth`.

## 2. Name your permissions

Choose short `resource:action` names for what your service does. The example uses:

| permission | allows |
|---|---|
| `inventory:read` | `GET /stock` |
| `inventory:write` | `POST /stock/{item}/adjust` |
| `inventory:admin` | `DELETE /stock/{item}` |

## 3. Protect the routes ([example/main.py](example/main.py))

```python
from fastapi import Depends, FastAPI, Security
from adfs_auth import AdfsAuth, AuthSettings, Principal

auth = AdfsAuth(AuthSettings.from_env())
app = FastAPI()

@app.get("/health", dependencies=[Depends(auth.public)])            # no login
def health(): ...

@app.get("/whoami")
def whoami(caller: Principal = Security(auth.authenticate)): ...     # any valid caller

@app.get("/stock")
def list_stock(caller: Principal = Security(auth.require("inventory:read"))): ...

@app.post("/stock/{item}/adjust")
def adjust(item: str, delta: int, caller: Principal = Security(auth.require("inventory:write"))):
    ...  # caller.subject is "dana@corp.local" (user), "nightly-sync" (service) or "apikey:<name>"

auth.verify_routes(app)    # the service won't start if a route has none of the above
```

The ways a route can declare access:

| declaration | meaning |
|---|---|
| `Security(auth.require("a"))` | caller needs permission `a` |
| `Security(auth.require("a", "b"))` | caller needs both |
| `Security(auth.require("a", "b", any_of=True))` | caller needs either |
| `Security(auth.authenticate)` | any valid caller |
| `dependencies=[Depends(auth.public)]` | no authentication |

The `Principal` you receive has these fields:
- `subject`: who the caller is
- `kind`: `"jwt"` or `"apikey"`
- `memberships`: groups, roles and `scp:` scopes
- `permissions`
- `claims`: the raw token claims

Use `caller.has("x")` to check a permission inside the code, for example for row-level rules.

## 4. Say who may do what ([example/policy.json](example/policy.json))

```json
{
  "group_permissions": {
    "CORP\\Inventory-Viewers": ["inventory:read"],
    "CORP\\Inventory-Clerks":  ["inventory:read", "inventory:write"],
    "CORP\\Inventory-Admins":  ["*"]
  },
  "subject_permissions": { "nightly-sync": ["inventory:read", "inventory:write"] },
  "api_keys": {
    "3e7b29d3...45a5": { "name": "warehouse-scanner", "permissions": ["inventory:read"] }
  }
}
```

- **group_permissions** is for people. Write group names exactly as ADFS sends them. The probe (step 7) shows you the format, usually `DOMAIN\Group`. Matching ignores case.
- **subject_permissions** is for other services that call yours with a client-credentials token. The key is their ADFS client id.
- **api_keys** maps the SHA-256 hash of each key to a name and permissions. Never store the key itself. To create a hash, run `python -m adfs_auth.mock_adfs hash-key <key>`. Use API keys only for callers that can't get an ADFS token.
- `"*"` grants every permission.

## 5. Configure ([example/.env.example](example/.env.example))

Copy `.env.example` to `.env`, or set the same variables in the environment:

| variable | what | example |
|---|---|---|
| `ADFS_AUTH_AUDIENCE` | the Web API identifier your ADFS admin created | `urn:example:inventory-api` |
| `ADFS_AUTH_ISSUERS` | the token issuer. ADFS uses this odd `http://` value | `http://adfs.corp.local/adfs/services/trust` |
| `ADFS_AUTH_JWKS_URL` | ADFS signing keys | `https://adfs.corp.local/adfs/discovery/keys` |
| `ADFS_AUTH_CA_BUNDLE` | your internal root CA, for HTTPS to ADFS | `C:/certs/corp-root.pem` |
| `ADFS_AUTH_POLICY_FILE` | step 4 | `policy.json` |

You don't have to work these values out yourself. The probe in step 7 prints them.

## 6. Run the example against the mock ADFS

The mock acts like ADFS on your machine, so you can develop before the ADFS side is ready. Use two terminals from `docs/example`:

```powershell
copy .env.example .env
python -m adfs_auth.mock_adfs serve            # terminal 1: mock ADFS on :9000
uvicorn main:app --port 8001                   # terminal 2
```

```powershell
$clerk = python -m adfs_auth.mock_adfs mint --user dana --groups "CORP\Inventory-Clerks" --audience urn:example:inventory-api
curl.exe -s localhost:8001/stock -H "Authorization: Bearer $clerk"                          # 200
curl.exe -s -X POST "localhost:8001/stock/mouse/adjust?delta=5" -H "Authorization: Bearer $clerk"   # 200
curl.exe -s -X DELETE localhost:8001/stock/mouse -H "Authorization: Bearer $clerk"            # 403 needs inventory:admin
curl.exe -s localhost:8001/stock -H "X-API-Key: scanner-demo-key"                             # 200 (API key)
```

You can also open http://localhost:8001/docs and paste the token into **Authorize**.

Other tokens you can mint:
- `mint --user <name> --groups ...` for any user and groups
- `mint --app nightly-sync --audience ...` for a service token
- `--expires-in -60` for an expired token

### Testing your service ([example/test_main.py](example/test_main.py))

The tests need no ADFS and no running mock. They point the validator at an in-process mock and mint tokens directly:

```python
mock = MockAdfs(key_file=None)
main.auth.validator = JwtValidator(main.auth.settings, jwks_provider=mock.jwks)
client = TestClient(main.app)

token = mock.mint(user="dana", groups=["CORP\\Inventory-Clerks"], audience=AUD)
assert client.get("/stock", headers={"Authorization": f"Bearer {token}"}).status_code == 200
```

Run them from `docs/example` with `pytest`. There are 6 tests: one per group type, one for a service token and one for missing credentials.

## 7. Switch to the real ADFS

1. Ask your ADFS admin for the items in the checklist in the [main README](../README.md#adfs-setup-checklist-for-the-ad-admin): an Application Group with a Web API (its identifier is your audience), a client id and secret, and claim rules that send `upn` and `group`.
2. Run the probe:
   ```powershell
   adfs-auth-probe --adfs https://adfs.corp.local --audience urn:example:inventory-api `
       --client-id <id> --username CORP\dana --policy policy.json --expect inventory:read `
       --ca-bundle C:\certs\corp-root.pem
   ```
   It gets a real token and checks it the same way your service will. It compares the token with the mock's and checks it with the library. It ends with **PASS**, **WARN** (differences to look at, such as group values coming as SIDs) or **FAIL** (with the ADFS setting to fix).
3. Paste the `.env` block it prints into your service's `.env`. No code changes are needed.

## Troubleshooting

| response | meaning | fix |
|---|---|---|
| 401 `missing credentials` | no `Authorization` or `X-API-Key` header | send one |
| 401 `wrong audience` | the token is for a different Web API | `ADFS_AUTH_AUDIENCE` must equal the Web API identifier, and the client must request that resource |
| 401 `wrong issuer` | issuer mismatch | use the `iss` value the probe printed (`http://…/adfs/services/trust`) |
| 401 `token expired` | the token is past its lifetime, or the clocks differ | get a new token, or sync server time. 60s leeway is built in |
| 401 `cannot load signing keys` | the service can't reach ADFS | check the URL and network. For TLS errors, set `ADFS_AUTH_CA_BUNDLE` |
| 401 `no identity claim` | the token has no `upn` or `appid` | ADFS admin: add a UPN issuance rule |
| 403 `missing permission: x` | the caller is valid but no policy entry grants `x` | check `/whoami` for the caller's memberships, then fix `policy.json` |
| startup `RuntimeError: routes without ...` | a route has no access declaration | add `require`, `authenticate` or `public` to it |
