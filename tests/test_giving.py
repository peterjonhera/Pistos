def _login(client):
    client.post("/auth/register", json={"name":"Peter","email":"giving@test.com","password":"securepass1"})
    client.post("/auth/login", json={"email":"giving@test.com","password":"securepass1"})

def test_tithe_is_10_percent_of_eligible(client):
    _login(client)
    client.post("/api/transactions/", json={"type":"income","description":"Income","amount":500,"currency":"USD","date":"2026-05-12"})
    res = client.get("/api/giving/reconciliation")
    assert res.status_code == 200
    data = res.get_json()
    assert data["USD"]["tithe"] == 50.0

def test_max_offering_is_15_percent(client):
    _login(client)
    client.post("/api/transactions/", json={"type":"income","description":"Income","amount":500,"currency":"USD","date":"2026-05-12"})
    data = client.get("/api/giving/reconciliation").get_json()
    assert data["USD"]["max_offering"] == 75.0

def test_transport_excluded_from_reconciliation(client):
    _login(client)
    client.post("/api/transactions/", json={"type":"income","description":"Income","amount":400,"currency":"USD","date":"2026-05-12"})
    client.post("/api/transactions/", json={"type":"income","description":"Transport","amount":100,"currency":"USD","date":"2026-05-12","is_transport_allowance":True})
    data = client.get("/api/giving/reconciliation").get_json()
    # Only $400 eligible, not $500
    assert data["USD"]["income_eligible"] == 400.0
    assert data["USD"]["tithe"] == 40.0

def test_reconciliation_has_week_dates(client):
    _login(client)
    data = client.get("/api/giving/reconciliation").get_json()
    assert "week_start" in data
    assert "week_ending" in data

def test_reconciliation_includes_kjv_verse(client):
    _login(client)
    data = client.get("/api/giving/reconciliation").get_json()
    assert "KJV" in data["verse"]
