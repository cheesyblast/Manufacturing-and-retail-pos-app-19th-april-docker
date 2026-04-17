#!/usr/bin/env python3

import requests
import sys
import os
from datetime import datetime
from pathlib import Path

class ERPAPITester:
    def __init__(self):
        # Get backend URL from frontend .env
        frontend_env = Path("/app/frontend/.env")
        self.base_url = "https://white-label-erp.preview.emergentagent.com"
        
        if frontend_env.exists():
            with open(frontend_env) as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        self.base_url = line.split("=", 1)[1].strip()
                        break
        
        print(f"Testing backend at: {self.base_url}")
        
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test("Health Check", "GET", "health", 200)
        return success

    def test_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@erp.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success:
            print(f"   User: {response.get('email')} ({response.get('role')})")
        return success

    def test_dashboard_stats(self):
        """Test dashboard stats"""
        success, response = self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        if success:
            print(f"   Today Revenue: Rs {response.get('today_revenue', 0)}")
            print(f"   Total Products: {response.get('total_products', 0)}")
        return success

    def test_products_crud(self):
        """Test products CRUD operations"""
        # List products
        success, products = self.run_test("List Products", "GET", "products", 200)
        if not success:
            return False

        # Create product
        product_data = {
            "name": "Test Product",
            "sku": f"TEST-{datetime.now().strftime('%H%M%S')}",
            "unit_price": 100.0,
            "cost_price": 50.0,
            "category": "Test"
        }
        success, product = self.run_test("Create Product", "POST", "products", 200, data=product_data)
        if not success:
            return False
        
        product_id = product.get('id')
        print(f"   Created product ID: {product_id}")

        # Get product
        success, _ = self.run_test("Get Product", "GET", f"products/{product_id}", 200)
        return success

    def test_suppliers_crud(self):
        """Test suppliers CRUD operations"""
        # List suppliers
        success, suppliers = self.run_test("List Suppliers", "GET", "suppliers", 200)
        if not success:
            return False

        # Create supplier
        supplier_data = {
            "name": f"Test Supplier {datetime.now().strftime('%H%M%S')}",
            "contact_person": "John Doe",
            "phone": "1234567890",
            "email": "test@supplier.com"
        }
        success, supplier = self.run_test("Create Supplier", "POST", "suppliers", 200, data=supplier_data)
        if success:
            print(f"   Created supplier ID: {supplier.get('id')}")
        return success

    def test_locations_crud(self):
        """Test locations CRUD operations"""
        # List locations
        success, locations = self.run_test("List Locations", "GET", "locations", 200)
        if not success:
            return False

        # Create location
        location_data = {
            "name": f"Test Outlet {datetime.now().strftime('%H%M%S')}",
            "type": "outlet",
            "address": "123 Test Street"
        }
        success, location = self.run_test("Create Location", "POST", "locations", 200, data=location_data)
        if success:
            print(f"   Created location ID: {location.get('id')}")
        return success

    def test_inventory_operations(self):
        """Test inventory operations"""
        success, inventory = self.run_test("List Inventory", "GET", "inventory", 200)
        return success

    def test_customers_crud(self):
        """Test customers CRUD operations"""
        # List customers
        success, customers = self.run_test("List Customers", "GET", "customers", 200)
        if not success:
            return False

        # Create customer
        customer_data = {
            "name": f"Test Customer {datetime.now().strftime('%H%M%S')}",
            "mobile": f"94{datetime.now().strftime('%H%M%S')}",
            "email": "test@customer.com"
        }
        success, customer = self.run_test("Create Customer", "POST", "customers", 200, data=customer_data)
        if success:
            print(f"   Created customer ID: {customer.get('id')}")
        return success

    def test_sales_operations(self):
        """Test sales operations"""
        success, sales = self.run_test("List Sales", "GET", "sales", 200)
        return success

    def test_manufacturing_operations(self):
        """Test manufacturing operations"""
        # Test BOM
        success, bom_list = self.run_test("List BOM", "GET", "bom", 200)
        if not success:
            return False

        # Test Production Orders
        success, production_orders = self.run_test("List Production Orders", "GET", "production-orders", 200)
        return success

    def test_purchasing_operations(self):
        """Test purchasing operations"""
        # Test Raw Materials
        success, raw_materials = self.run_test("List Raw Materials", "GET", "raw-materials", 200)
        if not success:
            return False

        # Test Purchase Orders
        success, purchase_orders = self.run_test("List Purchase Orders", "GET", "purchase-orders", 200)
        return success

    def test_accounting_operations(self):
        """Test accounting operations"""
        # Daily sales report
        success, daily_sales = self.run_test("Daily Sales Report", "GET", "accounting/daily-sales", 200)
        if not success:
            return False

        # Income statement
        success, income_statement = self.run_test("Income Statement", "GET", "accounting/income-statement", 200)
        if not success:
            return False

        # Balance sheet
        success, balance_sheet = self.run_test("Balance Sheet", "GET", "accounting/balance-sheet", 200)
        return success

    def test_users_operations(self):
        """Test users operations (admin only)"""
        success, users = self.run_test("List Users", "GET", "users", 200)
        return success

    def test_settings_operations(self):
        """Test settings operations"""
        success, settings = self.run_test("Get Settings", "GET", "settings", 200)
        return success

    def test_manual_transactions(self):
        """Test manual transactions CRUD"""
        # List manual transactions
        success, transactions = self.run_test("List Manual Transactions", "GET", "manual-transactions", 200)
        if not success:
            return False

        # Create manual transaction
        tx_data = {
            "type": "expense",
            "category": "Office Supplies",
            "description": "Test expense transaction",
            "amount": 500.0,
            "transaction_date": "2024-01-15"
        }
        success, transaction = self.run_test("Create Manual Transaction", "POST", "manual-transactions", 200, data=tx_data)
        if success:
            print(f"   Created transaction ID: {transaction.get('id')}")
        return success

    def test_transaction_categories(self):
        """Test transaction categories"""
        # List categories
        success, categories = self.run_test("List Transaction Categories", "GET", "transaction-categories", 200)
        if not success:
            return False

        # Create category
        cat_data = {
            "name": f"Test Category {datetime.now().strftime('%H%M%S')}",
            "type": "expense"
        }
        success, category = self.run_test("Create Transaction Category", "POST", "transaction-categories", 200, data=cat_data)
        if success:
            print(f"   Created category ID: {category.get('id')}")
        return success

    def test_custom_orders(self):
        """Test custom orders CRUD"""
        # List custom orders
        success, orders = self.run_test("List Custom Orders", "GET", "custom-orders", 200)
        if not success:
            return False

        # Create custom order
        order_data = {
            "customer_name": f"Test Customer {datetime.now().strftime('%H%M%S')}",
            "customer_mobile": f"94{datetime.now().strftime('%H%M%S')}",
            "description": "Test custom order",
            "total_amount": 5000.0,
            "advance_payment": 1000.0,
            "items": [
                {
                    "item_type": "service",
                    "description": "Custom tailoring",
                    "quantity": 1,
                    "unit_price": 5000.0
                }
            ]
        }
        success, order = self.run_test("Create Custom Order", "POST", "custom-orders", 200, data=order_data)
        if not success:
            return False
        
        order_id = order.get('id')
        print(f"   Created order ID: {order_id}")

        # Test status update
        success, _ = self.run_test("Update Order Status", "PUT", f"custom-orders/{order_id}/status", 200, data={"status": "in_progress"})
        if not success:
            return False

        # Test payment
        payment_data = {
            "amount": 2000.0,
            "payment_method": "cash",
            "payment_type": "balance"
        }
        success, _ = self.run_test("Add Order Payment", "POST", f"custom-orders/{order_id}/payment", 200, data=payment_data)
        return success

    def test_bulk_import_templates(self):
        """Test bulk import template endpoints"""
        # Products template
        success, _ = self.run_test("Products CSV Template", "GET", "products/template-csv", 200)
        if not success:
            return False

        # Inventory template
        success, _ = self.run_test("Inventory CSV Template", "GET", "inventory/template-csv", 200)
        return success

    def test_pagination_and_caching(self):
        """Test pagination and caching features"""
        # Test products with pagination
        success, products = self.run_test("Products with Pagination", "GET", "products?limit=10&offset=0", 200)
        if not success:
            return False
        
        # Test products with search (server-side)
        success, search_results = self.run_test("Products Search", "GET", "products?search=test&limit=5", 200)
        if not success:
            return False

        # Test inventory with pagination
        success, inventory = self.run_test("Inventory with Pagination", "GET", "inventory?limit=10&offset=0", 200)
        return success

def main():
    print("🚀 Starting ERP Backend API Tests")
    print("=" * 50)
    
    tester = ERPAPITester()
    
    # Core tests
    tests = [
        ("Health Check", tester.test_health_check),
        ("Admin Login", tester.test_login),
        ("Auth Me", tester.test_auth_me),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Products CRUD", tester.test_products_crud),
        ("Suppliers CRUD", tester.test_suppliers_crud),
        ("Locations CRUD", tester.test_locations_crud),
        ("Inventory Operations", tester.test_inventory_operations),
        ("Customers CRUD", tester.test_customers_crud),
        ("Sales Operations", tester.test_sales_operations),
        ("Manufacturing Operations", tester.test_manufacturing_operations),
        ("Purchasing Operations", tester.test_purchasing_operations),
        ("Accounting Operations", tester.test_accounting_operations),
        ("Users Operations", tester.test_users_operations),
        ("Settings Operations", tester.test_settings_operations),
        # New V2 features
        ("Manual Transactions", tester.test_manual_transactions),
        ("Transaction Categories", tester.test_transaction_categories),
        ("Custom Orders", tester.test_custom_orders),
        ("Bulk Import Templates", tester.test_bulk_import_templates),
        ("Pagination and Caching", tester.test_pagination_and_caching),
    ]
    
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name}...")
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            tester.failed_tests.append(f"{test_name}: {str(e)}")
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"  - {failure}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())