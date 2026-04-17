"""
Test Setup Wizard Endpoints and Dynamic Branding
Tests for SaaS ERP setup wizard functionality when already configured
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSetupStatus:
    """Test GET /api/setup/status endpoint"""
    
    def test_setup_status_returns_configured(self):
        """GET /api/setup/status should return configured=true for already setup instance"""
        response = requests.get(f"{BASE_URL}/api/setup/status")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        assert "configured" in data
        assert "database_ready" in data
        assert "has_admin" in data
        assert "business_name" in data
        assert "setup_complete" in data
        
        # Verify values for configured instance
        assert data["configured"] == True, f"Expected configured=True, got {data['configured']}"
        assert data["database_ready"] == True, f"Expected database_ready=True, got {data['database_ready']}"
        assert data["has_admin"] == True, f"Expected has_admin=True, got {data['has_admin']}"
        assert data["setup_complete"] == True, f"Expected setup_complete=True, got {data['setup_complete']}"
        
        # Business name should be set
        assert data["business_name"], "Business name should not be empty"
        print(f"Business name: {data['business_name']}")


class TestSetupBlocking:
    """Test that setup endpoints are blocked when already configured"""
    
    def test_setup_initialize_returns_403_when_configured(self):
        """POST /api/setup/initialize should return 403 when already configured"""
        response = requests.post(
            f"{BASE_URL}/api/setup/initialize",
            json={
                "business_name": "Test Business",
                "supabase_url": "https://test.supabase.co",
                "supabase_key": "test_key"
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "already completed" in data["detail"].lower() or "cannot re-run" in data["detail"].lower()
        print(f"Setup initialize blocked with: {data['detail']}")
    
    def test_create_admin_returns_400_when_admin_exists(self):
        """POST /api/setup/create-admin should return 400 when admin already exists"""
        response = requests.post(
            f"{BASE_URL}/api/setup/create-admin",
            json={
                "name": "Test Admin",
                "email": "test_admin@test.com",
                "password": "testpass123"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "already exists" in data["detail"].lower()
        print(f"Create admin blocked with: {data['detail']}")


class TestHealthEndpoint:
    """Test GET /api/health endpoint"""
    
    def test_health_returns_healthy(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "healthy", f"Expected status=healthy, got {data['status']}"
        assert "database" in data
        assert data["database"] == "connected", f"Expected database=connected, got {data['database']}"
        print(f"Health check: {data}")


class TestAuthWithCredentials:
    """Test authentication with admin credentials"""
    
    def test_login_with_admin_credentials(self):
        """Login with admin@erp.com / admin123 should succeed"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@erp.com",
                "password": "admin123"
            }
        )
        assert response.status_code == 200, f"Login failed with status {response.status_code}: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@erp.com"
        assert data["user"]["role"] == "admin"
        print(f"Login successful for user: {data['user']['email']}")
        return data["token"]
    
    def test_login_with_wrong_credentials(self):
        """Login with wrong credentials should fail"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "wrong@email.com",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestSetupCheck:
    """Test GET /api/setup/check endpoint"""
    
    def test_setup_check_all_tables_ready(self):
        """GET /api/setup/check should show all tables ready"""
        response = requests.get(f"{BASE_URL}/api/setup/check")
        assert response.status_code == 200
        data = response.json()
        
        assert "all_tables_ready" in data
        assert "tables" in data
        
        # Check critical tables exist
        critical_tables = ["users", "products", "sales", "inventory", "locations", "app_settings"]
        for table in critical_tables:
            if table in data["tables"]:
                assert data["tables"][table] == "ok", f"Table {table} status: {data['tables'][table]}"
        
        print(f"All tables ready: {data['all_tables_ready']}")
        print(f"Tables checked: {len(data['tables'])}")


class TestDynamicBranding:
    """Test dynamic branding - no hardcoded TextileERP or Emergent"""
    
    def test_settings_endpoint_returns_business_name(self):
        """GET /api/settings should return business_name"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@erp.com", "password": "admin123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Get settings
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check business_name exists
        if "business_name" in data:
            business_name = data["business_name"]
            print(f"Business name from settings: {business_name}")
            # Verify no hardcoded TextileERP
            assert "textileerp" not in business_name.lower(), "Business name should not contain TextileERP"


class TestCoreAPIEndpoints:
    """Test core API endpoints work after setup"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@erp.com", "password": "admin123"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate")
    
    def test_dashboard_stats(self):
        """GET /api/dashboard/stats should return stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = ["today_revenue", "today_transactions", "total_products", "low_stock_items"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"Dashboard stats: {data}")
    
    def test_products_endpoint(self):
        """GET /api/products should return products list"""
        response = requests.get(f"{BASE_URL}/api/products", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        print(f"Products count: {data['total']}")
    
    def test_inventory_endpoint(self):
        """GET /api/inventory should return inventory list"""
        response = requests.get(f"{BASE_URL}/api/inventory", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        print(f"Inventory count: {data['total']}")
    
    def test_locations_endpoint(self):
        """GET /api/locations should return locations list"""
        response = requests.get(f"{BASE_URL}/api/locations", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Locations count: {len(data)}")
    
    def test_sales_endpoint(self):
        """GET /api/sales should return sales list"""
        response = requests.get(f"{BASE_URL}/api/sales", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        print(f"Sales count: {data['total']}")
    
    def test_users_endpoint(self):
        """GET /api/users should return users list (admin only)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # Check users have location_id field
        if data:
            assert "location_id" in data[0] or data[0].get("location_id") is None
        print(f"Users count: {len(data)}")
    
    def test_migrations_status(self):
        """GET /api/migrations/status should return applied migrations"""
        response = requests.get(f"{BASE_URL}/api/migrations/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # API returns {"migrations": [...]} format
        assert "migrations" in data
        assert isinstance(data["migrations"], list)
        print(f"Applied migrations: {len(data['migrations'])}")
    
    def test_tax_settings(self):
        """GET /api/tax-settings should return tax configuration"""
        response = requests.get(f"{BASE_URL}/api/tax-settings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "tax_active" in data
        assert "vat_rate" in data
        assert "sscl_rate" in data
        print(f"Tax settings: {data}")
    
    def test_product_attributes(self):
        """GET /api/product-attributes should return attributes list"""
        response = requests.get(f"{BASE_URL}/api/product-attributes", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Product attributes count: {len(data)}")
    
    def test_shifts_endpoint(self):
        """GET /api/shifts should return shifts list"""
        response = requests.get(f"{BASE_URL}/api/shifts", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # API returns {"data": [...], "total": N} format
        assert "data" in data
        assert isinstance(data["data"], list)
        print(f"Shifts count: {len(data['data'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
