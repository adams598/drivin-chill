import requests
import sys
from datetime import datetime, date, timedelta
import json

class MovieSchedulingTester:
    def __init__(self, base_url="https://cinema-admin-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.movie_id_for_scheduling = None
        self.created_schedule_id = None

    def test_movie_scheduling_get_movies_with_auth(self):
        """Test GET /api/movies with admin authentication"""
        url = f"{self.api_url}/movies"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

        self.tests_run += 1
        print(f"\n🔍 Testing GET /api/movies (With Admin Auth)...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers)
            print(f"   Status: {response.status_code}")
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Movies found: {len(response_data)}")
                    if len(response_data) > 0:
                        print(f"   Sample movie: {response_data[0].get('title', 'N/A')}")
                        # Store first movie ID for scheduling tests
                        if 'id' in response_data[0]:
                            self.movie_id_for_scheduling = response_data[0]['id']
                    return True, response_data
                except Exception as e:
                    print(f"   ⚠️ Error parsing response: {str(e)}")
                    return True, []
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, []

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, []

    def test_movie_scheduling_get_schedules_with_auth(self):
        """Test GET /api/movie-schedules with admin authentication"""
        url = f"{self.api_url}/movie-schedules"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

        self.tests_run += 1
        print(f"\n🔍 Testing GET /api/movie-schedules (With Admin Auth)...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers)
            print(f"   Status: {response.status_code}")
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Schedules found: {len(response_data)}")
                    if len(response_data) > 0:
                        schedule = response_data[0]
                        print(f"   Sample schedule: {schedule.get('schedule', {}).get('date', 'N/A')} at {schedule.get('schedule', {}).get('time_slot', 'N/A')}")
                    return True, response_data
                except Exception as e:
                    print(f"   ⚠️ Error parsing response: {str(e)}")
                    return True, []
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, []

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, []

    def test_movie_scheduling_create_schedule_critical(self):
        """Test POST /api/movie-schedules - MOST CRITICAL TEST"""
        # First ensure we have a movie to schedule
        if not self.movie_id_for_scheduling:
            print("⚠️  No movie ID available, getting movies first...")
            success, movies = self.test_movie_scheduling_get_movies_with_auth()
            if not success or not movies:
                print("❌ Cannot proceed without movies")
                return False

        # Use future date (December 1st, 2025 as specified in review)
        future_date = "2025-12-01"
        
        schedule_data = {
            "movie_id": self.movie_id_for_scheduling,
            "date": future_date,
            "time_slot": "21h15",  # As specified in review
            "capacity": 21  # As specified in review
        }
        
        url = f"{self.api_url}/movie-schedules"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

        self.tests_run += 1
        print(f"\n🔍 Testing POST /api/movie-schedules - CRITICAL TEST...")
        print(f"   URL: {url}")
        print(f"   Data: {json.dumps(schedule_data, indent=2)}")
        
        try:
            response = requests.post(url, json=schedule_data, headers=headers)
            print(f"   Status: {response.status_code}")
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ CRITICAL SUCCESS - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)}")
                    # Store schedule ID for later tests
                    if 'id' in response_data:
                        self.created_schedule_id = response_data['id']
                        print(f"   Created Schedule ID: {self.created_schedule_id}")
                    return True, response_data
                except Exception as e:
                    print(f"   ⚠️ Error parsing response: {str(e)}")
                    return True, {}
            else:
                print(f"❌ CRITICAL FAILURE - Expected 200, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ CRITICAL FAILURE - Error: {str(e)}")
            return False, {}

    def test_movie_scheduling_verify_schedule_appears(self):
        """Verify schedule appears in GET /api/movie-schedules after creation"""
        if not self.created_schedule_id:
            print("⚠️  Skipping - No schedule created to verify")
            return True

        success, schedules = self.test_movie_scheduling_get_schedules_with_auth()
        
        if success:
            # Look for our created schedule
            found_schedule = False
            for schedule_item in schedules:
                schedule = schedule_item.get('schedule', {})
                if schedule.get('id') == self.created_schedule_id:
                    found_schedule = True
                    print(f"   ✅ Created schedule found in list: {schedule.get('date')} at {schedule.get('time_slot')}")
                    break
            
            if not found_schedule:
                print(f"   ❌ Created schedule NOT found in list")
                return False
            
            return True
        else:
            return False

    def test_movie_scheduling_delete_schedule(self):
        """Test DELETE /api/movie-schedules/{schedule_id}"""
        if not self.created_schedule_id:
            print("⚠️  Skipping - No schedule ID available for deletion")
            return True

        url = f"{self.api_url}/movie-schedules/{self.created_schedule_id}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

        self.tests_run += 1
        print(f"\n🔍 Testing DELETE /api/movie-schedules/{self.created_schedule_id}...")
        print(f"   URL: {url}")
        
        try:
            response = requests.delete(url, headers=headers)
            print(f"   Status: {response.status_code}")
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)}")
                except:
                    pass
                return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_movie_scheduling_conflict_detection(self):
        """Test conflict detection - try to create duplicate schedule"""
        # First create a schedule
        future_date = "2025-12-02"  # Different date to avoid conflicts with previous tests
        
        schedule_data = {
            "movie_id": self.movie_id_for_scheduling,
            "date": future_date,
            "time_slot": "21h15",
            "capacity": 21
        }
        
        url = f"{self.api_url}/movie-schedules"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

        self.tests_run += 1
        print(f"\n🔍 Testing Conflict Detection - Creating duplicate schedule...")
        print(f"   URL: {url}")
        
        try:
            # Create first schedule
            response1 = requests.post(url, json=schedule_data, headers=headers)
            print(f"   First schedule creation status: {response1.status_code}")
            
            if response1.status_code == 200:
                first_schedule_id = response1.json().get('id')
                print(f"   ✅ First schedule created: {first_schedule_id}")
                
                # Try to create duplicate schedule (same date/time_slot)
                response2 = requests.post(url, json=schedule_data, headers=headers)
                print(f"   Duplicate schedule creation status: {response2.status_code}")
                
                # Should return 400 error with conflict message
                if response2.status_code == 400:
                    self.tests_passed += 1
                    print(f"✅ Passed - Conflict detected correctly (Status: 400)")
                    try:
                        error_data = response2.json()
                        error_message = error_data.get('detail', '')
                        if 'contenu est déjà programmé' in error_message or 'already scheduled' in error_message.lower():
                            print(f"   ✅ Correct conflict message: {error_message}")
                        else:
                            print(f"   ⚠️ Unexpected error message: {error_message}")
                    except:
                        pass
                    
                    # Cleanup - delete the first schedule
                    if first_schedule_id:
                        cleanup_response = requests.delete(f"{url}/{first_schedule_id}", headers=headers)
                        if cleanup_response.status_code == 200:
                            print(f"   🧹 Cleanup successful")
                    
                    return True
                else:
                    print(f"❌ Failed - Expected 400 conflict, got {response2.status_code}")
                    # Still cleanup if needed
                    if first_schedule_id:
                        requests.delete(f"{url}/{first_schedule_id}", headers=headers)
                    return False
            else:
                print(f"❌ Failed - Could not create first schedule: {response1.status_code}")
                return False

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all movie scheduling tests"""
        print("🚀 Starting Movie Scheduling System Tests...")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"🔗 API URL: {self.api_url}")
        print("=" * 80)
        
        # Run the critical movie scheduling tests from the review request
        print("\n🎬 CRITICAL MOVIE SCHEDULING SYSTEM TESTS")
        print("=" * 50)
        
        tests = [
            self.test_movie_scheduling_get_movies_with_auth,
            self.test_movie_scheduling_get_schedules_with_auth,
            self.test_movie_scheduling_create_schedule_critical,
            self.test_movie_scheduling_verify_schedule_appears,
            self.test_movie_scheduling_delete_schedule,
            self.test_movie_scheduling_conflict_detection
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
        
        # Print results
        print("\n" + "=" * 80)
        print(f"🏁 Movie Scheduling Test Summary:")
        print(f"   Total tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Tests failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All movie scheduling tests passed!")
            return True
        else:
            print("⚠️  Some movie scheduling tests failed. Check the output above for details.")
            return False

if __name__ == "__main__":
    tester = MovieSchedulingTester()
    success = tester.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)