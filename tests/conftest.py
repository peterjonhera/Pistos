import pytest
from app import create_app, db as _db
import os

os.environ.setdefault("FLASK_ENV", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")

@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config.update({"TESTING": True})
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()

@pytest.fixture(autouse=True)
def clean_db(app):
    """Roll back all DB changes after every test — fixes data accumulation."""
    with app.app_context():
        yield
        _db.session.remove()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()

@pytest.fixture
def client(app):
    return app.test_client()
