#!/usr/bin/env python3
"""
FundEd Admin API Testing
Tests admin endpoints with proper authentication
"""

import requests
import json

BASE_URL = "https://studentsupport-10.preview.emergentagent.com"
ADMIN_SESSION_TOKEN = "test_admin_session_1767720231580"

def test_admin_endpoints():
    """Test admin endpoints with authentication"""
    print("🔐 Testing Admin Endpoints with Authentication")
    print("=" * 50)
    
    session = requests.Session()
    
    # Test admin stats endpoint
    try:
        # Try with Authorization header
        headers = {"Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"}
        response = session.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        
        print(f"Admin Stats Response Status: {response.status_code}")
        print(f"Admin Stats Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "users" in data.get("data", {}):
                print("✅ PASS GET /api/admin/stats: Returns platform statistics")
                stats = data["data"]
                print(f"   Users: {stats.get('users', {})}")
                print(f"   Campaigns: {stats.get('campaigns', {})}")
                print(f"   Donations: {stats.get('donations', {})}")
            else:
                print("❌ FAIL GET /api/admin/stats: Invalid stats response format")
        else:
            print(f"❌ FAIL GET /api/admin/stats: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ FAIL GET /api/admin/stats: Exception: {str(e)}")
    
    # Test with cookie authentication (alternative)
    try:
        print("\n🍪 Testing with Cookie Authentication")
        session.cookies.set('session_token', ADMIN_SESSION_TOKEN)
        response = session.get(f"{BASE_URL}/api/admin/stats")
        
        print(f"Cookie Auth Response Status: {response.status_code}")
        print(f"Cookie Auth Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ PASS Cookie Authentication: Admin stats accessible")
            else:
                print("❌ FAIL Cookie Authentication: Invalid response")
        else:
            print(f"❌ FAIL Cookie Authentication: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ FAIL Cookie Authentication: Exception: {str(e)}")

if __name__ == "__main__":
    test_admin_endpoints()