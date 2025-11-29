import requests
import sys
from datetime import datetime, date, timedelta
import json

class CriticalIssuesAPITester:
    def __init__(self, base_url="https://cinema-admin-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_weekly_schedule_endpoint_basic(self):
        """Test 1: Weekly Schedule Endpoint - Basic Functionality"""
        print(f"\n🎬 CRITICAL ISSUE 1: WEEKLY SCHEDULE DISPLAY")
        print(f"=" * 60)
        
        success, response = self.run_test(
            "Weekly Schedule Endpoint - Basic Access",
            "GET",
            "weekly-schedule",
            200
        )
        
        if success:
            # Validate response structure
            if isinstance(response, list):
                print(f"   ✅ Returns list format as expected")
                print(f"   📊 Number of scheduled items: {len(response)}")
                
                if len(response) > 0:
                    # Check first item structure
                    first_item = response[0]
                    required_fields = ['schedule', 'content']
                    missing_fields = [field for field in required_fields if field not in first_item]
                    
                    if not missing_fields:
                        print(f"   ✅ ContentScheduleWithDetails structure present")
                        
                        # Check schedule fields
                        schedule = first_item.get('schedule', {})
                        schedule_fields = ['date', 'time_slot', 'content_type']
                        schedule_missing = [field for field in schedule_fields if field not in schedule]
                        
                        if not schedule_missing:
                            print(f"   ✅ Schedule contains required fields")
                            print(f"   📅 Date: {schedule.get('date')}")
                            print(f"   ⏰ Time Slot: {schedule.get('time_slot')}")
                            print(f"   🎭 Content Type: {schedule.get('content_type')}")
                        else:
                            print(f"   ⚠️ Missing schedule fields: {schedule_missing}")
                        
                        # Check content fields
                        content = first_item.get('content', {})
                        if 'title' in content:
                            print(f"   🎬 Content Title: {content.get('title')}")
                        
                    else:
                        print(f"   ⚠️ Missing required fields: {missing_fields}")
                else:
                    print(f"   ℹ️ No content scheduled for current/upcoming weeks")
            else:
                print(f"   ❌ Response is not a list format")
        
        return success

    def test_weekly_schedule_time_slot_information(self):
        """Test 2: Weekly Schedule - Time Slot Information Display"""
        success, response = self.run_test(
            "Weekly Schedule - Time Slot Information",
            "GET",
            "weekly-schedule",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   🔍 Analyzing time slot information...")
            
            # Check if time slots are using dynamic settings
            time_slots_found = set()
            for item in response:
                schedule = item.get('schedule', {})
                time_slot = schedule.get('time_slot')
                if time_slot:
                    time_slots_found.add(time_slot)
            
            print(f"   ⏰ Time slots found: {list(time_slots_found)}")
            
            # Verify time slots are not hardcoded old values
            old_hardcoded_slots = {"21h15", "23h45"}  # Old hardcoded values
            if time_slots_found.intersection(old_hardcoded_slots):
                print(f"   ⚠️ Found old hardcoded time slots - checking if they match current admin settings...")
            
            # Check sorting (21h15 should come before 23h45 or equivalent)
            if len(response) > 1:
                is_sorted = True
                for i in range(len(response) - 1):
                    current_date = response[i]['schedule']['date']
                    next_date = response[i + 1]['schedule']['date']
                    
                    if current_date == next_date:
                        current_slot = response[i]['schedule']['time_slot']
                        next_slot = response[i + 1]['schedule']['time_slot']
                        # First slot should come before second slot
                        if current_slot > next_slot:  # Simple string comparison for time
                            is_sorted = False
                            break
                
                if is_sorted:
                    print(f"   ✅ Items properly sorted by date and time slot")
                else:
                    print(f"   ⚠️ Items may not be properly sorted")
        
        return success

    def test_weekly_schedule_flexibility(self):
        """Test 3: Weekly Schedule - Flexibility (shows films from upcoming weeks)"""
        success, response = self.run_test(
            "Weekly Schedule - Upcoming Weeks Flexibility",
            "GET",
            "weekly-schedule",
            200
        )
        
        if success:
            print(f"   🔍 Testing flexibility to show upcoming weeks content...")
            
            if isinstance(response, list):
                if len(response) > 0:
                    print(f"   ✅ Endpoint returns content (either current or upcoming weeks)")
                    
                    # Check date range of returned content
                    dates_found = []
                    for item in response:
                        schedule = item.get('schedule', {})
                        item_date = schedule.get('date')
                        if item_date:
                            dates_found.append(item_date)
                    
                    if dates_found:
                        dates_found.sort()
                        print(f"   📅 Date range: {dates_found[0]} to {dates_found[-1]}")
                        
                        # Check if dates are in the future (indicating flexibility)
                        today = date.today().isoformat()
                        future_dates = [d for d in dates_found if d >= today]
                        
                        if future_dates:
                            print(f"   ✅ Shows future content ({len(future_dates)} items)")
                        else:
                            print(f"   ⚠️ No future content found")
                else:
                    print(f"   ℹ️ No content found - endpoint handles empty weeks gracefully")
            else:
                print(f"   ❌ Invalid response format")
        
        return success

    def test_time_slots_public_endpoint(self):
        """Test 4: Time Slots - Public Endpoint"""
        print(f"\n⏰ CRITICAL ISSUE 2: DYNAMIC TIME SLOTS")
        print(f"=" * 60)
        
        success, response = self.run_test(
            "Time Slots - Public Endpoint",
            "GET",
            "time-slots",
            200
        )
        
        if success:
            # Validate time slot settings structure
            required_fields = [
                'first_slot_entry_time',
                'first_slot_start_time', 
                'second_slot_entry_time',
                'second_slot_start_time'
            ]
            
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                print(f"   ✅ All required time slot fields present")
                print(f"   🚪 First Slot Entry: {response.get('first_slot_entry_time')}")
                print(f"   ▶️ First Slot Start: {response.get('first_slot_start_time')}")
                print(f"   🚪 Second Slot Entry: {response.get('second_slot_entry_time')}")
                print(f"   ▶️ Second Slot Start: {response.get('second_slot_start_time')}")
                
                # Store current settings for comparison
                self.current_time_settings = response
            else:
                print(f"   ❌ Missing required fields: {missing_fields}")
        
        return success

    def test_time_slots_admin_get(self):
        """Test 5: Time Slots - Admin GET Endpoint"""
        success, response = self.run_test(
            "Time Slots - Admin GET (with auth)",
            "GET",
            "admin/time-slots",
            200,
            headers=self.admin_headers
        )
        
        if success:
            print(f"   ✅ Admin can access time slot settings")
            
            # Compare with public endpoint
            if hasattr(self, 'current_time_settings'):
                public_settings = self.current_time_settings
                admin_settings = response
                
                if (public_settings.get('first_slot_start_time') == admin_settings.get('first_slot_start_time') and
                    public_settings.get('second_slot_start_time') == admin_settings.get('second_slot_start_time')):
                    print(f"   ✅ Admin and public endpoints return consistent data")
                else:
                    print(f"   ⚠️ Inconsistency between admin and public endpoints")
        
        return success

    def test_time_slots_admin_no_auth(self):
        """Test 6: Time Slots - Admin Endpoint Without Auth"""
        success, response = self.run_test(
            "Time Slots - Admin GET (no auth)",
            "GET",
            "admin/time-slots",
            403  # Should be forbidden
        )
        
        if success:
            print(f"   ✅ Proper authentication required for admin endpoint")
        
        return success

    def test_time_slots_admin_update(self):
        """Test 7: Time Slots - Admin Update Functionality"""
        # Test updating time slots to verify dynamic functionality
        test_settings = {
            "first_slot_entry_time": "20h30",
            "first_slot_start_time": "20h45",
            "second_slot_entry_time": "22h45", 
            "second_slot_start_time": "23h00"
        }
        
        success, response = self.run_test(
            "Time Slots - Admin Update",
            "PUT",
            "admin/time-slots",
            200,
            data=test_settings,
            headers=self.admin_headers
        )
        
        if success:
            print(f"   ✅ Time slot settings updated successfully")
            
            # Verify the update took effect
            updated_settings = response
            for key, expected_value in test_settings.items():
                if updated_settings.get(key) == expected_value:
                    print(f"   ✅ {key}: {expected_value} ✓")
                else:
                    print(f"   ❌ {key}: Expected {expected_value}, got {updated_settings.get(key)}")
            
            # Store updated settings for verification
            self.updated_time_settings = updated_settings
        
        return success

    def test_time_slots_persistence(self):
        """Test 8: Time Slots - Settings Persistence"""
        # Check if updated settings persist by calling public endpoint again
        success, response = self.run_test(
            "Time Slots - Settings Persistence Check",
            "GET",
            "time-slots",
            200
        )
        
        if success and hasattr(self, 'updated_time_settings'):
            updated_settings = self.updated_time_settings
            current_settings = response
            
            # Compare key settings
            matches = 0
            total_checks = 4
            
            for field in ['first_slot_entry_time', 'first_slot_start_time', 
                         'second_slot_entry_time', 'second_slot_start_time']:
                if updated_settings.get(field) == current_settings.get(field):
                    matches += 1
                    print(f"   ✅ {field}: {current_settings.get(field)} (persisted)")
                else:
                    print(f"   ❌ {field}: Expected {updated_settings.get(field)}, got {current_settings.get(field)}")
            
            if matches == total_checks:
                print(f"   ✅ All time slot updates persisted correctly")
            else:
                print(f"   ⚠️ Only {matches}/{total_checks} settings persisted")
        
        return success

    def test_time_slots_admin_update_no_auth(self):
        """Test 9: Time Slots - Admin Update Without Auth"""
        test_settings = {
            "first_slot_start_time": "21h00"
        }
        
        success, response = self.run_test(
            "Time Slots - Admin Update (no auth)",
            "PUT",
            "admin/time-slots",
            403,  # Should be forbidden
            data=test_settings
        )
        
        if success:
            print(f"   ✅ Proper authentication required for admin updates")
        
        return success

    def test_time_slots_admin_update_empty_data(self):
        """Test 10: Time Slots - Admin Update with Empty Data"""
        success, response = self.run_test(
            "Time Slots - Admin Update (empty data)",
            "PUT",
            "admin/time-slots",
            400,  # Should be bad request
            data={},
            headers=self.admin_headers
        )
        
        if success:
            print(f"   ✅ Properly rejects empty update requests")
        
        return success

    def test_availability_endpoint_with_dynamic_time_slots(self):
        """Test 11: Availability Endpoint - Uses Dynamic Time Slots"""
        print(f"\n🔍 INTEGRATION TEST: Dynamic Time Slots in Availability")
        print(f"=" * 60)
        
        # Get a future Friday for testing
        today = date.today()
        days_ahead = 4 - today.weekday()  # Friday is 4
        if days_ahead <= 0:
            days_ahead += 7
        next_friday = today + timedelta(days_ahead)
        
        success, response = self.run_test(
            "Availability - Dynamic Time Slots Integration",
            "GET",
            "availability",
            200,
            params={
                "booking_date": next_friday.isoformat(),
                "time_slot": "21h15"  # Using enum value
            }
        )
        
        if success:
            # Check if response includes dynamic time slot information
            expected_fields = [
                'show_datetime',
                'booking_closes_at',
                'hours_until_show',
                'is_booking_open'
            ]
            
            missing_fields = [field for field in expected_fields if field not in response]
            
            if not missing_fields:
                print(f"   ✅ Enhanced availability response with 24h cutoff fields")
                print(f"   📅 Show DateTime: {response.get('show_datetime')}")
                print(f"   🔒 Booking Closes At: {response.get('booking_closes_at')}")
                print(f"   ⏰ Hours Until Show: {response.get('hours_until_show')}")
                print(f"   🎫 Booking Open: {response.get('is_booking_open')}")
                
                if response.get('closure_reason'):
                    print(f"   🚫 Closure Reason: {response.get('closure_reason')}")
            else:
                print(f"   ⚠️ Missing enhanced fields: {missing_fields}")
        
        return success

    def test_weekly_schedule_content_types(self):
        """Test 12: Weekly Schedule - Content Types Support"""
        success, response = self.run_test(
            "Weekly Schedule - Content Types (Movies & Events)",
            "GET",
            "weekly-schedule",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   🔍 Analyzing content type support...")
            
            content_types_found = set()
            for item in response:
                schedule = item.get('schedule', {})
                content_type = schedule.get('content_type')
                if content_type:
                    content_types_found.add(content_type)
            
            print(f"   🎭 Content types found: {list(content_types_found)}")
            
            # Check for both movies and events support
            if 'movie' in content_types_found:
                print(f"   ✅ Movies supported in weekly schedule")
            if 'event' in content_types_found:
                print(f"   ✅ Events supported in weekly schedule")
            
            if len(content_types_found) > 1:
                print(f"   ✅ Multiple content types supported")
            elif len(content_types_found) == 1:
                print(f"   ℹ️ Single content type found (may be expected)")
        
        return success

    def run_all_critical_tests(self):
        """Run all critical issue tests"""
        print(f"\n🚨 CRITICAL ISSUES VERIFICATION")
        print(f"=" * 80)
        print(f"Testing two critical fixes:")
        print(f"1. Weekly Schedule Display - Flexible week selection")
        print(f"2. Dynamic Time Slots - Admin configurable time slots")
        print(f"=" * 80)
        
        # Weekly Schedule Tests
        self.test_weekly_schedule_endpoint_basic()
        self.test_weekly_schedule_time_slot_information()
        self.test_weekly_schedule_flexibility()
        self.test_weekly_schedule_content_types()
        
        # Dynamic Time Slots Tests
        self.test_time_slots_public_endpoint()
        self.test_time_slots_admin_get()
        self.test_time_slots_admin_no_auth()
        self.test_time_slots_admin_update()
        self.test_time_slots_persistence()
        self.test_time_slots_admin_update_no_auth()
        self.test_time_slots_admin_update_empty_data()
        
        # Integration Tests
        self.test_availability_endpoint_with_dynamic_time_slots()
        
        # Print summary
        print(f"\n📊 CRITICAL ISSUES TEST SUMMARY")
        print(f"=" * 50)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print(f"🎉 ALL CRITICAL ISSUES TESTS PASSED!")
            print(f"✅ Weekly Schedule Display: WORKING")
            print(f"✅ Dynamic Time Slots: WORKING")
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️ {failed_tests} test(s) failed")
            print(f"❌ Some critical issues may need attention")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    print("🎬 Drive-In Cinema - Critical Issues API Tester")
    print("=" * 60)
    
    tester = CriticalIssuesAPITester()
    success = tester.run_all_critical_tests()
    
    if success:
        print(f"\n🎉 All critical issues have been resolved!")
        sys.exit(0)
    else:
        print(f"\n⚠️ Some critical issues require attention")
        sys.exit(1)