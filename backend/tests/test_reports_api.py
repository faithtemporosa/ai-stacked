"""
Backend API Tests for TikTok Comments Dashboard Reporting Endpoints
Tests: POST /api/reports, POST /api/reports/bulk, GET /api/reports, GET /api/reports/stats, DELETE /api/reports
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestReportsAPI:
    """Comment Reports endpoint tests"""
    
    def test_get_reports_stats(self, api_client):
        """GET /api/reports/stats - should return dashboard statistics"""
        response = api_client.get(f"{BASE_URL}/api/reports/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify all required fields are present
        assert "total_comments" in data, "Missing total_comments field"
        assert "today_comments" in data, "Missing today_comments field"
        assert "week_comments" in data, "Missing week_comments field"
        assert "unique_profiles" in data, "Missing unique_profiles field"
        assert "unique_videos" in data, "Missing unique_videos field"
        assert "by_brand" in data, "Missing by_brand field"
        
        # Verify data types
        assert isinstance(data["total_comments"], int)
        assert isinstance(data["today_comments"], int)
        assert isinstance(data["by_brand"], dict)
        print(f"Stats: total={data['total_comments']}, today={data['today_comments']}, brands={data['by_brand']}")

    def test_get_reports_all(self, api_client):
        """GET /api/reports - should return all reports"""
        response = api_client.get(f"{BASE_URL}/api/reports")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "reports" in data, "Missing reports field"
        assert "total" in data, "Missing total field"
        assert "filter" in data, "Missing filter field"
        assert isinstance(data["reports"], list)
        print(f"Reports: {len(data['reports'])} of {data['total']} total, filter={data['filter']}")

    def test_get_reports_with_limit(self, api_client):
        """GET /api/reports?limit=5 - should return limited reports"""
        response = api_client.get(f"{BASE_URL}/api/reports?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["reports"]) <= 5, f"Expected <=5 reports, got {len(data['reports'])}"
        assert data["limit"] == 5

    def test_post_single_report(self, api_client):
        """POST /api/reports - should accept a single comment report"""
        test_report = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "profile": "TEST_pytest_profile",
            "video_url": "https://tiktok.com/test/pytest_video",
            "video_id": f"pytest_video_{int(datetime.now().timestamp())}",
            "comment": "Test comment from pytest",
            "sheet": "Bump Connect"
        }
        
        response = api_client.post(f"{BASE_URL}/api/reports", json=test_report)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "success"
        assert "id" in data, "Missing id in response"
        print(f"Created report with id: {data['id']}")
        
        # Verify it was persisted - GET reports and check it's there
        get_response = api_client.get(f"{BASE_URL}/api/reports?limit=10")
        assert get_response.status_code == 200
        reports = get_response.json()["reports"]
        found = any(r.get("profile") == "TEST_pytest_profile" for r in reports)
        assert found, "Created report not found in GET /api/reports"

    def test_post_bulk_reports(self, api_client):
        """POST /api/reports/bulk - should accept multiple reports at once"""
        test_reports = [
            {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "profile": "TEST_bulk_profile_1",
                "video_url": "https://tiktok.com/test/bulk1",
                "video_id": f"bulk_video_1_{int(datetime.now().timestamp())}",
                "comment": "Bulk test comment 1",
                "sheet": "Kollabsy"
            },
            {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "profile": "TEST_bulk_profile_2",
                "video_url": "https://tiktok.com/test/bulk2",
                "video_id": f"bulk_video_2_{int(datetime.now().timestamp())}",
                "comment": "Bulk test comment 2",
                "sheet": "Bump Syndicate"
            }
        ]
        
        response = api_client.post(f"{BASE_URL}/api/reports/bulk", json={"reports": test_reports})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "success"
        assert data["inserted"] == 2, f"Expected 2 inserted, got {data['inserted']}"
        print(f"Bulk inserted {data['inserted']} reports")

    def test_get_reports_filter_today(self, api_client):
        """GET /api/reports?filter=today - should filter by today's date"""
        response = api_client.get(f"{BASE_URL}/api/reports?filter=today")
        assert response.status_code == 200
        
        data = response.json()
        assert data["filter"] == "today"
        # Filter may return 0 if test data has old timestamps - that's expected
        print(f"Today filter: {len(data['reports'])} reports")

    def test_get_reports_filter_week(self, api_client):
        """GET /api/reports?filter=week - should filter by this week"""
        response = api_client.get(f"{BASE_URL}/api/reports?filter=week")
        assert response.status_code == 200
        
        data = response.json()
        assert data["filter"] == "week"
        print(f"Week filter: {len(data['reports'])} reports")

    def test_get_reports_filter_month(self, api_client):
        """GET /api/reports?filter=month - should filter by this month"""
        response = api_client.get(f"{BASE_URL}/api/reports?filter=month")
        assert response.status_code == 200
        
        data = response.json()
        assert data["filter"] == "month"
        print(f"Month filter: {len(data['reports'])} reports")

    def test_get_reports_filter_by_profile(self, api_client):
        """GET /api/reports?profile=TEST - should filter by profile name"""
        response = api_client.get(f"{BASE_URL}/api/reports?profile=TEST")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["reports"], list)
        # All returned reports should contain 'TEST' in profile name (case-insensitive regex)
        for report in data["reports"]:
            assert "test" in report["profile"].lower(), f"Report profile '{report['profile']}' doesn't match filter"
        print(f"Profile filter 'TEST': {len(data['reports'])} reports")

    def test_get_reports_filter_by_sheet(self, api_client):
        """GET /api/reports?sheet=Bump Connect - should filter by brand/sheet"""
        response = api_client.get(f"{BASE_URL}/api/reports?sheet=Bump Connect")
        assert response.status_code == 200
        
        data = response.json()
        for report in data["reports"]:
            assert report["sheet"] == "Bump Connect", f"Report sheet '{report['sheet']}' doesn't match filter"
        print(f"Sheet filter 'Bump Connect': {len(data['reports'])} reports")

    def test_delete_reports(self, api_client):
        """DELETE /api/reports - should clear all reports"""
        # First get current count
        stats_before = api_client.get(f"{BASE_URL}/api/reports/stats").json()
        count_before = stats_before["total_comments"]
        
        # Delete all reports
        response = api_client.delete(f"{BASE_URL}/api/reports")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["status"] == "cleared"
        assert "deleted_count" in data
        print(f"Deleted {data['deleted_count']} reports")
        
        # Verify deletion - stats should show 0
        stats_after = api_client.get(f"{BASE_URL}/api/reports/stats").json()
        assert stats_after["total_comments"] == 0, f"Expected 0 reports after delete, got {stats_after['total_comments']}"

    def test_recreate_seed_data_after_delete(self, api_client):
        """Recreate test data after DELETE test for other tests to use"""
        # Re-add some test data
        test_reports = [
            {
                "timestamp": "2026-02-16 10:30:00",
                "profile": "Test Profile 1",
                "video_url": "https://tiktok.com/test/video1",
                "video_id": "test_video_001",
                "comment": "omg this reminds me of Bump Connect bumpconnect.xyz",
                "sheet": "Bump Connect"
            },
            {
                "timestamp": "2026-02-16 11:15:00",
                "profile": "Profile Alpha",
                "video_url": "https://tiktok.com/test/video2",
                "video_id": "test_video_002",
                "comment": "Kollabsy creators would love to collab with you! kollabsy.xyz",
                "sheet": "Kollabsy"
            },
            {
                "timestamp": "2026-02-16 11:45:00",
                "profile": "Profile Beta",
                "video_url": "https://tiktok.com/test/video3",
                "video_id": "test_video_003",
                "comment": "Bump Syndicate community would appreciate this - bumpsyndicate.xyz",
                "sheet": "Bump Syndicate"
            }
        ]
        
        response = api_client.post(f"{BASE_URL}/api/reports/bulk", json={"reports": test_reports})
        assert response.status_code == 200
        assert response.json()["inserted"] == 3
        print("Recreated 3 seed reports for testing")


class TestRootAndConfig:
    """Root and config endpoints"""
    
    def test_root_endpoint(self, api_client):
        """GET /api/ - should return API info"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print(f"Root response: {data['message']}")

    def test_config_endpoint(self, api_client):
        """GET /api/config - should return configuration"""
        response = api_client.get(f"{BASE_URL}/api/config")
        assert response.status_code == 200
        
        data = response.json()
        assert "google_sheet_id" in data
        assert "rebotou_extension_id" in data
        print(f"Config: sheet_id={data['google_sheet_id'][:20]}...")
