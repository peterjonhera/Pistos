def _login(client):
    client.post("/auth/register", json={"name":"Peter","email":"goals@test.com","password":"securepass1"})
    client.post("/auth/login", json={"email":"goals@test.com","password":"securepass1"})

def test_add_goal(client):
    _login(client)
    res = client.post("/api/goals/", json={"name":"Emergency Fund","target":1000,"currency":"USD"})
    assert res.status_code == 201
    assert res.get_json()["progress"] == 0

def test_contribute_to_goal(client):
    _login(client)
    goal_id = client.post("/api/goals/", json={"name":"Car Fund","target":400,"currency":"USD"}).get_json()["id"]
    res = client.post(f"/api/goals/{goal_id}/contribute", json={"amount":200})
    assert res.status_code == 200
    assert res.get_json()["progress"] == 50

def test_goal_requires_positive_target(client):
    _login(client)
    res = client.post("/api/goals/", json={"name":"Bad","target":-100})
    assert res.status_code == 400

def test_goal_requires_name(client):
    _login(client)
    res = client.post("/api/goals/", json={"target":500})
    assert res.status_code == 400
