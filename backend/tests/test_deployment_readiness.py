"""
Deployment Readiness Tests for White-Label SaaS ERP
Tests backend APIs after dependency cleanup and refactoring
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
        print(f"Health check: {data}")
    
    def test_setup_status_complete(self):
        """GET /api/setup/status returns setup_complete=true"""
        response = requests.get(f"{BASE_URL}/api/setup/status")
        assert response.status_code == 200
        data = response.json()
        assert data["setup_complete"] == True
        assert data["configured"] == True
        assert data["database_ready"] == True
        assert data["has_admin"] == True
        assert "business_name" in data
        print(f"Setup status: {data}")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_login_success(self):
        """POST /api/auth/login with valid credentials"""
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
        print(f"Login successful: user={data['user']['email']}, role={data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("Invalid login correctly rejected with 401")
    
    def test_auth_me_without_token(self):
        """GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("Unauthenticated /auth/me correctly rejected with 401")


class TestDashboardAPIs:
    """Dashboard and analytics API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@erp.com",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_dashboard_stats(self, auth_token):
        """GET /api/dashboard/stats returns stats with auth"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "today_revenue" in data
        assert "today_transactions" in data
        assert "total_products" in data
        assert "low_stock_items" in data
        assert "pending_production" in data
        assert "pending_purchases" in data
        assert "active_custom_orders" in data
        print(f"Dashboard stats: {data}")
    
    def test_dashboard_analytics(self, auth_token):
        """GET /api/dashboard/analytics returns analytics data"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/analytics",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "trend" in data
        assert "payment_methods" in data
        assert "top_products" in data
        print(f"Dashboard analytics keys: {list(data.keys())}")
    
    def test_dashboard_analytics_with_period(self, auth_token):
        """GET /api/dashboard/analytics with period filter"""
        for period in ["7d", "30d", "90d"]:
            response = requests.get(
                f"{BASE_URL}/api/dashboard/analytics?period={period}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200
            print(f"Analytics with period={period}: OK")


class TestCoreAPIs:
    """Core business API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@erp.com",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_products_list(self, auth_token):
        """GET /api/products returns product list"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"Products: {data['total']} total")
    
    def test_locations_list(self, auth_token):
        """GET /api/locations returns location list"""
        response = requests.get(
            f"{BASE_URL}/api/locations",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Locations: {len(data)} found")
    
    def test_users_list(self, auth_token):
        """GET /api/users returns user list (admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Users: {len(data)} found")
    
    def test_settings_get(self, auth_token):
        """GET /api/settings returns app settings"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"Settings keys: {list(data.keys())[:5]}...")


class TestSetupWizardBlocked:
    """Verify setup wizard is blocked when already configured"""
    
    def test_setup_initialize_blocked(self):
        """POST /api/setup/initialize returns 403 when already configured"""
        response = requests.post(f"{BASE_URL}/api/setup/initialize", json={
            "supabase_url": "https://test.supabase.co",
            "supabase_key": "test-key",
            "service_role_key": "test-service-key"
        })
        assert response.status_code == 403
        print("Setup initialize correctly blocked with 403")
    
    def test_setup_create_admin_blocked(self):
        """POST /api/setup/create-admin returns 400 when admin exists"""
        response = requests.post(f"{BASE_URL}/api/setup/create-admin", json={
            "email": "newadmin@test.com",
            "password": "test123",
            "name": "New Admin",
            "business_name": "Test Business"
        })
        # Should be blocked because admin already exists
        assert response.status_code in [400, 403]
        print("Create admin correctly blocked")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
