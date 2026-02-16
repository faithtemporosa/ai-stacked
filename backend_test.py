#!/usr/bin/env python3
"""
AdsPower Automation Backend API Tests
Tests all backend endpoints for the AdsPower automation dashboard
"""

import requests
import sys
import json
from datetime import datetime
from urllib.parse import quote

class AdsPowerAPITester:
    def __init__(self, base_url="https://profile-reports-sync.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_profile_id = f"test_{datetime.now().strftime('%H%M%S')}"

    def run_test(self, name, method, endpoint, expected_status=200, data=None, expect_json=True):
        """Run a single API test"""
        url = f"{self.api_base}/{endpoint}" if not endpoint.startswith('http') else endpoint
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if expect_json:
                    try:
                        response_data = response.json()
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                        return success, response_data
                    except:
                        return success, response.text
                return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Error: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_api(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        if success and isinstance(response, dict):
            expected_message = "AdsPower Automation API"
            if response.get("message") == expected_message:
                print(f"✅ Correct message returned: {response.get('message')}")
                return True
            else:
                print(f"❌ Unexpected message: {response.get('message')}")
        return False

    def test_get_sheets(self):
        """Test getting list of sheets"""
        success, response = self.run_test(
            "Get Sheets List",
            "GET",
            "sheets",
            200
        )
        if success and isinstance(response, dict):
            sheets = response.get("sheets", [])
            expected_sheets = ["Bump Connect", "Bump Syndicate", "Kollabsy"]
            if all(sheet in sheets for sheet in expected_sheets):
                print(f"✅ All expected sheets found: {sheets}")
                return True, sheets
            else:
                print(f"❌ Missing expected sheets. Got: {sheets}")
        return False, []

    def test_get_sheet_comments(self, sheet_name="Bump Connect"):
        """Test getting comments from a specific sheet"""
        encoded_sheet = quote(sheet_name)
        success, response = self.run_test(
            f"Get {sheet_name} Comments",
            "GET",
            f"sheets/{encoded_sheet}/comments",
            200
        )
        if success and isinstance(response, dict):
            if "comments" in response and "count" in response:
                comments_count = response.get("count", 0)
                print(f"✅ Found {comments_count} comments from {sheet_name}")
                return True, response.get("comments", [])
            else:
                print(f"❌ Invalid response format: {response}")
        return False, []

    def test_create_profile(self):
        """Test creating a new profile"""
        profile_data = {
            "profile_id": self.test_profile_id,
            "profile_name": f"Test Profile {self.test_profile_id}",
            "sheet_name": "Bump Connect"
        }
        
        success, response = self.run_test(
            "Create Profile",
            "POST",
            "profiles",
            200,
            data=profile_data
        )
        
        if success and isinstance(response, dict):
            if response.get("profile_id") == self.test_profile_id:
                print(f"✅ Profile created successfully: {response.get('profile_name')}")
                return True, response
            else:
                print(f"❌ Profile creation failed or incorrect data returned")
        return False, {}

    def test_get_profiles(self):
        """Test getting list of profiles"""
        success, response = self.run_test(
            "Get Profiles List",
            "GET",
            "profiles",
            200
        )
        if success and isinstance(response, list):
            print(f"✅ Found {len(response)} profiles")
            # Check if our test profile exists
            test_profile_exists = any(p.get("profile_id") == self.test_profile_id for p in response)
            if test_profile_exists:
                print(f"✅ Test profile found in list")
            else:
                print(f"⚠️ Test profile not found in list")
            return True, response
        return False, []

    def test_delete_profile(self):
        """Test deleting a profile"""
        success, response = self.run_test(
            "Delete Profile",
            "DELETE",
            f"profiles/{self.test_profile_id}",
            200
        )
        if success:
            print(f"✅ Profile deleted successfully")
            return True
        return False

    def test_get_runs(self):
        """Test getting automation runs history"""
        success, response = self.run_test(
            "Get Automation Runs",
            "GET",
            "runs",
            200
        )
        if success and isinstance(response, list):
            print(f"✅ Found {len(response)} automation runs")
            return True, response
        return False, []

    def test_get_config(self):
        """Test getting configuration"""
        success, response = self.run_test(
            "Get Configuration",
            "GET",
            "config",
            200
        )
        if success and isinstance(response, dict):
            required_keys = ["google_sheet_id", "rebotou_extension_id", "adspower_api_port"]
            if all(key in response for key in required_keys):
                print(f"✅ All config keys present: {list(response.keys())}")
                return True, response
            else:
                print(f"❌ Missing config keys. Got: {list(response.keys())}")
        return False, {}

    def test_generate_script(self):
        """Test script generation endpoint"""
        success, response = self.run_test(
            "Generate Automation Script",
            "GET",
            "generate-script",
            200,
            expect_json=False
        )
        if success:
            if "AdsPower Browser Automation Script" in response:
                print(f"✅ Script generated successfully (length: {len(response)} chars)")
                return True
            else:
                print(f"❌ Script content doesn't look correct")
        return False

def main():
    print("=" * 60)
    print("AdsPower Automation Backend API Tests")
    print("=" * 60)
    
    tester = AdsPowerAPITester()
    
    # Test sequence
    print("\n🚀 Starting API tests...")
    
    # Basic API tests
    tester.test_root_api()
    
    # Sheets functionality
    success, sheets = tester.test_get_sheets()
    if success and sheets:
        # Test comments for the first available sheet
        tester.test_get_sheet_comments(sheets[0])
    
    # Profile management
    tester.test_create_profile()
    tester.test_get_profiles() 
    tester.test_delete_profile()
    
    # Other endpoints
    tester.test_get_runs()
    tester.test_get_config()
    tester.test_generate_script()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Tests Summary:")
    print(f"   Total Tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    print("=" * 60)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)