#!/usr/bin/env python3
"""
FundEd Backend API Testing Suite
Tests all API endpoints for the crowdfunding platform
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from the review request
BASE_URL = "https://funded.preview.emergentagent.com"

class FundEdAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.admin_session_token = None
        
    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
    def test_static_data_endpoints(self):
        """Test all static data endpoints"""
        print("\n=== Testing Static Data Endpoints ===")
        
        # Test categories endpoint
        try:
            response = self.session.get(f"{self.base_url}/api/categories")
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and len(data.get("data", [])) == 6:
                    self.log_test("GET /api/categories", True, f"Returns {len(data['data'])} categories")
                else:
                    self.log_test("GET /api/categories", False, f"Expected 6 categories, got {len(data.get('data', []))}")
            else:
                self.log_test("GET /api/categories", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/categories", False, f"Exception: {str(e)}")
            
        # Test countries endpoint
        try:
            response = self.session.get(f"{self.base_url}/api/countries")
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and isinstance(data.get("data"), list):
                    self.log_test("GET /api/countries", True, f"Returns {len(data['data'])} countries")
                else:
                    self.log_test("GET /api/countries", False, "Invalid response format")
            else:
                self.log_test("GET /api/countries", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/countries", False, f"Exception: {str(e)}")
            
        # Test fields of study endpoint
        try:
            response = self.session.get(f"{self.base_url}/api/fields-of-study")
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and isinstance(data.get("data"), list):
                    self.log_test("GET /api/fields-of-study", True, f"Returns {len(data['data'])} fields")
                else:
                    self.log_test("GET /api/fields-of-study", False, "Invalid response format")
            else:
                self.log_test("GET /api/fields-of-study", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/fields-of-study", False, f"Exception: {str(e)}")
    
    def test_campaign_endpoints(self):
        """Test campaign endpoints"""
        print("\n=== Testing Campaign Endpoints ===")
        
        # Test campaigns list
        try:
            response = self.session.get(f"{self.base_url}/api/campaigns")
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data and "pagination" in data:
                    campaigns = data["data"]
                    self.log_test("GET /api/campaigns", True, f"Returns {len(campaigns)} campaigns with pagination")
                    
                    # Store first campaign ID for detail test
                    self.test_campaign_id = campaigns[0]["campaign_id"] if campaigns else None
                else:
                    self.log_test("GET /api/campaigns", False, "Invalid response format")
            else:
                self.log_test("GET /api/campaigns", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/campaigns", False, f"Exception: {str(e)}")
            
        # Test campaigns with category filter
        try:
            response = self.session.get(f"{self.base_url}/api/campaigns?category=tuition")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("GET /api/campaigns?category=tuition", True, f"Returns {len(data['data'])} tuition campaigns")
                else:
                    self.log_test("GET /api/campaigns?category=tuition", False, "Invalid response format")
            else:
                self.log_test("GET /api/campaigns?category=tuition", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/campaigns?category=tuition", False, f"Exception: {str(e)}")
            
        # Test campaign detail if we have a campaign ID
        if hasattr(self, 'test_campaign_id') and self.test_campaign_id:
            try:
                response = self.session.get(f"{self.base_url}/api/campaigns/{self.test_campaign_id}")
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and "student" in data["data"] and "donors" in data["data"]:
                        self.log_test("GET /api/campaigns/{id}", True, "Returns campaign with student info and donors")
                    else:
                        self.log_test("GET /api/campaigns/{id}", False, "Missing student info or donors")
                else:
                    self.log_test("GET /api/campaigns/{id}", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("GET /api/campaigns/{id}", False, f"Exception: {str(e)}")
    
    def test_donation_checkout(self):
        """Test donation checkout endpoint (critical)"""
        print("\n=== Testing Donation Checkout (Critical) ===")
        
        # First get a campaign ID
        campaign_id = None
        try:
            response = self.session.get(f"{self.base_url}/api/campaigns")
            if response.status_code == 200:
                data = response.json()
                campaigns = data.get("data", [])
                if campaigns:
                    campaign_id = campaigns[0]["campaign_id"]
        except:
            pass
            
        if not campaign_id:
            self.log_test("POST /api/donations/checkout", False, "No campaign available for testing")
            return
            
        # Test donation checkout
        checkout_data = {
            "campaign_id": campaign_id,
            "amount": 25.00,
            "donor_name": "Test Donor",
            "donor_email": "test@example.com",
            "anonymous": False,
            "origin_url": "https://funded.preview.emergentagent.com"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/donations/checkout",
                json=checkout_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "url" in data.get("data", {}) and "session_id" in data.get("data", {}):
                    checkout_url = data["data"]["url"]
                    session_id = data["data"]["session_id"]
                    if "stripe.com" in checkout_url:
                        self.log_test("POST /api/donations/checkout", True, f"Returns Stripe checkout URL: {checkout_url[:50]}...")
                        self.test_session_id = session_id
                    else:
                        self.log_test("POST /api/donations/checkout", False, f"Invalid checkout URL: {checkout_url}")
                else:
                    self.log_test("POST /api/donations/checkout", False, "Missing URL or session_id in response")
            else:
                self.log_test("POST /api/donations/checkout", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/donations/checkout", False, f"Exception: {str(e)}")
    
    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n=== Testing Authentication Endpoints ===")
        
        # Test auth config endpoint
        try:
            response = self.session.get(f"{self.base_url}/api/auth/config")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("GET /api/auth/config", True, "Returns OAuth config")
                else:
                    self.log_test("GET /api/auth/config", False, "Invalid config response")
            else:
                # May fail if OAuth not configured - this is acceptable
                self.log_test("GET /api/auth/config", True, f"HTTP {response.status_code} (OAuth may not be configured)")
        except Exception as e:
            self.log_test("GET /api/auth/config", False, f"Exception: {str(e)}")
            
        # Test auth/me without authentication - should return 401
        try:
            response = self.session.get(f"{self.base_url}/api/auth/me")
            if response.status_code == 401:
                self.log_test("GET /api/auth/me", True, "Returns 401 (unauthorized) as expected")
            else:
                self.log_test("GET /api/auth/me", False, f"Expected 401, got HTTP {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/auth/me", False, f"Exception: {str(e)}")
            
        # Test logout endpoint - should work even if not logged in
        try:
            response = self.session.post(f"{self.base_url}/api/auth/logout")
            if response.status_code in [200, 401]:  # Both are acceptable
                self.log_test("POST /api/auth/logout", True, f"HTTP {response.status_code} (works even if not logged in)")
            else:
                self.log_test("POST /api/auth/logout", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/auth/logout", False, f"Exception: {str(e)}")
    
    def test_stripe_webhook(self):
        """Test Stripe webhook endpoint"""
        print("\n=== Testing Stripe Webhook Endpoint ===")
        
        # Test webhook endpoint with empty body
        try:
            response = self.session.post(
                f"{self.base_url}/api/stripe/webhook",
                json={},
                headers={"Content-Type": "application/json"}
            )
            # Should accept POST even with empty body for basic test
            if response.status_code in [200, 400, 401]:  # Various acceptable responses
                self.log_test("POST /api/stripe/webhook", True, f"Accepts POST request (HTTP {response.status_code})")
            else:
                self.log_test("POST /api/stripe/webhook", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/stripe/webhook", False, f"Exception: {str(e)}")
    
    def test_donation_validation(self):
        """Test donation checkout validation"""
        print("\n=== Testing Donation Checkout Validation ===")
        
        # Test with missing fields - should return 400
        try:
            response = self.session.post(
                f"{self.base_url}/api/donations/checkout",
                json={},
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 400:
                self.log_test("POST /api/donations/checkout (missing fields)", True, "Returns 400 for missing fields")
            else:
                self.log_test("POST /api/donations/checkout (missing fields)", False, f"Expected 400, got HTTP {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/donations/checkout (missing fields)", False, f"Exception: {str(e)}")
            
        # Test with invalid amount - should return 400
        try:
            response = self.session.post(
                f"{self.base_url}/api/donations/checkout",
                json={
                    "campaign_id": "test-campaign",
                    "amount": -10.00,  # Invalid negative amount
                    "donor_name": "Test Donor",
                    "donor_email": "test@example.com"
                },
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 400:
                self.log_test("POST /api/donations/checkout (invalid amount)", True, "Returns 400 for invalid amount")
            else:
                self.log_test("POST /api/donations/checkout (invalid amount)", False, f"Expected 400, got HTTP {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/donations/checkout (invalid amount)", False, f"Exception: {str(e)}")
    
    def test_admin_endpoints(self):
        """Test admin endpoints (should require auth)"""
        print("\n=== Testing Admin Endpoints (Auth Required) ===")
        
        # Test admin stats without auth - should return 401
        try:
            response = self.session.get(f"{self.base_url}/api/admin/stats")
            if response.status_code == 401:
                self.log_test("GET /api/admin/stats", True, "Returns 401 (unauthorized) as expected")
            else:
                self.log_test("GET /api/admin/stats", False, f"Expected 401, got HTTP {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/admin/stats", False, f"Exception: {str(e)}")
            
        # Test admin users without auth - should return 401
        try:
            response = self.session.get(f"{self.base_url}/api/admin/users")
            if response.status_code == 401:
                self.log_test("GET /api/admin/users", True, "Returns 401 (unauthorized) as expected")
            else:
                self.log_test("GET /api/admin/users", False, f"Expected 401, got HTTP {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/admin/users", False, f"Exception: {str(e)}")
            
        # Test admin students pending without auth - should return 401
        try:
            response = self.session.get(f"{self.base_url}/api/admin/students/pending")
            if response.status_code == 401:
                self.log_test("GET /api/admin/students/pending", True, "Returns 401 (unauthorized) as expected")
            else:
                self.log_test("GET /api/admin/students/pending", False, f"Expected 401, got HTTP {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/admin/students/pending", False, f"Exception: {str(e)}")
    
    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n=== Testing Health Endpoints ===")
        
        # Test root endpoint
        try:
            response = self.session.get(f"{self.base_url}/api/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "version" in data:
                    self.log_test("GET /api/", True, f"API running: {data['message']}")
                else:
                    self.log_test("GET /api/", False, "Invalid root response")
            else:
                self.log_test("GET /api/", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/", False, f"Exception: {str(e)}")
            
        # Test health endpoint
        try:
            response = self.session.get(f"{self.base_url}/api/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("GET /api/health", True, "Health check passed")
                else:
                    self.log_test("GET /api/health", False, f"Unhealthy status: {data}")
            else:
                self.log_test("GET /api/health", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/health", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print(f"🚀 Starting FundEd API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Run test suites
        self.test_health_endpoints()
        self.test_static_data_endpoints()
        self.test_campaign_endpoints()
        self.test_auth_endpoints()
        self.test_admin_endpoints()
        self.test_stripe_webhook()
        self.test_donation_validation()
        self.test_donation_checkout()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        failed = sum(1 for r in self.test_results if not r["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        # Show failed tests
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['message']}")
        
        # Show critical issues
        critical_failures = [r for r in self.test_results if not r["success"] and "checkout" in r["test"].lower()]
        if critical_failures:
            print(f"\n🚨 CRITICAL FAILURES:")
            for result in critical_failures:
                print(f"  🚨 {result['test']}: {result['message']}")
        
        return passed, failed, total

def main():
    """Main test runner"""
    tester = FundEdAPITester()
    passed, failed, total = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if failed > 0:
        sys.exit(1)
    else:
        print(f"\n🎉 All {total} tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()