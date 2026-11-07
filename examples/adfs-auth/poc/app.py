"""Sample service using the library. Run from src/adfs-auth:

    python -m adfs_auth.mock_adfs serve          # terminal 1: mock ADFS on :9000
    uvicorn poc.app:app --port 8000              # terminal 2 (reads poc/.env.example unless .env exists)
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import Depends, FastAPI, Security
from pydantic import BaseModel

from adfs_auth import AdfsAuth, AuthSettings, Principal

HERE = Path(__file__).parent
if not Path(".env").exists():  # demo convenience: fall back to the example settings
    for line in (HERE / ".env.example").read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

auth = AdfsAuth(AuthSettings.from_env())
app = FastAPI(title="Orders POC")

ORDERS: list[dict] = [{"id": 1, "item": "keyboard"}]


class NewOrder(BaseModel):
    item: str


@app.get("/health", dependencies=[Depends(auth.public)])
def health() -> dict:
    return {"ok": True}


@app.get("/me")
def me(p: Principal = Security(auth.authenticate)) -> dict:  # any authenticated caller
    return p.to_dict()


@app.get("/orders")
def list_orders(p: Principal = Security(auth.require("orders:read"))) -> list[dict]:
    return ORDERS


@app.post("/orders", status_code=201)
def create_order(body: NewOrder, p: Principal = Security(auth.require("orders:write"))) -> dict:
    order = {"id": len(ORDERS) + 1, "item": body.item, "created_by": p.subject}
    ORDERS.append(order)
    return order


auth.verify_routes(app)  # crash at import if a route forgot to declare auth
