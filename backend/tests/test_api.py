"""
Simple API tests using requests library.
These tests run against a live server.
"""
import requests
import os

BASE_URL = os.environ.get("TEST_API_URL", "http://localhost:8001")


def test_health_check():
    """Test health check endpoint."""
    response = requests.get(f"{BASE_URL}/api/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "FundEd API is running"


def test_health_endpoint():
    """Test detailed health endpoint."""
    response = requests.get(f"{BASE_URL}/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_categories():
    """Test categories endpoint."""
    response = requests.get(f"{BASE_URL}/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 6


def test_countries():
    """Test countries endpoint."""
    response = requests.get(f"{BASE_URL}/api/countries")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_fields_of_study():
    """Test fields of study endpoint."""
    response = requests.get(f"{BASE_URL}/api/fields-of-study")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_campaigns_list():
    """Test campaigns list."""
    response = requests.get(f"{BASE_URL}/api/campaigns")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "pagination" in data


def test_auth_me_unauthenticated():
    """Test auth/me without authentication."""
    response = requests.get(f"{BASE_URL}/api/auth/me")
    assert response.status_code == 401


def test_campaign_not_found():
    """Test getting a non-existent campaign."""
    response = requests.get(f"{BASE_URL}/api/campaigns/nonexistent123")
    assert response.status_code == 404


def test_donation_checkout_missing_fields():
    """Test donation checkout with missing required fields."""
    response = requests.post(
        f"{BASE_URL}/api/donations/checkout",
        json={}
    )
    assert response.status_code == 400


def test_admin_endpoints_require_auth():
    """Test that admin endpoints require authentication."""
    response = requests.get(f"{BASE_URL}/api/admin/stats")
    assert response.status_code == 401


if __name__ == "__main__":
    import sys
    
    tests = [
        test_health_check,
        test_health_endpoint,
        test_categories,
        test_countries,
        test_fields_of_study,
        test_campaigns_list,
        test_auth_me_unauthenticated,
        test_campaign_not_found,
        test_donation_checkout_missing_fields,
        test_admin_endpoints_require_auth,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            print(f"✓ {test.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"✗ {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test.__name__}: {type(e).__name__}: {e}")
            failed += 1
    
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)
