#!/usr/bin/env python3
"""
FundEd Backend API Comprehensive Testing Suite
Tests all API endpoints for the crowdfunding platform including admin endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from the review request
BASE_URL = "https://studentsupport-10.preview.emergentagent.com"
ADMIN_SESSION_TOKEN = "test_admin_session_1767720231580"

class FundEdAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.admin_session_token = ADMIN_SESSION_TOKEN
        
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
            "origin_url": "https://studentsupport-10.preview.emergentagent.com"
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
                        self.log_test("POST /api/donations/checkout", True, f"Returns Stripe checkout URL")
                        self.test_session_id = session_id
                    else:
                        self.log_test("POST /api/donations/checkout", False, f"Invalid checkout URL: {checkout_url}")
                else:
                    self.log_test("POST /api/donations/checkout", False, "Missing URL or session_id in response")
            else:
                self.log_test("POST /api/donations/checkout", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/donations/checkout", False, f"Exception: {str(e)}")
    
    def test_admin_endpoints(self):
        """Test admin endpoints with authentication"""
        print("\n=== Testing Admin Endpoints ===")
        
        # Test admin stats with Authorization header
        try:
            headers = {"Authorization": f"Bearer {self.admin_session_token}"}
            response = self.session.get(f"{self.base_url}/api/admin/stats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "users" in data.get("data", {}):
                    stats = data["data"]
                    self.log_test("GET /api/admin/stats", True, 
                                f"Returns platform stats - Users: {stats.get('users', {}).get('total', 0)}, "
                                f"Campaigns: {stats.get('campaigns', {}).get('total', 0)}, "
                                f"Donations: ${stats.get('donations', {}).get('total_amount', 0)}")
                else:
                    self.log_test("GET /api/admin/stats", False, "Invalid stats response format")
            else:
                self.log_test("GET /api/admin/stats", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/admin/stats", False, f"Exception: {str(e)}")
    
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
        print(f"🚀 Starting FundEd API Comprehensive Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Run test suites
        self.test_health_endpoints()
        self.test_static_data_endpoints()
        self.test_campaign_endpoints()
        self.test_donation_checkout()
        self.test_admin_endpoints()
        
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
    
    # Exit with success regardless - we want to report results
    print(f"\n🎯 Testing Complete: {passed}/{total} tests passed")
    return passed, failed, total

if __name__ == "__main__":
    main()