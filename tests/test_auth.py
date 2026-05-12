def test_register_first_user_is_principal(client):
    res = client.post("/auth/register", json={"name":"Peter","email":"peter@pistos.test","password":"securepass1"})
    assert res.status_code == 201
    assert res.get_json()["role"] == "principal"

def test_register_second_user_is_member(client):
    client.post("/auth/register", json={"name":"Peter","email":"p@t.com","password":"securepass1"})
    res = client.post("/auth/register", json={"name":"Wife","email":"wife@t.com","password":"securepass1"})
    assert res.get_json()["role"] == "member"

def test_register_requires_8char_password(client):
    res = client.post("/auth/register", json={"name":"X","email":"x@x.com","password":"short"})
    assert res.status_code == 400
    assert any("8" in e for e in res.get_json()["errors"])

def test_register_requires_valid_email(client):
    res = client.post("/auth/register", json={"name":"X","email":"notanemail","password":"securepass1"})
    assert res.status_code == 400

def test_login_invalid_credentials(client):
    res = client.post("/auth/login", json={"email":"nobody@x.com","password":"wrongpass"})
    assert res.status_code == 401

def test_me_requires_auth(client):
    res = client.get("/auth/me")
    assert res.status_code == 401

def test_login_and_me(client):
    client.post("/auth/register", json={"name":"Pete","email":"pete@me.com","password":"securepass1"})
    client.post("/auth/login", json={"email":"pete@me.com","password":"securepass1"})
    res = client.get("/auth/me")
    assert res.status_code == 200
    assert res.get_json()["email"] == "pete@me.com"
