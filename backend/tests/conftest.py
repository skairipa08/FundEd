import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Set test environment
os.environ["ENVIRONMENT"] = "test"
os.environ["MONGO_URL"] = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
os.environ["DB_NAME"] = "funded_test"

from server import app, db


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_client():
    """Create async test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client


@pytest.fixture(autouse=True)
async def cleanup_db():
    """Clean up test database before each test."""
    yield
    # Cleanup after test
    await db.users.delete_many({})
    await db.campaigns.delete_many({})
    await db.donations.delete_many({})
    await db.user_sessions.delete_many({})
    await db.student_profiles.delete_many({})
    await db.payment_transactions.delete_many({})
