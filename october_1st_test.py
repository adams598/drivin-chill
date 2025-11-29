#!/usr/bin/env python3
"""
October 1st, 2025 Booking Investigation Test
Focused test to investigate why clients cannot book for October 1st, 2025
"""

import requests
import sys
from datetime import datetime, date, timedelta
import json

class October1stInvestigator:
    def __init__(self, base_url="https://cinema-admin-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
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

    def investigate_october_1st(self):
        """Main investigation for October 1st, 2025 booking issue"""
        print(f"\n🔍 OCTOBER 1ST 2025 BOOKING INVESTIGATION")
        print("=" * 60)
        
        october_1st = "2025-10-01"  # Wednesday
        
        # Step 1: Check existing schedules for October 1st
        print(f"\n📅 Step 1: Checking existing schedules for {october_1st}...")
        self.check_existing_schedules(october_1st)
        
        # Step 2: Create test event for October 1st
        print(f"\n🎭 Step 2: Creating test event for {october_1st}...")
        event_created, event_id = self.create_test_event()
        
        if event_created:
            # Step 3: Schedule the event for October 1st
            print(f"\n📋 Step 3: Scheduling event for {october_1st}...")
            schedule_created, schedule_id = self.schedule_event(event_id, october_1st)
            
            if schedule_created:
                # Step 4: Test availability for October 1st
                print(f"\n🔍 Step 4: Testing availability for {october_1st}...")
                self.test_availability(october_1st)
                
                # Step 5: Test booking creation for October 1st
                print(f"\n🎫 Step 5: Testing booking creation for {october_1st}...")
                booking_created, booking_id = self.test_booking_creation(october_1st)
                
                if booking_created:
                    # Step 6: Test promo codes with October 1st booking
                    print(f"\n🎟️ Step 6: Testing promo codes for {october_1st}...")
                    self.test_promo_codes(october_1st)
                    
                    # Step 7: Test payment flow
                    print(f"\n💳 Step 7: Testing payment flow for {october_1st}...")
                    self.test_payment_flow(booking_id)
                    
                    # Cleanup booking
                    self.cleanup_booking(booking_id)
                
                # Cleanup schedule
                self.cleanup_schedule(schedule_id)
            
            # Cleanup event
            self.cleanup_event(event_id)
        
        print(f"\n✅ October 1st investigation completed!")

    def check_existing_schedules(self, date):
        """Check if there are existing schedules for October 1st"""
        print(f"   Checking content_schedules for {date}...")
        
        # Check content schedules
        success, response = self.run_test(
            f"Check Content Schedules for {date}",
            "GET",
            "content-schedules",
            200,
            params={"date_from": date, "date_to": date}
        )
        
        if success:
            schedules_count = len(response) if isinstance(response, list) else 0
            print(f"   Found {schedules_count} content schedules for {date}")
            
            if schedules_count > 0:
                for schedule in response:
                    content_type = schedule.get('schedule', {}).get('content_type', 'unknown')
                    time_slot = schedule.get('schedule', {}).get('time_slot', 'unknown')
                    custom_time = schedule.get('schedule', {}).get('custom_time', None)
                    content_title = schedule.get('content', {}).get('title', 'unknown')
                    
                    time_info = custom_time if custom_time else time_slot
                    print(f"     - {content_type}: {content_title} at {time_info}")
        
        # Check legacy movie schedules
        print(f"   Checking legacy movie_schedules for {date}...")
        success, response = self.run_test(
            f"Check Movie Schedules for {date}",
            "GET",
            "movie-schedules",
            200,
            params={"date": date}
        )
        
        if success:
            schedules_count = len(response) if isinstance(response, list) else 0
            print(f"   Found {schedules_count} legacy movie schedules for {date}")

    def create_test_event(self):
        """Create a test event for October 1st testing"""
        event_data = {
            "title": "October 1st Test Event",
            "description": "Test event created to investigate October 1st booking issue",
            "duration_minutes": 120,
            "event_type": "test",
            "organizer": "Testing Team",
            "price": 15.0
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

        try:
            response = requests.post(f"{self.api_url}/events", json=event_data, headers=headers)
            if response.status_code == 200:
                event_id = response.json()['id']
                print(f"   ✅ Test event created: {event_id}")
                return True, event_id
            else:
                print(f"   ❌ Failed to create event: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error details: {error_data}")
                except:
                    print(f"   Error text: {response.text}")
                return False, None
        except Exception as e:
            print(f"   ❌ Error creating event: {str(e)}")
            return False, None

    def schedule_event(self, event_id, date):
        """Schedule the test event for October 1st"""
        schedule_data = {
            "content_id": event_id,
            "content_type": "event",
            "date": date,
            "time_slot": "21h15",  # Standard first slot
            "custom_time": "20h00",  # Custom time for event
            "capacity": 21
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

        try:
            response = requests.post(f"{self.api_url}/content-schedules", json=schedule_data, headers=headers)
            if response.status_code == 200:
                schedule_id = response.json()['id']
                print(f"   ✅ Event scheduled for {date}: {schedule_id}")
                return True, schedule_id
            else:
                print(f"   ❌ Failed to schedule event: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error details: {error_data}")
                except:
                    print(f"   Error text: {response.text}")
                return False, None
        except Exception as e:
            print(f"   ❌ Error scheduling event: {str(e)}")
            return False, None

    def test_availability(self, date):
        """Test availability checking for October 1st"""
        for time_slot in ["21h15", "23h45"]:
            success, response = self.run_test(
                f"Check Availability {date} {time_slot}",
                "GET",
                "availability",
                200,
                params={
                    "booking_date": date,
                    "time_slot": time_slot
                }
            )
            
            if success:
                is_available = response.get('is_available', False)
                is_booking_open = response.get('is_booking_open', False)
                hours_until_show = response.get('hours_until_show', 0)
                closure_reason = response.get('closure_reason', None)
                
                print(f"   {time_slot}: Available={is_available}, Booking Open={is_booking_open}")
                print(f"   Hours until show: {hours_until_show}, Closure reason: {closure_reason}")

    def test_booking_creation(self, date):
        """Test booking creation for October 1st"""
        booking_data = {
            "first_name": "October",
            "last_name": "Tester",
            "email": "october.test@drivinandchill.com",
            "phone": "06 12 34 56 78",
            "booking_date": date,
            "day_of_week": "mercredi",  # Wednesday
            "time_slot": "21h15",
            "payment_method": "card"
        }
        
        success, response = self.run_test(
            f"Create Booking for {date}",
            "POST",
            "bookings",
            200,
            data=booking_data
        )
        
        if success and 'id' in response:
            booking_id = response['id']
            print(f"   ✅ Booking created successfully: {booking_id}")
            print(f"   Final price: {response.get('final_price', response.get('price', 'N/A'))}€")
            return True, booking_id
        else:
            print(f"   ❌ Failed to create booking for {date}")
            return False, None

    def test_promo_codes(self, date):
        """Test promo code validation for October 1st bookings"""
        promo_codes = [
            {"code": "GRATUIT100", "expected_final_price": 0.0},
            {"code": "REDUCTION20", "expected_discount": 20},
            {"code": "SNACKGRATUIT", "expected_benefits": True}
        ]
        
        for promo in promo_codes:
            validation_data = {
                "code": promo["code"],
                "booking_price": 15.0  # Event price
            }
            
            success, response = self.run_test(
                f"Validate Promo Code {promo['code']} for {date}",
                "POST",
                "validate-promo-code",
                200,
                data=validation_data
            )
            
            if success:
                valid = response.get('valid', False)
                final_price = response.get('final_price', None)
                benefit_description = response.get('benefit_description', None)
                
                print(f"   {promo['code']}: Valid={valid}, Final Price={final_price}€")
                if benefit_description:
                    print(f"   Benefits: {benefit_description}")

    def test_payment_flow(self, booking_id):
        """Test payment flow for October 1st booking"""
        if not booking_id:
            print("   ⚠️ Skipping payment test - No booking ID")
            return
        
        payment_data = {
            "booking_id": booking_id,
            "origin_url": self.base_url
        }
        
        success, response = self.run_test(
            f"Create Payment Checkout for October 1st Booking",
            "POST",
            "payments/create-checkout",
            200,
            data=payment_data
        )
        
        if success:
            checkout_url = response.get('checkout_url', '')
            session_id = response.get('session_id', '')
            is_free = response.get('is_free', False)
            
            print(f"   Payment setup successful")
            print(f"   Is free booking: {is_free}")
            if session_id:
                print(f"   Session ID: {session_id}")

    def cleanup_booking(self, booking_id):
        """Clean up test booking"""
        if booking_id:
            try:
                response = requests.post(f"{self.api_url}/bookings/{booking_id}/cancel")
                if response.status_code == 200:
                    print(f"   🧹 Test booking cancelled: {booking_id}")
            except:
                pass

    def cleanup_schedule(self, schedule_id):
        """Clean up test schedule"""
        if schedule_id:
            headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer admin_token_2024'
            }
            try:
                response = requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", headers=headers)
                if response.status_code == 200:
                    print(f"   🧹 Test schedule deleted: {schedule_id}")
            except:
                pass

    def cleanup_event(self, event_id):
        """Clean up test event"""
        if event_id:
            headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer admin_token_2024'
            }
            try:
                response = requests.delete(f"{self.api_url}/events/{event_id}", headers=headers)
                if response.status_code == 200:
                    print(f"   🧹 Test event deleted: {event_id}")
            except:
                pass

    def test_wednesday_booking_rules(self):
        """Test that events are allowed on Wednesdays but movies are not"""
        print(f"\n🔍 Testing Wednesday Booking Rules...")
        
        # Get next Wednesday
        today = date.today()
        days_ahead = 2 - today.weekday()  # Wednesday is 2
        if days_ahead <= 0:
            days_ahead += 7
        next_wednesday = today + timedelta(days_ahead)
        
        print(f"   Testing date: {next_wednesday} (Wednesday)")
        
        # Test movie booking on Wednesday (should fail)
        movie_booking_data = {
            "first_name": "Wednesday",
            "last_name": "MovieTest",
            "email": "wednesday.movie@test.com",
            "booking_date": next_wednesday.isoformat(),
            "day_of_week": "mercredi",
            "time_slot": "21h15",
            "payment_method": "card"
        }
        
        success, response = self.run_test(
            "Movie Booking on Wednesday (Should Fail)",
            "POST",
            "bookings",
            400,  # Should fail
            data=movie_booking_data
        )
        
        if success:
            print("   ✅ Movie booking correctly rejected on Wednesday")

    def test_payment_metadata_validation(self):
        """Test payment metadata validation issues"""
        print(f"\n🔍 Testing Payment Metadata Validation...")
        
        # Create a test booking first
        next_friday = date.today() + timedelta(days=7)
        booking_data = {
            "first_name": "Payment",
            "last_name": "MetadataTest",
            "email": "payment.metadata@test.com",
            "booking_date": next_friday.isoformat(),
            "day_of_week": "vendredi",
            "time_slot": "21h15",
            "payment_method": "card",
            "promo_code": None  # Test null promo code handling
        }
        
        success, response = self.run_test(
            "Create Booking with Null Promo Code",
            "POST",
            "bookings",
            200,
            data=booking_data
        )
        
        if success and 'id' in response:
            booking_id = response['id']
            
            # Test payment creation with null metadata
            payment_data = {
                "booking_id": booking_id,
                "origin_url": self.base_url
            }
            
            payment_success, payment_response = self.run_test(
                "Create Payment with Null Metadata",
                "POST",
                "payments/create-checkout",
                200,
                data=payment_data
            )
            
            if payment_success:
                print("   ✅ Payment creation handled null metadata correctly")
            else:
                print("   ❌ Payment creation failed with null metadata")
            
            # Cleanup
            self.cleanup_booking(booking_id)

def main():
    print("🎬 October 1st, 2025 Booking Investigation")
    print("=" * 80)
    
    investigator = October1stInvestigator()
    
    # Run the investigation
    investigator.investigate_october_1st()
    investigator.test_wednesday_booking_rules()
    investigator.test_payment_metadata_validation()
    
    # Final summary
    print("\n" + "=" * 80)
    print(f"🏁 Investigation completed!")
    print(f"✅ Passed: {investigator.tests_passed}/{investigator.tests_run}")
    print(f"❌ Failed: {investigator.tests_run - investigator.tests_passed}/{investigator.tests_run}")
    print(f"📊 Success rate: {(investigator.tests_passed/investigator.tests_run)*100:.1f}%")

if __name__ == "__main__":
    main()