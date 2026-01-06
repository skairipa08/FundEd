import pytest


@pytest.mark.asyncio
async def test_health_check(test_client):
    """Test health check endpoint."""
    response = await test_client.get("/api/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "FundEd API is running"
    assert "version" in data


@pytest.mark.asyncio
async def test_health_endpoint(test_client):
    """Test detailed health endpoint."""
    response = await test_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data


@pytest.mark.asyncio
async def test_categories(test_client):
    """Test categories endpoint."""
    response = await test_client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 6
    
    categories = [c["id"] for c in data["data"]]
    assert "tuition" in categories
    assert "books" in categories


@pytest.mark.asyncio
async def test_countries(test_client):
    """Test countries endpoint."""
    response = await test_client.get("/api/countries")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0


@pytest.mark.asyncio
async def test_fields_of_study(test_client):
    """Test fields of study endpoint."""
    response = await test_client.get("/api/fields-of-study")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0


@pytest.mark.asyncio
async def test_campaigns_list_empty(test_client):
    """Test campaigns list when empty."""
    response = await test_client.get("/api/campaigns")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert "pagination" in data


@pytest.mark.asyncio
async def test_auth_config_without_google_creds(test_client):
    """Test auth config endpoint without Google credentials."""
    response = await test_client.get("/api/auth/config")
    # Should return 503 if not configured
    assert response.status_code == 503


@pytest.mark.asyncio
async def test_auth_me_unauthenticated(test_client):
    """Test auth/me without authentication."""
    response = await test_client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_campaign_not_found(test_client):
    """Test getting a non-existent campaign."""
    response = await test_client.get("/api/campaigns/nonexistent123")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_donation_checkout_missing_fields(test_client):
    """Test donation checkout with missing required fields."""
    response = await test_client.post(
        "/api/donations/checkout",
        json={}
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_admin_endpoints_require_auth(test_client):
    """Test that admin endpoints require authentication."""
    response = await test_client.get("/api/admin/stats")
    assert response.status_code == 401
    
    response = await test_client.get("/api/admin/students/pending")
    assert response.status_code == 401
