"""
Backend API Tests for TikTok Comments Dashboard - Auth Endpoints
Tests: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
"""
import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAuthAPI:
    """Authentication endpoint tests"""
    
    def test_register_new_user(self, api_client):
        """POST /api/auth/register - should create a new user and return token"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_user_{unique_id}@test.com"
        
        register_data = {
            "email": test_email,
            "password": "TestPassword123!",
            "name": f"Test User {unique_id}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == test_email.lower()
        assert data["user"]["name"] == f"Test User {unique_id}"
        assert "id" in data["user"]
        print(f"Registered user: {data['user']['email']}, id: {data['user']['id']}")
        
        # Store for later tests
        self.__class__.test_email = test_email
        self.__class__.test_password = "TestPassword123!"
        self.__class__.test_token = data["access_token"]
        self.__class__.test_user_id = data["user"]["id"]
    
    def test_register_duplicate_email(self, api_client):
        """POST /api/auth/register - should reject duplicate email"""
        # Use the email from previous test
        if not hasattr(self.__class__, 'test_email'):
            pytest.skip("Requires test_register_new_user to run first")
        
        register_data = {
            "email": self.__class__.test_email,
            "password": "AnotherPassword123!",
            "name": "Duplicate User"
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "already registered" in data["detail"].lower()
        print(f"Duplicate registration correctly rejected: {data['detail']}")
    
    def test_login_success(self, api_client):
        """POST /api/auth/login - should login with valid credentials"""
        if not hasattr(self.__class__, 'test_email'):
            pytest.skip("Requires test_register_new_user to run first")
        
        login_data = {
            "email": self.__class__.test_email,
            "password": self.__class__.test_password
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == self.__class__.test_email.lower()
        print(f"Login successful for: {data['user']['email']}")
        
        # Update token for later tests
        self.__class__.test_token = data["access_token"]
    
    def test_login_invalid_password(self, api_client):
        """POST /api/auth/login - should reject invalid password"""
        if not hasattr(self.__class__, 'test_email'):
            pytest.skip("Requires test_register_new_user to run first")
        
        login_data = {
            "email": self.__class__.test_email,
            "password": "WrongPassword123!"
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"Invalid login correctly rejected: {data['detail']}")
    
    def test_login_nonexistent_email(self, api_client):
        """POST /api/auth/login - should reject non-existent email"""
        login_data = {
            "email": "nonexistent_user_xyz123@test.com",
            "password": "AnyPassword123!"
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Non-existent email login correctly rejected")
    
    def test_get_current_user_with_token(self, api_client):
        """GET /api/auth/me - should return current user with valid token"""
        if not hasattr(self.__class__, 'test_token'):
            pytest.skip("Requires test_login_success to run first")
        
        headers = {"Authorization": f"Bearer {self.__class__.test_token}"}
        response = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
        assert data["id"] == self.__class__.test_user_id
        print(f"Current user: {data['email']}, role: {data.get('role', 'N/A')}")
    
    def test_get_current_user_no_token(self, api_client):
        """GET /api/auth/me - should reject without token"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthorized access correctly rejected")
    
    def test_get_current_user_invalid_token(self, api_client):
        """GET /api/auth/me - should reject with invalid token"""
        headers = {"Authorization": "Bearer invalid_token_xyz123"}
        response = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Invalid token correctly rejected")


class TestRegisterWithTeam:
    """Test user registration with team creation"""
    
    def test_register_with_team(self, api_client):
        """POST /api/auth/register - should create user with team"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"team_admin_{unique_id}@test.com"
        
        register_data = {
            "email": test_email,
            "password": "TeamAdminPass123!",
            "name": f"Team Admin {unique_id}",
            "team_name": f"Test Team {unique_id}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["team_id"] is not None, "User should have team_id"
        assert data["user"]["team_name"] == f"Test Team {unique_id}"
        assert data["user"]["role"] == "admin", "Team creator should be admin"
        print(f"Registered user with team: {data['user']['email']}, team: {data['user']['team_name']}")


class TestRootAndConfigEndpoints:
    """Root and config endpoint tests"""
    
    def test_api_root(self, api_client):
        """GET /api/ - should return API info"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print(f"API root: {data['message']}")
    
    def test_reports_stats(self, api_client):
        """GET /api/reports/stats - should return dashboard statistics"""
        response = api_client.get(f"{BASE_URL}/api/reports/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_comments" in data
        assert "today_comments" in data
        assert "week_comments" in data
        assert "by_brand" in data
        print(f"Stats: total={data['total_comments']}, today={data['today_comments']}")
