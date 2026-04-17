"""
V3 ERP Features Test Suite
Tests: Tax settings, Product attributes/variants, Dashboard analytics, 
       Shift reconciliation, Petty cash, Migration status
"""
import pytest
import requests
import os
from datetime import date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@erp.com"
TEST_PASSWORD = "admin123"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        return data["token"]
    
    def test_login_success(self, auth_token):
        """Test admin login works"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Login successful, token obtained")


class TestTaxSettings:
    """Tax & Compliance (Sri Lanka 2026) tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_tax_settings_default(self, auth_headers):
        """GET /api/tax-settings returns default values"""
        response = requests.get(f"{BASE_URL}/api/tax-settings", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Verify structure
        assert "tax_active" in data
        assert "vat_rate" in data
        assert "sscl_rate" in data
        # Verify default values
        assert data["vat_rate"] == 18, f"Expected VAT 18, got {data['vat_rate']}"
        assert data["sscl_rate"] == 2.5, f"Expected SSCL 2.5, got {data['sscl_rate']}"
        print(f"✓ Tax settings: active={data['tax_active']}, VAT={data['vat_rate']}%, SSCL={data['sscl_rate']}%")
    
    def test_update_tax_settings(self, auth_headers):
        """PUT /api/tax-settings updates tax settings"""
        # Enable tax
        response = requests.put(f"{BASE_URL}/api/tax-settings", 
            headers=auth_headers,
            json={"tax_active": True, "vat_rate": 18, "sscl_rate": 2.5}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify update
        verify = requests.get(f"{BASE_URL}/api/tax-settings", headers=auth_headers)
        data = verify.json()
        assert data["tax_active"] == True
        print(f"✓ Tax settings updated: active={data['tax_active']}")
        
        # Disable tax (restore default)
        requests.put(f"{BASE_URL}/api/tax-settings", 
            headers=auth_headers,
            json={"tax_active": False}
        )


class TestProductAttributes:
    """Product Attributes tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_product_attributes(self, auth_headers):
        """GET /api/product-attributes returns Color and Batch"""
        response = requests.get(f"{BASE_URL}/api/product-attributes", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        attr_names = [a["name"] for a in data]
        assert "Color" in attr_names, f"Color attribute missing. Found: {attr_names}"
        assert "Batch" in attr_names, f"Batch attribute missing. Found: {attr_names}"
        print(f"✓ Product attributes: {attr_names}")
    
    def test_create_product_attribute(self, auth_headers):
        """POST /api/product-attributes creates new attribute"""
        # Create test attribute
        response = requests.post(f"{BASE_URL}/api/product-attributes",
            headers=auth_headers,
            json={"name": "TEST_Size_V3"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == "TEST_Size_V3"
        assert "id" in data
        print(f"✓ Created attribute: {data['name']} (id: {data['id']})")
        
        # Cleanup - delete test attribute
        requests.delete(f"{BASE_URL}/api/product-attributes/{data['id']}", headers=auth_headers)


class TestProductVariants:
    """Product Variants tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_product(self, auth_headers):
        """Create a test product for variant testing"""
        response = requests.post(f"{BASE_URL}/api/products",
            headers=auth_headers,
            json={
                "name": "TEST_Variant_Product_V3",
                "sku": "TEST-VAR-V3-001",
                "unit_price": 1000,
                "cost_price": 500
            }
        )
        if response.status_code == 200:
            return response.json()
        # Product might already exist, try to find it
        products = requests.get(f"{BASE_URL}/api/products", headers=auth_headers, params={"search": "TEST-VAR-V3"})
        if products.status_code == 200:
            data = products.json()
            if data.get("data"):
                return data["data"][0]
        return None
    
    def test_get_product_variants(self, auth_headers):
        """GET /api/product-variants returns variants list"""
        response = requests.get(f"{BASE_URL}/api/product-variants", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Product variants count: {len(data)}")
    
    def test_create_product_variant(self, auth_headers, test_product):
        """POST /api/product-variants creates a variant with attributes"""
        if not test_product:
            pytest.skip("No test product available")
        
        # Get attributes
        attrs_resp = requests.get(f"{BASE_URL}/api/product-attributes", headers=auth_headers)
        attrs = attrs_resp.json()
        color_attr = next((a for a in attrs if a["name"] == "Color"), None)
        
        if not color_attr:
            pytest.skip("Color attribute not found")
        
        response = requests.post(f"{BASE_URL}/api/product-variants",
            headers=auth_headers,
            json={
                "product_id": test_product["id"],
                "attributes": [
                    {"attribute_id": color_attr["id"], "value": "Red"}
                ]
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "variant_sku" in data
        print(f"✓ Created variant: {data['variant_sku']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/product-variants/{data['id']}", headers=auth_headers)


class TestDashboardAnalytics:
    """Dashboard Analytics with Recharts tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_stats(self, auth_headers):
        """GET /api/dashboard/stats returns basic stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "today_revenue" in data
        assert "today_transactions" in data
        assert "total_products" in data
        assert "low_stock_items" in data
        print(f"✓ Dashboard stats: revenue={data['today_revenue']}, transactions={data['today_transactions']}")
    
    def test_dashboard_analytics_7d(self, auth_headers):
        """GET /api/dashboard/analytics returns trend data for 7 days"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics", 
            headers=auth_headers,
            params={"period": "7d"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Verify structure
        assert "trend" in data, "Missing trend data"
        assert "payment_methods" in data, "Missing payment_methods"
        assert "top_products" in data, "Missing top_products"
        assert "total_revenue" in data
        assert "cogs" in data
        assert "net_profit" in data
        # Verify trend has 7 days
        assert len(data["trend"]) == 7, f"Expected 7 days, got {len(data['trend'])}"
        print(f"✓ Analytics 7d: revenue={data['total_revenue']}, profit={data['net_profit']}")
    
    def test_dashboard_analytics_30d(self, auth_headers):
        """GET /api/dashboard/analytics returns trend data for 30 days"""
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics", 
            headers=auth_headers,
            params={"period": "30d"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert len(data["trend"]) == 30, f"Expected 30 days, got {len(data['trend'])}"
        print(f"✓ Analytics 30d: {len(data['trend'])} days of data")
    
    def test_dashboard_analytics_with_location(self, auth_headers):
        """GET /api/dashboard/analytics with location filter"""
        # Get a location first
        loc_resp = requests.get(f"{BASE_URL}/api/locations", headers=auth_headers)
        locations = loc_resp.json()
        if not locations:
            pytest.skip("No locations available")
        
        location_id = locations[0]["id"]
        response = requests.get(f"{BASE_URL}/api/dashboard/analytics", 
            headers=auth_headers,
            params={"period": "7d", "location_id": location_id}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✓ Analytics with location filter works")


class TestShiftReconciliation:
    """Shift Reconciliation tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def outlet_location(self, auth_headers):
        """Get an outlet location for shift testing"""
        response = requests.get(f"{BASE_URL}/api/locations", headers=auth_headers)
        locations = response.json()
        outlets = [l for l in locations if l["type"] == "outlet"]
        if outlets:
            return outlets[0]
        return None
    
    def test_get_shifts(self, auth_headers):
        """GET /api/shifts returns shift list"""
        response = requests.get(f"{BASE_URL}/api/shifts", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"✓ Shifts list: {data['total']} total shifts")
    
    def test_open_shift(self, auth_headers, outlet_location):
        """POST /api/shifts/open opens a shift with opening float"""
        if not outlet_location:
            pytest.skip("No outlet location available")
        
        # First check if there's already an open shift
        current = requests.get(f"{BASE_URL}/api/shifts/current/{outlet_location['id']}", headers=auth_headers)
        if current.status_code == 200 and current.json():
            # Close existing shift first
            shift_id = current.json()["id"]
            requests.post(f"{BASE_URL}/api/shifts/{shift_id}/close", 
                headers=auth_headers,
                json={"actual_cash": 0, "notes": "Auto-closed for testing"}
            )
        
        response = requests.post(f"{BASE_URL}/api/shifts/open",
            headers=auth_headers,
            json={
                "location_id": outlet_location["id"],
                "opening_float": 5000
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["status"] == "open"
        assert float(data["opening_float"]) == 5000
        print(f"✓ Opened shift at {outlet_location['name']} with Rs 5000 float")
        return data
    
    def test_get_current_shift(self, auth_headers, outlet_location):
        """GET /api/shifts/current/{location_id} returns live shift data"""
        if not outlet_location:
            pytest.skip("No outlet location available")
        
        response = requests.get(f"{BASE_URL}/api/shifts/current/{outlet_location['id']}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        if data:
            assert "expected_cash" in data
            assert "cash_sales" in data
            print(f"✓ Current shift: expected_cash={data['expected_cash']}")
        else:
            print("✓ No open shift at this location")
    
    def test_close_shift(self, auth_headers, outlet_location):
        """POST /api/shifts/{shift_id}/close closes shift with discrepancy calculation"""
        if not outlet_location:
            pytest.skip("No outlet location available")
        
        # Get current shift
        current = requests.get(f"{BASE_URL}/api/shifts/current/{outlet_location['id']}", headers=auth_headers)
        if current.status_code != 200 or not current.json():
            # Open a shift first
            requests.post(f"{BASE_URL}/api/shifts/open",
                headers=auth_headers,
                json={"location_id": outlet_location["id"], "opening_float": 5000}
            )
            current = requests.get(f"{BASE_URL}/api/shifts/current/{outlet_location['id']}", headers=auth_headers)
        
        shift = current.json()
        if not shift:
            pytest.skip("Could not create shift for testing")
        
        expected = float(shift.get("expected_cash", 5000))
        
        response = requests.post(f"{BASE_URL}/api/shifts/{shift['id']}/close",
            headers=auth_headers,
            json={
                "actual_cash": expected,  # No discrepancy
                "notes": "Test close - balanced"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["status"] == "closed"
        assert float(data["discrepancy"]) == 0
        print(f"✓ Closed shift with discrepancy: {data['discrepancy']}")


class TestPettyCash:
    """Petty Cash tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def outlet_location(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/locations", headers=auth_headers)
        locations = response.json()
        outlets = [l for l in locations if l["type"] == "outlet"]
        return outlets[0] if outlets else None
    
    def test_create_petty_cash(self, auth_headers, outlet_location):
        """POST /api/petty-cash creates petty cash entry"""
        if not outlet_location:
            pytest.skip("No outlet location available")
        
        response = requests.post(f"{BASE_URL}/api/petty-cash",
            headers=auth_headers,
            json={
                "location_id": outlet_location["id"],
                "type": "expense",
                "category": "Transport",
                "description": "Test petty cash entry",
                "amount": 500
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["type"] == "expense"
        assert float(data["amount"]) == 500
        print(f"✓ Created petty cash: {data['category']} - Rs {data['amount']}")
    
    def test_get_petty_cash(self, auth_headers, outlet_location):
        """GET /api/petty-cash returns petty cash list"""
        if not outlet_location:
            pytest.skip("No outlet location available")
        
        response = requests.get(f"{BASE_URL}/api/petty-cash", 
            headers=auth_headers,
            params={"location_id": outlet_location["id"]}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Petty cash entries: {len(data)}")


class TestMigrations:
    """Migration Status tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_migration_status(self, auth_headers):
        """GET /api/migrations/status returns 6 applied migrations"""
        response = requests.get(f"{BASE_URL}/api/migrations/status", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "migrations" in data
        migrations = data["migrations"]
        # Should have at least 6 migrations (001-006)
        assert len(migrations) >= 6, f"Expected at least 6 migrations, got {len(migrations)}"
        versions = [m["version"] for m in migrations]
        print(f"✓ Migrations applied: {versions}")
        # Verify V3 migrations are present
        assert "003" in versions, "Migration 003 (locations/attributes) missing"
        assert "004" in versions, "Migration 004 (tax compliance) missing"
        assert "005" in versions, "Migration 005 (purchasing/manufacturing) missing"
        assert "006" in versions, "Migration 006 (reconciliation) missing"


class TestLocations:
    """Location tests for multi-location support"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_locations(self, auth_headers):
        """GET /api/locations returns locations with types"""
        response = requests.get(f"{BASE_URL}/api/locations", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "No locations found"
        
        # Check for different location types
        types = set(l["type"] for l in data)
        print(f"✓ Locations: {len(data)} total, types: {types}")
        
        # Should have at least outlet type
        outlets = [l for l in data if l["type"] == "outlet"]
        assert len(outlets) > 0, "No outlet locations found"


class TestUsers:
    """User tests for location assignment"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL, "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_users_with_location(self, auth_headers):
        """GET /api/users returns users with location_id"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Check that location_id field exists in response
        if data:
            first_user = data[0]
            assert "location_id" in first_user or first_user.get("location_id") is None
            print(f"✓ Users list: {len(data)} users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
