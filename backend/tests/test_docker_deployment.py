"""
Test suite for Docker deployment verification
Tests: API health, setup status, auth, and verifies no regressions from static file serving code
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndSetup:
    """Health check and setup status tests"""
    
    def test_health_endpoint(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print(f"✓ Health check passed: {data}")
    
    def test_setup_status(self):
        """GET /api/setup/status returns correct setup_complete state"""
        response = requests.get(f"{BASE_URL}/api/setup/status")
        assert response.status_code == 200
        data = response.json()
        assert "setup_complete" in data
        assert "configured" in data
        assert "database_ready" in data
        assert "has_admin" in data
        # Since SETUP_COMPLETE=true in .env
        assert data["setup_complete"] == True
        assert data["configured"] == True
        assert data["database_ready"] == True
        assert data["has_admin"] == True
        print(f"✓ Setup status passed: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """POST /api/auth/login works with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@erp.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@erp.com"
        assert data["user"]["role"] == "admin"
        print(f"✓ Login success: user={data['user']['email']}, role={data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login returns 401 for invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly returns 401")
    
    def test_auth_me_without_token(self):
        """GET /api/auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /api/auth/me correctly requires authentication")


class TestProtectedEndpoints:
    """Test that protected endpoints work with auth"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@erp.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_dashboard_stats(self, auth_token):
        """GET /api/dashboard/stats returns stats with auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "today_revenue" in data
        assert "total_products" in data
        print(f"✓ Dashboard stats: revenue={data['today_revenue']}, products={data['total_products']}")
    
    def test_products_endpoint(self, auth_token):
        """GET /api/products returns product list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"✓ Products endpoint: total={data['total']}")
    
    def test_locations_endpoint(self, auth_token):
        """GET /api/locations returns location list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/locations", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Locations endpoint: count={len(data)}")
    
    def test_users_endpoint(self, auth_token):
        """GET /api/users returns user list (admin only)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Users endpoint: count={len(data)}")
    
    def test_settings_endpoint(self, auth_token):
        """GET /api/settings returns app settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Settings endpoint: keys={list(data.keys())[:5]}")


class TestNoRegressions:
    """Verify static file serving code doesn't break API routes"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@erp.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_api_routes_not_intercepted(self, auth_token):
        """Verify API routes are not intercepted by SPA catch-all"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test multiple API endpoints to ensure they're not caught by SPA
        endpoints = [
            "/api/health",
            "/api/setup/status",
            "/api/products",
            "/api/locations",
            "/api/inventory",
            "/api/sales",
            "/api/customers",
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            # Should return JSON, not HTML
            content_type = response.headers.get("content-type", "")
            assert "application/json" in content_type, f"{endpoint} returned {content_type} instead of JSON"
            print(f"✓ {endpoint} returns JSON correctly")
    
    def test_api_post_routes_work(self, auth_token):
        """Verify POST API routes work correctly"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Test login (already tested but verify it's not intercepted)
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@erp.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        assert "application/json" in response.headers.get("content-type", "")
        print("✓ POST /api/auth/login works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
