#!/usr/bin/env python3
"""
SmartKitchen Backend API Test Suite
Tests all API endpoints for the SmartKitchen PWA application
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any

class SmartKitchenAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.tests_run = 0
        self.tests_passed = 0
        self.created_items = []  # Track created items for cleanup

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method: str, endpoint: str, data: Dict[Any, Any] = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_health_check(self):
        """Test basic health endpoint"""
        success, data, status = self.make_request('GET', '/api/health')
        self.log_test("Health Check", success and status == 200, f"Status: {status}")
        return success

    def test_root_endpoint(self):
        """Test root endpoint"""
        success, data, status = self.make_request('GET', '/')
        expected_message = data.get('message', '').lower()
        is_valid = success and 'smartkitchen' in expected_message
        self.log_test("Root Endpoint", is_valid, f"Message: {data.get('message', 'N/A')}")
        return is_valid

    def test_inventory_operations(self):
        """Test all inventory CRUD operations"""
        print("\n🔍 Testing Inventory Operations...")
        
        # Test GET empty inventory
        success, data, status = self.make_request('GET', '/api/inventory')
        self.log_test("Get Inventory (Initial)", success and status == 200, f"Items: {len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test POST - Add inventory item
        test_item = {
            "name": "Test Milk",
            "quantity": 2,
            "unit": "liters",
            "category": "dairy",
            "expiry_date": (datetime.now() + timedelta(days=3)).isoformat(),
            "barcode": "123456789"
        }
        
        success, data, status = self.make_request('POST', '/api/inventory', test_item)
        item_created = success and status == 200
        item_id = data.get('id') if item_created else None
        if item_id:
            self.created_items.append(('inventory', item_id))
        self.log_test("Add Inventory Item", item_created, f"ID: {item_id}")
        
        if not item_created:
            return False
        
        # Test GET inventory after adding item
        success, data, status = self.make_request('GET', '/api/inventory')
        has_items = success and isinstance(data, list) and len(data) > 0
        self.log_test("Get Inventory (After Add)", has_items, f"Items: {len(data) if isinstance(data, list) else 0}")
        
        # Test PUT - Update inventory item
        updated_item = test_item.copy()
        updated_item['quantity'] = 3
        updated_item['name'] = "Updated Test Milk"
        
        success, data, status = self.make_request('PUT', f'/api/inventory/{item_id}', updated_item)
        self.log_test("Update Inventory Item", success and status == 200, f"Status: {status}")
        
        # Test DELETE - Delete inventory item
        success, data, status = self.make_request('DELETE', f'/api/inventory/{item_id}')
        item_deleted = success and status == 200
        if item_deleted:
            self.created_items.remove(('inventory', item_id))
        self.log_test("Delete Inventory Item", item_deleted, f"Status: {status}")
        
        return True

    def test_barcode_lookup(self):
        """Test barcode lookup functionality"""
        print("\n🔍 Testing Barcode Lookup...")
        
        # Test known mock barcodes
        mock_barcodes = ["123456789", "987654321", "456789123"]
        
        for barcode in mock_barcodes:
            success, data, status = self.make_request('GET', f'/api/barcode/{barcode}')
            has_product_info = success and 'name' in data and 'barcode' in data
            self.log_test(f"Barcode Lookup ({barcode})", has_product_info, 
                         f"Product: {data.get('name', 'N/A')}")
        
        # Test unknown barcode
        success, data, status = self.make_request('GET', '/api/barcode/999999999')
        has_fallback = success and 'name' in data
        self.log_test("Barcode Lookup (Unknown)", has_fallback, 
                     f"Fallback: {data.get('name', 'N/A')}")
        
        return True

    def test_recipe_operations(self):
        """Test recipe operations"""
        print("\n🔍 Testing Recipe Operations...")
        
        # Test GET recipes
        success, data, status = self.make_request('GET', '/api/recipes')
        self.log_test("Get Recipes", success and status == 200, f"Recipes: {len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test POST - Add recipe
        test_recipe = {
            "name": "Test Recipe",
            "ingredients": ["test ingredient 1", "test ingredient 2"],
            "instructions": ["Step 1", "Step 2"],
            "prep_time": 15,
            "difficulty": "easy",
            "category": "test"
        }
        
        success, data, status = self.make_request('POST', '/api/recipes', test_recipe)
        recipe_created = success and status == 200
        recipe_id = data.get('id') if recipe_created else None
        if recipe_id:
            self.created_items.append(('recipes', recipe_id))
        self.log_test("Add Recipe", recipe_created, f"ID: {recipe_id}")
        
        # Test GET expiring recipes
        success, data, status = self.make_request('GET', '/api/recipes/expiring')
        self.log_test("Get Expiring Recipes", success and status == 200, f"Count: {len(data) if isinstance(data, list) else 'N/A'}")
        
        return True

    def test_challenge_operations(self):
        """Test challenge operations"""
        print("\n🔍 Testing Challenge Operations...")
        
        # Test GET challenges
        success, data, status = self.make_request('GET', '/api/challenges')
        self.log_test("Get Challenges", success and status == 200, f"Challenges: {len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test POST - Add challenge
        test_challenge = {
            "title": "Test Challenge",
            "description": "This is a test challenge",
            "points": 50,
            "type": "daily",
            "deadline": (datetime.now() + timedelta(days=1)).isoformat()
        }
        
        success, data, status = self.make_request('POST', '/api/challenges', test_challenge)
        challenge_created = success and status == 200
        challenge_id = data.get('id') if challenge_created else None
        if challenge_id:
            self.created_items.append(('challenges', challenge_id))
        self.log_test("Add Challenge", challenge_created, f"ID: {challenge_id}")
        
        return True

    def test_deals_operations(self):
        """Test deals operations"""
        print("\n🔍 Testing Deals Operations...")
        
        # Test GET deals
        success, data, status = self.make_request('GET', '/api/deals')
        self.log_test("Get Deals", success and status == 200, f"Deals: {len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test POST - Add deal
        test_deal = {
            "title": "Test Deal",
            "description": "This is a test deal",
            "discount": "25%",
            "store_name": "Test Store",
            "sponsored": True,
            "expiry_date": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        success, data, status = self.make_request('POST', '/api/deals', test_deal)
        deal_created = success and status == 200
        deal_id = data.get('id') if deal_created else None
        if deal_id:
            self.created_items.append(('deals', deal_id))
        self.log_test("Add Deal", deal_created, f"ID: {deal_id}")
        
        return True

    def test_waste_operations(self):
        """Test waste tracking operations"""
        print("\n🔍 Testing Waste Operations...")
        
        # First add an inventory item to reference
        test_item = {
            "name": "Waste Test Item",
            "quantity": 5,
            "unit": "pieces",
            "category": "test"
        }
        
        success, data, status = self.make_request('POST', '/api/inventory', test_item)
        item_id = data.get('id') if success else "test-id"
        if success and item_id:
            self.created_items.append(('inventory', item_id))
        
        # Test GET waste items
        success, data, status = self.make_request('GET', '/api/waste')
        self.log_test("Get Waste Items", success and status == 200, f"Items: {len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test POST - Add waste item
        test_waste = {
            "original_item_id": item_id,
            "item_name": "Waste Test Item",
            "quantity": 2,
            "reason": "expired"
        }
        
        success, data, status = self.make_request('POST', '/api/waste', test_waste)
        waste_created = success and status == 200
        waste_id = data.get('id') if waste_created else None
        if waste_id:
            self.created_items.append(('waste', waste_id))
        self.log_test("Add Waste Item", waste_created, f"ID: {waste_id}")
        
        return True

    def test_user_operations(self):
        """Test user operations"""
        print("\n🔍 Testing User Operations...")
        
        # Test GET users
        success, data, status = self.make_request('GET', '/api/users')
        self.log_test("Get Users", success and status == 200, f"Users: {len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test POST - Add user
        test_user = {
            "name": "Test User",
            "email": "test@example.com",
            "points": 100,
            "preferences": {"theme": "light"}
        }
        
        success, data, status = self.make_request('POST', '/api/users', test_user)
        user_created = success and status == 200
        user_id = data.get('id') if user_created else None
        if user_id:
            self.created_items.append(('users', user_id))
        self.log_test("Add User", user_created, f"ID: {user_id}")
        
        return True

    def test_notifications(self):
        """Test expiry notifications"""
        print("\n🔍 Testing Notifications...")
        
        # Add an item that expires soon
        expiring_item = {
            "name": "Expiring Test Item",
            "quantity": 1,
            "unit": "pieces",
            "category": "test",
            "expiry_date": (datetime.now() + timedelta(days=1)).isoformat()
        }
        
        success, data, status = self.make_request('POST', '/api/inventory', expiring_item)
        item_id = data.get('id') if success else None
        if item_id:
            self.created_items.append(('inventory', item_id))
        
        # Test GET expiring notifications
        success, data, status = self.make_request('GET', '/api/notifications/expiring')
        has_notifications = success and isinstance(data, list)
        self.log_test("Get Expiry Notifications", has_notifications, 
                     f"Notifications: {len(data) if isinstance(data, list) else 'N/A'}")
        
        return True

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        for collection, item_id in self.created_items:
            success, _, status = self.make_request('DELETE', f'/api/{collection}/{item_id}')
            if success:
                print(f"✅ Cleaned up {collection} item: {item_id}")
            else:
                print(f"⚠️ Failed to clean up {collection} item: {item_id}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting SmartKitchen API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity tests
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
        
        self.test_root_endpoint()
        
        # Core functionality tests
        self.test_inventory_operations()
        self.test_barcode_lookup()
        self.test_recipe_operations()
        self.test_challenge_operations()
        self.test_deals_operations()
        self.test_waste_operations()
        self.test_user_operations()
        self.test_notifications()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️ {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    # Get backend URL from environment or use default
    import os
    backend_url = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
    
    # Initialize tester
    tester = SmartKitchenAPITester(backend_url)
    
    # Run tests
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())