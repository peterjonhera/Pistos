def _login(client):
    client.post("/auth/register", json={"name":"Peter","email":"txn@test.com","password":"securepass1"})
    client.post("/auth/login", json={"email":"txn@test.com","password":"securepass1"})

def test_add_income(client):
    _login(client)
    res = client.post("/api/transactions/", json={
        "type":"income","description":"Oil Change Zim","amount":320,"currency":"USD","date":"2026-05-10"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["amount"] == 320
    assert data["tithe_base"] == 320

def test_transport_allowance_excluded_from_tithe_base(client):
    _login(client)
    res = client.post("/api/transactions/", json={
        "type":"income","description":"Transport allowance","amount":50,
        "currency":"USD","date":"2026-05-10","is_transport_allowance":True
    })
    assert res.status_code == 201
    assert res.get_json()["tithe_base"] == 0.0

def test_parts_sale_net_profit_only(client):
    _login(client)
    res = client.post("/api/transactions/", json={
        "type":"income","description":"Parts sale","amount":200,
        "currency":"USD","date":"2026-05-10",
        "is_parts_sale":True,"parts_cost":120
    })
    assert res.status_code == 201
    assert res.get_json()["tithe_base"] == 80.0

def test_negative_amount_rejected(client):
    _login(client)
    res = client.post("/api/transactions/", json={
        "type":"income","description":"Bad","amount":-50,"currency":"USD","date":"2026-05-10"
    })
    assert res.status_code == 400

def test_invalid_currency_rejected(client):
    _login(client)
    res = client.post("/api/transactions/", json={
        "type":"income","description":"Bad","amount":100,"currency":"EUR","date":"2026-05-10"
    })
    assert res.status_code == 400

def test_usd_and_zwg_separate(client):
    _login(client)
    client.post("/api/transactions/", json={"type":"income","description":"USD income","amount":300,"currency":"USD","date":"2026-05-10"})
    client.post("/api/transactions/", json={"type":"income","description":"ZWG income","amount":5000,"currency":"ZWG","date":"2026-05-10"})
    usd = client.get("/api/transactions/summary?currency=USD").get_json()
    zwg = client.get("/api/transactions/summary?currency=ZWG").get_json()
    assert usd["total_income"] == 300
    assert zwg["total_income"] == 5000
