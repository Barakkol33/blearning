"""adfs-auth-probe: point it at the REAL ADFS and it tells you whether the library (and the POC, which
was built against the mock) will work there, and which settings to use.

It checks, step by step:
  1. discovery document reachable (TLS / internal CA OK)
  2. signing keys (JWKS) reachable and usable
  3. a real access token can be obtained (or you paste one)
  4. the token has what the library needs: RS256, known kid, issuer, audience, identity claim, groups
  5. the token's shape matches the mock's (same claim names / value types for the claims we use)
  6. the library itself validates it and maps it to permissions with your policy file
and prints a ready-to-use .env block.

Examples
  # service token (client credentials) - needs an ADFS "Server application" + "Web API" in an app group
  adfs-auth-probe --adfs https://adfs.corp.local --audience urn:orders-api \
      --client-id <id> --client-secret <secret> --ca-bundle corp-root.pem

  # user token (password grant / ROPC) - shows the group claims your claim rules emit
  adfs-auth-probe --adfs https://adfs.corp.local --audience urn:orders-api \
      --client-id <id> --client-secret <secret> --username CORP\\alice --password ...

  # or paste a token you got elsewhere (e.g. from the browser / Postman)
  adfs-auth-probe --adfs https://adfs.corp.local --audience urn:orders-api --token-file token.txt

  # dry run against the mock:   python -m adfs_auth.mock_adfs serve   then
  adfs-auth-probe --adfs http://localhost:9000 --audience urn:poc:orders-api --client-id poc-client \
      --client-secret poc-secret --username bob --password Passw0rd! --policy poc/policy.json --expect orders:write
"""

from __future__ import annotations

import argparse
import getpass
import json
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import jwt

from .config import AuthSettings
from .jwt_validator import JwtValidator, TokenError

# ANSI colours only when attached to a terminal
_TTY = sys.stdout.isatty()


def _c(code: str, s: str) -> str:
    return f"\033[{code}m{s}\033[0m" if _TTY else s


class Report:
    def __init__(self) -> None:
        self.fails = 0
        self.warns = 0

    def ok(self, msg: str) -> None:
        print(f"  {_c('32', '[PASS]')} {msg}")

    def warn(self, msg: str) -> None:
        self.warns += 1
        print(f"  {_c('33', '[WARN]')} {msg}")

    def fail(self, msg: str) -> None:
        self.fails += 1
        print(f"  {_c('31', '[FAIL]')} {msg}")

    def info(self, msg: str) -> None:
        print(f"         {msg}")

    @staticmethod
    def step(title: str) -> None:
        print(f"\n{_c('1', title)}")


# -- HTTP helpers ----------------------------------------------------------------
def _ctx(args: argparse.Namespace) -> ssl.SSLContext:
    if args.insecure:
        return ssl._create_unverified_context()  # noqa: S323 - explicit opt-in, reported as WARN
    return ssl.create_default_context(cafile=args.ca_bundle)


def _get_json(url: str, ctx: ssl.SSLContext) -> dict[str, Any]:
    with urllib.request.urlopen(url, timeout=10, context=ctx) as r:  # noqa: S310
        return json.loads(r.read())


def _post_form(url: str, form: dict[str, str], ctx: ssl.SSLContext) -> tuple[int, dict[str, Any]]:
    data = urllib.parse.urlencode(form).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as r:  # noqa: S310
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(body)
        except ValueError:
            return e.code, {"error": body[:300]}


def _explain_url_error(exc: Exception) -> str:
    text = str(exc)
    if "CERTIFICATE_VERIFY_FAILED" in text:
        return text + "  -> pass --ca-bundle <your internal root CA .pem> (or --insecure just to look)"
    return text


# -- token shape vs the mock -------------------------------------------------------
def _kind(v: Any) -> str:
    return "list" if isinstance(v, list) else type(v).__name__


def _compare_with_mock(claims: dict[str, Any], settings: AuthSettings, rep: Report) -> None:
    from .mock_adfs import MockAdfs  # local import: probe works even if someone strips the mock

    is_user = any(c in claims for c in ("upn", "unique_name"))
    mock = MockAdfs(key_file=None)
    mock_token = mock.mint(user="bob") if is_user else mock.mint(app="poc-client")
    mock_claims = jwt.decode(mock_token, options={"verify_signature": False})
    used = set(settings.subject_claims) | set(settings.membership_claims) | {"iss", "aud", "exp", "nbf"}
    if settings.scope_claim:
        used.add(settings.scope_claim)

    for c in sorted(used):
        in_real, in_mock = c in claims, c in mock_claims
        if in_real and in_mock:
            rk, mk = _kind(claims[c]), _kind(mock_claims[c])
            same = rk == mk or {rk, mk} <= {"str", "list"} and c in settings.membership_claims
            (rep.ok if same else rep.warn)(f"claim {c!r}: real={rk} mock={mk}")
        elif in_mock and not in_real:
            if c in settings.membership_claims:
                rep.warn(f"mock sends {c!r} but the real token does not -> ask the ADFS admin for a claim rule, "
                         f"or change ADFS_AUTH_MEMBERSHIP_CLAIMS")
            elif c in settings.subject_claims and c != next((s for s in settings.subject_claims if s in claims), None):
                rep.info(f"mock sends {c!r}, real token does not (fine: another identity claim is used)")
            else:
                rep.info(f"mock sends {c!r}, real token does not")
        elif in_real and not in_mock:
            rep.info(f"real token has {c!r} which the mock does not send")
    extra = sorted(set(claims) - set(mock_claims))
    if extra:
        rep.info("other claims only in the real token (not used by the library): " + ", ".join(extra))
    # value format of groups (DOMAIN\\name vs SID vs plain name) matters for the policy file
    for c in settings.membership_claims:
        if c in claims:
            v = claims[c]
            sample = (v if isinstance(v, list) else [v])[:3]
            fmt = "SID" if all(str(s).startswith("S-1-") for s in sample) else (
                "DOMAIN\\name" if all("\\" in str(s) for s in sample) else "plain name")
            mock_fmt = "DOMAIN\\name"
            (rep.ok if fmt == mock_fmt else rep.warn)(
                f"{c!r} values look like {fmt} (mock uses {mock_fmt}) e.g. {sample} - write policy keys in this form")


# -- main -----------------------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="adfs-auth-probe", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--adfs", required=True, help="ADFS base URL, e.g. https://adfs.corp.local")
    p.add_argument("--audience", required=True, help="Web API identifier (relying party / resource)")
    p.add_argument("--ca-bundle", help="PEM of your internal root CA")
    p.add_argument("--insecure", action="store_true", help="skip TLS verification (diagnosis only)")
    src = p.add_argument_group("token source (pick one)")
    src.add_argument("--token")
    src.add_argument("--token-file")
    src.add_argument("--client-id")
    src.add_argument("--client-secret", help="omit to be prompted")
    src.add_argument("--username", help="with --client-id: password grant -> user token with groups")
    src.add_argument("--password", help="omit to be prompted")
    p.add_argument("--policy", help="policy JSON (group_permissions / subject_permissions / api_keys)")
    p.add_argument("--expect", action="append", default=[], help="permission the caller should end up with")
    p.add_argument("--show-token", action="store_true", help="print all decoded claims")
    a = p.parse_args(argv)

    rep = Report()
    base = a.adfs.rstrip("/")
    ctx = _ctx(a)
    print(f"Probing {base} for audience {a.audience!r}")
    if a.insecure:
        rep.warn("TLS verification disabled (--insecure); services must use a CA bundle")

    # 1. discovery -------------------------------------------------------------
    rep.step("1. Discovery document")
    disc_url = f"{base}/adfs/.well-known/openid-configuration"
    try:
        disc = _get_json(disc_url, ctx)
        rep.ok(f"GET {disc_url}")
    except Exception as exc:  # noqa: BLE001
        rep.fail(f"GET {disc_url}: {_explain_url_error(exc)}")
        rep.info("ADFS 2016+ with OpenID Connect is required (ADFS 3.0/2012R2 has no discovery/JWKS)")
        return _finish(rep)
    access_iss = disc.get("access_token_issuer")
    rep.info(f"issuer={disc.get('issuer')}  access_token_issuer={access_iss}")
    rep.info(f"token_endpoint={disc.get('token_endpoint')}  jwks_uri={disc.get('jwks_uri')}")

    # 2. jwks ------------------------------------------------------------------
    rep.step("2. Signing keys (JWKS)")
    jwks_url = disc.get("jwks_uri") or f"{base}/adfs/discovery/keys"
    try:
        jwks = _get_json(jwks_url, ctx)
        keys = jwks.get("keys", [])
        kids = [k.get("kid") for k in keys]
        if keys and all(k.get("kty") == "RSA" for k in keys):
            rep.ok(f"{len(keys)} RSA key(s), kid(s): {kids}")
        else:
            rep.fail(f"unexpected JWKS content: {kids}")
    except Exception as exc:  # noqa: BLE001
        rep.fail(f"GET {jwks_url}: {_explain_url_error(exc)}")
        return _finish(rep)

    # 3. token -------------------------------------------------------------------
    rep.step("3. Access token")
    token = a.token
    if a.token_file:
        token = open(a.token_file, encoding="utf-8").read().strip()
    if not token and a.client_id:
        secret = a.client_secret if a.client_secret is not None else getpass.getpass("client secret: ")
        form = {"client_id": a.client_id, "client_secret": secret, "resource": a.audience}
        if a.username:
            pwd = a.password if a.password is not None else getpass.getpass(f"password for {a.username}: ")
            form.update(grant_type="password", username=a.username, password=pwd, scope="openid")
        else:
            form["grant_type"] = "client_credentials"
        code, body = _post_form(disc.get("token_endpoint", f"{base}/adfs/oauth2/token"), form, ctx)
        if code == 200 and "access_token" in body:
            token = body["access_token"]
            rep.ok(f"{form['grant_type']} grant returned a token")
        else:
            rep.fail(f"token endpoint said {code}: {body.get('error')} {body.get('error_description', '')}")
            rep.info("check: app group has a Server application (client id/secret) AND a Web API whose identifier "
                     "equals --audience, and the client is granted access to it (Client permissions / "
                     "Grant-AdfsApplicationPermission)")
            return _finish(rep)
    if not token:
        rep.fail("no token: pass --token/--token-file or --client-id")
        return _finish(rep)

    # 4. inspect -------------------------------------------------------------------
    rep.step("4. Token contents")
    try:
        header = jwt.get_unverified_header(token)
        claims = jwt.decode(token, options={"verify_signature": False})
    except jwt.PyJWTError as exc:
        rep.fail(f"not a JWT ({exc}). ADFS returns JWT access tokens only for OAuth/OIDC apps, not WS-Fed/SAML")
        return _finish(rep)
    if a.show_token:
        print(json.dumps({"header": header, "claims": claims}, indent=2, ensure_ascii=False))

    (rep.ok if header.get("alg") == "RS256" else rep.fail)(f"alg={header.get('alg')}")
    kid = header.get("kid") or header.get("x5t")
    (rep.ok if kid in kids else rep.fail)(f"kid {kid} {'found' if kid in kids else 'NOT found'} in JWKS")
    iss = claims.get("iss")
    if iss == access_iss:
        rep.ok(f"iss={iss} (matches discovery access_token_issuer)")
    else:
        rep.warn(f"iss={iss} differs from discovery access_token_issuer={access_iss}; using the token's value")
    auds = claims.get("aud") if isinstance(claims.get("aud"), list) else [claims.get("aud")]
    (rep.ok if a.audience in auds else rep.fail)(f"aud={claims.get('aud')} (expected {a.audience})")
    left = int(claims.get("exp", 0) - time.time())
    (rep.ok if left > 0 else rep.fail)(f"expires in {left}s")

    settings = AuthSettings(audience=[a.audience], issuers=[iss or access_iss or ""], jwks_url=jwks_url,
                            ca_bundle=a.ca_bundle)
    if a.policy:
        settings.load_policy(a.policy)
    subj_claim = next((c for c in settings.subject_claims if claims.get(c)), None)
    (rep.ok if subj_claim else rep.fail)(
        f"identity claim: {subj_claim}={claims.get(subj_claim)!r}" if subj_claim
        else f"no identity claim among {settings.subject_claims} -> add an issuance rule for UPN")
    mem = [c for c in settings.membership_claims if c in claims]
    if mem:
        rep.ok("membership claim(s): " + ", ".join(f"{c} ({_kind(claims[c])})" for c in mem))
    elif subj_claim in ("appid", "client_id"):
        rep.info("service token without groups (normal) - grant permissions via subject_permissions"
                 f"[{claims.get(subj_claim)!r}] in the policy")
    else:
        rep.warn("user token has no group/role claim -> ADFS admin: add an issuance transform rule "
                 "'Send LDAP attributes' Token-Groups - Qualified by Domain Name -> Group (or role)")

    # 5. mock comparison -----------------------------------------------------------
    rep.step("5. Shape compared with the mock used by the POC")
    _compare_with_mock(claims, settings, rep)

    # 6. the library itself ----------------------------------------------------------
    rep.step("6. Library validation (adfs_auth.JwtValidator)")
    try:
        def provider() -> dict[str, Any]:
            return _get_json(jwks_url, ctx)

        principal = JwtValidator(settings, jwks_provider=provider).authenticate(token)
        rep.ok(f"valid -> subject={principal.subject!r}")
        rep.info(f"memberships={sorted(principal.memberships)}")
        rep.info(f"permissions={sorted(principal.permissions)}" + ("" if a.policy else "  (no --policy given)"))
        for perm in a.expect:
            (rep.ok if principal.has(perm) else rep.fail)(f"has permission {perm!r}")
    except TokenError as exc:
        rep.fail(f"library rejected the token: {exc}")

    # .env suggestion --------------------------------------------------------------------
    rep.step("Suggested service settings (.env)")
    lines = [
        f"ADFS_AUTH_AUDIENCE={a.audience}",
        f"ADFS_AUTH_ISSUERS={iss}",
        f"ADFS_AUTH_JWKS_URL={jwks_url}",
    ]
    if a.ca_bundle:
        lines.append(f"ADFS_AUTH_CA_BUNDLE={a.ca_bundle}")
    if mem and mem != settings.membership_claims[: len(mem)]:
        lines.append(f"ADFS_AUTH_MEMBERSHIP_CLAIMS={','.join(mem)}")
    if a.policy:
        lines.append(f"ADFS_AUTH_POLICY_FILE={a.policy}")
    print("\n".join("  " + x for x in lines))
    return _finish(rep)


def _finish(rep: Report) -> int:
    print()
    if rep.fails:
        print(_c("31", f"RESULT: {rep.fails} failure(s), {rep.warns} warning(s) - the POC will not work as-is"))
        return 1
    if rep.warns:
        print(_c("33", f"RESULT: works, with {rep.warns} warning(s) to review"))
        return 0
    print(_c("32", "RESULT: real ADFS matches the mock - the POC setup will work"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
