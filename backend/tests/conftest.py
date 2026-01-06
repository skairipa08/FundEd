import pytest
import os

# Set test environment before importing app
os.environ["ENVIRONMENT"] = "test"
os.environ["MONGO_URL"] = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
os.environ["DB_NAME"] = "funded_test"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
