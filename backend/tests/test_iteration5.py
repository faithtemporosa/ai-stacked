"""
Iteration 5 Backend Tests - TikTok Auto Commenter SaaS
Tests: Auth, Billing, Email Notifications, Core APIs

Run: pytest /app/backend/tests/test_iteration5.py -v --tb=short
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bot-reporter.preview.emergentagent.com').rstrip('/')


class TestRootAPI:
    """Root API endpoint tests"""
    
    def test_root_returns_message(self):
        """GET /api/ returns valid response"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: Root API returned: {data['message']}")


class TestBillingPlans:
    """Billing plans endpoint tests"""
    
    def test_get_plans_returns_three_plans(self):
        """GET /api/billing/plans returns 3 plans"""
        response = requests.get(f"{BASE_URL}/api/billing/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        plans = data["plans"]
        assert "free" in plans
        assert "pro" in plans
        assert "enterprise" in plans
        print(f"SUCCESS: Found plans: {list(plans.keys())}")
    
    def test_free_plan_has_correct_price(self):
        """Free plan should be $0"""
        response = requests.get(f"{BASE_URL}/api/billing/plans")
        data = response.json()
        free_plan = data["plans"]["free"]
        assert free_plan["amount"] == 0.0
        assert free_plan["name"] == "Free"
        print(f"SUCCESS: Free plan price: ${free_plan['amount']}")
    
    def test_pro_plan_has_correct_price(self):
        """Pro plan should be $29"""
        response = requests.get(f"{BASE_URL}/api/billing/plans")
        data = response.json()
        pro_plan = data["plans"]["pro"]
        assert pro_plan["amount"] == 29.0
        assert pro_plan["name"] == "Pro"
        print(f"SUCCESS: Pro plan price: ${pro_plan['amount']}")
    
    def test_enterprise_plan_has_correct_price(self):
        """Enterprise plan should be $99"""
        response = requests.get(f"{BASE_URL}/api/billing/plans")
        data = response.json()
        enterprise_plan = data["plans"]["enterprise"]
        assert enterprise_plan["amount"] == 99.0
        assert enterprise_plan["name"] == "Enterprise"
        print(f"SUCCESS: Enterprise plan price: ${enterprise_plan['amount']}")


class TestBillingCheckout:
    """Billing checkout endpoint tests"""
    
    def test_checkout_pro_plan_returns_url(self):
        """POST /api/billing/checkout with pro plan returns Stripe URL"""
        response = requests.post(
            f"{BASE_URL}/api/billing/checkout",
            json={
                "plan_id": "pro",
                "origin_url": "https://bot-reporter.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert "checkout.stripe.com" in data["url"]
        print(f"SUCCESS: Checkout URL generated with session: {data['session_id'][:20]}...")
    
    def test_checkout_enterprise_plan_returns_url(self):
        """POST /api/billing/checkout with enterprise plan returns Stripe URL"""
        response = requests.post(
            f"{BASE_URL}/api/billing/checkout",
            json={
                "plan_id": "enterprise",
                "origin_url": "https://bot-reporter.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "checkout.stripe.com" in data["url"]
        print(f"SUCCESS: Enterprise checkout URL generated")
    
    def test_checkout_free_plan_rejected(self):
        """POST /api/billing/checkout with free plan should fail"""
        response = requests.post(
            f"{BASE_URL}/api/billing/checkout",
            json={
                "plan_id": "free",
                "origin_url": "https://bot-reporter.preview.emergentagent.com"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "Free plan" in data["detail"] or "payment" in data["detail"].lower()
        print(f"SUCCESS: Free plan checkout correctly rejected")
    
    def test_checkout_invalid_plan_rejected(self):
        """POST /api/billing/checkout with invalid plan should fail"""
        response = requests.post(
            f"{BASE_URL}/api/billing/checkout",
            json={
                "plan_id": "invalid_plan",
                "origin_url": "https://bot-reporter.preview.emergentagent.com"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "Invalid plan" in data["detail"]
        print(f"SUCCESS: Invalid plan correctly rejected")


class TestEmailNotifications:
    """Email notification endpoint tests"""
    
    @pytest.fixture
    def test_email(self):
        """Generate unique test email"""
        return f"test_pytest_{uuid.uuid4().hex[:8]}@test.com"
    
    def test_subscribe_email(self, test_email):
        """POST /api/notifications/subscribe works with email"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/subscribe",
            json={"email": test_email, "frequency": "daily"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert test_email in data["message"]
        print(f"SUCCESS: Subscribed {test_email}")
    
    def test_subscribe_weekly_frequency(self):
        """POST /api/notifications/subscribe with weekly frequency"""
        test_email = f"test_weekly_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(
            f"{BASE_URL}/api/notifications/subscribe",
            json={"email": test_email, "frequency": "weekly"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "weekly" in data["message"]
        print(f"SUCCESS: Subscribed {test_email} with weekly frequency")
    
    def test_get_subscriptions_returns_list(self):
        """GET /api/notifications/subscriptions returns subscriber list"""
        response = requests.get(f"{BASE_URL}/api/notifications/subscriptions")
        assert response.status_code == 200
        data = response.json()
        assert "subscriptions" in data
        assert isinstance(data["subscriptions"], list)
        print(f"SUCCESS: Found {len(data['subscriptions'])} active subscribers")
    
    def test_unsubscribe_removes_email(self, test_email):
        """POST /api/notifications/unsubscribe deactivates subscription"""
        # First subscribe
        requests.post(
            f"{BASE_URL}/api/notifications/subscribe",
            json={"email": test_email, "frequency": "daily"}
        )
        # Then unsubscribe
        response = requests.post(
            f"{BASE_URL}/api/notifications/unsubscribe",
            json={"email": test_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        print(f"SUCCESS: Unsubscribed {test_email}")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    @pytest.fixture
    def unique_user(self):
        """Generate unique test user data"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "email": f"test_auth_{unique_id}@test.com",
            "password": "testpass123",
            "name": f"Test User {unique_id}"
        }
    
    def test_register_creates_user(self, unique_user):
        """POST /api/auth/register creates user and returns token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=unique_user
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_user["email"]
        assert data["user"]["name"] == unique_user["name"]
        print(f"SUCCESS: Registered {unique_user['email']}")
    
    def test_register_duplicate_email_rejected(self, unique_user):
        """POST /api/auth/register rejects duplicate email"""
        # First registration
        requests.post(f"{BASE_URL}/api/auth/register", json=unique_user)
        # Second registration should fail
        response = requests.post(f"{BASE_URL}/api/auth/register", json=unique_user)
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data["detail"].lower() or "email" in data["detail"].lower()
        print(f"SUCCESS: Duplicate registration rejected")
    
    def test_login_with_credentials(self, unique_user):
        """POST /api/auth/login works with registered credentials"""
        # First register
        requests.post(f"{BASE_URL}/api/auth/register", json=unique_user)
        # Then login
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": unique_user["email"], "password": unique_user["password"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == unique_user["email"]
        print(f"SUCCESS: Login successful for {unique_user['email']}")
    
    def test_login_wrong_password_rejected(self, unique_user):
        """POST /api/auth/login rejects wrong password"""
        # First register
        requests.post(f"{BASE_URL}/api/auth/register", json=unique_user)
        # Try wrong password
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": unique_user["email"], "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print(f"SUCCESS: Wrong password rejected")
    
    def test_login_nonexistent_email_rejected(self):
        """POST /api/auth/login rejects non-existent email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nonexistent@test.com", "password": "anypassword"}
        )
        assert response.status_code == 401
        print(f"SUCCESS: Non-existent email rejected")


class TestReportsAPI:
    """Reports API endpoint tests"""
    
    def test_get_reports_stats(self):
        """GET /api/reports/stats returns statistics"""
        response = requests.get(f"{BASE_URL}/api/reports/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_comments" in data
        assert "today_comments" in data
        assert "week_comments" in data
        print(f"SUCCESS: Stats - Total: {data['total_comments']}, Today: {data['today_comments']}")
    
    def test_get_reports_with_pagination(self):
        """GET /api/reports supports limit and skip"""
        response = requests.get(f"{BASE_URL}/api/reports?limit=5&skip=0")
        assert response.status_code == 200
        data = response.json()
        assert "reports" in data
        assert "total" in data
        assert "limit" in data
        assert data["limit"] == 5
        print(f"SUCCESS: Reports with pagination - {len(data['reports'])} returned")
    
    def test_get_reports_filter_today(self):
        """GET /api/reports?filter=today filters correctly"""
        response = requests.get(f"{BASE_URL}/api/reports?filter=today")
        assert response.status_code == 200
        data = response.json()
        assert data["filter"] == "today"
        print(f"SUCCESS: Today filter - {data['total']} reports")
    
    def test_create_single_report(self):
        """POST /api/reports creates single comment report"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        report_data = {
            "timestamp": timestamp,
            "profile": "TEST_iter5_profile",
            "video_url": "https://tiktok.com/@test/video/12345",
            "video_id": f"iter5_test_{uuid.uuid4().hex[:8]}",
            "comment": "Test comment from iteration 5 pytest",
            "sheet": "Bump Connect"
        }
        response = requests.post(f"{BASE_URL}/api/reports", json=report_data)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success" or data["status"] == "duplicate"
        print(f"SUCCESS: Created report with status: {data['status']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
