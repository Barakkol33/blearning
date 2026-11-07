"""inventory-service: the smallest realistic service using adfs_auth.

Run (from docs/example, with .env copied from .env.example):
    uvicorn main:app --port 8001
"""

from fastapi import Depends, FastAPI, HTTPException, Security

from adfs_auth import AdfsAuth, AuthSettings, Principal

# 1. one AdfsAuth per service, configured from ADFS_AUTH_* env vars / .env
auth = AdfsAuth(AuthSettings.from_env())

app = FastAPI(title="Inventory service")

STOCK = {"keyboard": 10, "mouse": 25}


# 2. every route declares what it needs
@app.get("/health", dependencies=[Depends(auth.public)])
def health():
    return {"ok": True}


@app.get("/whoami")
def whoami(caller: Principal = Security(auth.authenticate)):  # any valid caller
    return caller.to_dict()


@app.get("/stock")
def list_stock(caller: Principal = Security(auth.require("inventory:read"))):
    return STOCK


@app.post("/stock/{item}/adjust")
def adjust(item: str, delta: int, caller: Principal = Security(auth.require("inventory:write"))):
    if item not in STOCK:
        raise HTTPException(404, "no such item")
    STOCK[item] += delta
    return {"item": item, "count": STOCK[item], "by": caller.subject}


@app.delete("/stock/{item}")
def remove(item: str, caller: Principal = Security(auth.require("inventory:admin"))):
    STOCK.pop(item, None)
    return {"removed": item, "by": caller.subject}


# 3. deny by default: refuse to start if a route above forgot its declaration
auth.verify_routes(app)
