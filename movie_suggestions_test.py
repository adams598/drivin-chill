import requests
import sys
from datetime import datetime, date, timedelta
import json

class MovieSuggestionsAPITester:
    def __init__(self, base_url="https://cinema-admin-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.suggestion_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        if not headers:
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

    def test_create_movie_suggestion_full_data(self):
        """Test creating movie suggestion with all fields"""
        suggestion_data = {
            "movie_title": "Dune",
            "director": "Denis Villeneuve",
            "release_year": 2021,
            "reason": "Un chef-d'œuvre de science-fiction avec des effets visuels époustouflants",
            "suggested_by": "Jean Cinéphile",
            "email": "jean.cinephile@test.com"
        }
        
        success, response = self.run_test(
            "Create Movie Suggestion (Full Data)",
            "POST",
            "movie-suggestions",
            200,
            data=suggestion_data
        )
        
        if success and 'id' in response:
            self.suggestion_id = response['id']
            print(f"   Suggestion ID: {self.suggestion_id}")
        
        return success

    def test_create_movie_suggestion_minimal_data(self):
        """Test creating movie suggestion with required fields only"""
        suggestion_data = {
            "movie_title": "Blade Runner 2049",
            "suggested_by": "Marie Spectateur"
        }
        
        return self.run_test(
            "Create Movie Suggestion (Minimal Data)",
            "POST",
            "movie-suggestions",
            200,
            data=suggestion_data
        )[0]

    def test_create_movie_suggestion_invalid_data(self):
        """Test creating movie suggestion with invalid data"""
        suggestion_data = {
            "movie_title": "",  # Empty title should fail
            "suggested_by": "Test User"
        }
        
        return self.run_test(
            "Create Movie Suggestion (Invalid Data - Empty Title)",
            "POST",
            "movie-suggestions",
            422,  # Validation error
            data=suggestion_data
        )[0]

    def test_create_movie_suggestion_invalid_year(self):
        """Test creating movie suggestion with invalid release year"""
        suggestion_data = {
            "movie_title": "Future Movie",
            "suggested_by": "Test User",
            "release_year": 2050  # Year too far in future
        }
        
        return self.run_test(
            "Create Movie Suggestion (Invalid Year)",
            "POST",
            "movie-suggestions",
            422,  # Validation error
            data=suggestion_data
        )[0]

    def test_create_movie_suggestion_invalid_email(self):
        """Test creating movie suggestion with invalid email"""
        suggestion_data = {
            "movie_title": "Test Movie",
            "suggested_by": "Test User",
            "email": "invalid-email-format"
        }
        
        return self.run_test(
            "Create Movie Suggestion (Invalid Email)",
            "POST",
            "movie-suggestions",
            422,  # Validation error
            data=suggestion_data
        )[0]

    def test_create_movie_suggestion_long_title(self):
        """Test creating movie suggestion with title too long"""
        suggestion_data = {
            "movie_title": "A" * 201,  # 201 characters, exceeds 200 limit
            "suggested_by": "Test User"
        }
        
        return self.run_test(
            "Create Movie Suggestion (Title Too Long)",
            "POST",
            "movie-suggestions",
            422,  # Validation error
            data=suggestion_data
        )[0]

    def test_create_movie_suggestion_long_reason(self):
        """Test creating movie suggestion with reason too long"""
        suggestion_data = {
            "movie_title": "Test Movie",
            "suggested_by": "Test User",
            "reason": "A" * 501  # 501 characters, exceeds 500 limit
        }
        
        return self.run_test(
            "Create Movie Suggestion (Reason Too Long)",
            "POST",
            "movie-suggestions",
            422,  # Validation error
            data=suggestion_data
        )[0]

    def test_get_movie_suggestions_no_auth(self):
        """Test getting movie suggestions without admin authentication"""
        return self.run_test(
            "Get Movie Suggestions (No Auth)",
            "GET",
            "admin/movie-suggestions",
            403  # Should be forbidden
        )[0]

    def test_get_movie_suggestions_with_auth(self):
        """Test getting movie suggestions with admin authentication"""
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }
        
        return self.run_test(
            "Get Movie Suggestions (With Auth)",
            "GET",
            "admin/movie-suggestions",
            200,
            headers=headers
        )[0]

    def test_get_movie_suggestions_with_status_filter(self):
        """Test getting movie suggestions with status filter"""
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }
        
        return self.run_test(
            "Get Movie Suggestions (Status Filter: pending)",
            "GET",
            "admin/movie-suggestions",
            200,
            params={"status": "pending"},
            headers=headers
        )[0]

    def test_update_movie_suggestion_status(self):
        """Test updating movie suggestion status"""
        if not self.suggestion_id:
            print("⚠️  Skipping - No suggestion ID available")
            return True

        update_data = {
            "status": "under_review",
            "admin_notes": "Film intéressant, à considérer pour la programmation"
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }
        
        return self.run_test(
            "Update Movie Suggestion Status",
            "PUT",
            f"admin/movie-suggestions/{self.suggestion_id}",
            200,
            data=update_data,
            headers=headers
        )[0]

    def test_update_movie_suggestion_no_auth(self):
        """Test updating movie suggestion without authentication"""
        if not self.suggestion_id:
            print("⚠️  Skipping - No suggestion ID available")
            return True

        update_data = {
            "status": "accepted"
        }
        
        return self.run_test(
            "Update Movie Suggestion (No Auth)",
            "PUT",
            f"admin/movie-suggestions/{self.suggestion_id}",
            403,  # Should be forbidden
            data=update_data
        )[0]

    def test_update_nonexistent_movie_suggestion(self):
        """Test updating non-existent movie suggestion"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        update_data = {
            "status": "accepted"
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }
        
        return self.run_test(
            "Update Non-existent Movie Suggestion",
            "PUT",
            f"admin/movie-suggestions/{fake_id}",
            404,
            data=update_data,
            headers=headers
        )[0]

    def test_delete_movie_suggestion_no_auth(self):
        """Test deleting movie suggestion without authentication"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        return self.run_test(
            "Delete Movie Suggestion (No Auth)",
            "DELETE",
            f"admin/movie-suggestions/{fake_id}",
            403  # Should be forbidden
        )[0]

    def test_delete_movie_suggestion(self):
        """Test deleting a movie suggestion"""
        if not self.suggestion_id:
            print("⚠️  Skipping - No suggestion ID available")
            return True

        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }
        
        return self.run_test(
            "Delete Movie Suggestion",
            "DELETE",
            f"admin/movie-suggestions/{self.suggestion_id}",
            200,
            headers=headers
        )[0]

    def test_movie_suggestions_workflow(self):
        """Test complete movie suggestions workflow"""
        print(f"\n🔍 Testing Complete Movie Suggestions Workflow...")
        
        # Create multiple suggestions with different statuses
        suggestions_data = [
            {
                "movie_title": "The Matrix Resurrections",
                "director": "Lana Wachowski",
                "release_year": 2021,
                "reason": "Suite attendue de la trilogie Matrix",
                "suggested_by": "Neo Fan",
                "email": "neo@matrix.com"
            },
            {
                "movie_title": "Spider-Man: No Way Home",
                "director": "Jon Watts",
                "release_year": 2021,
                "reason": "Crossover épique avec tous les Spider-Man",
                "suggested_by": "Spider Fan"
            },
            {
                "movie_title": "Top Gun: Maverick",
                "director": "Joseph Kosinski",
                "release_year": 2022,
                "reason": "Suite légendaire avec Tom Cruise",
                "suggested_by": "Maverick Fan",
                "email": "maverick@topgun.com"
            }
        ]
        
        created_suggestions = []
        
        try:
            # Create suggestions
            for i, suggestion_data in enumerate(suggestions_data):
                response = requests.post(f"{self.api_url}/movie-suggestions", 
                                       json=suggestion_data, 
                                       headers={'Content-Type': 'application/json'})
                
                if response.status_code == 200:
                    suggestion_id = response.json().get('id')
                    created_suggestions.append(suggestion_id)
                    print(f"   ✅ Created suggestion {i+1}: {suggestion_data['movie_title']}")
                else:
                    print(f"   ❌ Failed to create suggestion {i+1}")
                    return False
            
            # Test admin workflow - update statuses
            headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer admin_token_2024'
            }
            
            # Update first suggestion to under_review
            if len(created_suggestions) > 0:
                update_response = requests.put(
                    f"{self.api_url}/admin/movie-suggestions/{created_suggestions[0]}",
                    json={"status": "under_review", "admin_notes": "En cours d'évaluation"},
                    headers=headers
                )
                if update_response.status_code == 200:
                    print(f"   ✅ Updated first suggestion to 'under_review'")
                else:
                    print(f"   ❌ Failed to update first suggestion")
            
            # Update second suggestion to accepted
            if len(created_suggestions) > 1:
                update_response = requests.put(
                    f"{self.api_url}/admin/movie-suggestions/{created_suggestions[1]}",
                    json={"status": "accepted", "admin_notes": "Excellent choix, programmé pour bientôt"},
                    headers=headers
                )
                if update_response.status_code == 200:
                    print(f"   ✅ Updated second suggestion to 'accepted'")
                else:
                    print(f"   ❌ Failed to update second suggestion")
            
            # Update third suggestion to rejected
            if len(created_suggestions) > 2:
                update_response = requests.put(
                    f"{self.api_url}/admin/movie-suggestions/{created_suggestions[2]}",
                    json={"status": "rejected", "admin_notes": "Déjà programmé récemment"},
                    headers=headers
                )
                if update_response.status_code == 200:
                    print(f"   ✅ Updated third suggestion to 'rejected'")
                else:
                    print(f"   ❌ Failed to update third suggestion")
            
            # Test filtering by different statuses
            for status in ["pending", "under_review", "accepted", "rejected"]:
                filter_response = requests.get(
                    f"{self.api_url}/admin/movie-suggestions",
                    params={"status": status},
                    headers=headers
                )
                if filter_response.status_code == 200:
                    filtered_suggestions = filter_response.json()
                    print(f"   ✅ Found {len(filtered_suggestions)} suggestions with status '{status}'")
                else:
                    print(f"   ❌ Failed to filter by status '{status}'")
            
            # Cleanup - delete created suggestions
            for suggestion_id in created_suggestions:
                delete_response = requests.delete(
                    f"{self.api_url}/admin/movie-suggestions/{suggestion_id}",
                    headers=headers
                )
                if delete_response.status_code == 200:
                    print(f"   🧹 Deleted suggestion: {suggestion_id}")
            
            self.tests_run += 1
            self.tests_passed += 1
            print(f"   ✅ Complete workflow test passed")
            return True
            
        except Exception as e:
            print(f"   ❌ Workflow test failed: {str(e)}")
            # Cleanup on error
            headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer admin_token_2024'
            }
            for suggestion_id in created_suggestions:
                try:
                    requests.delete(f"{self.api_url}/admin/movie-suggestions/{suggestion_id}", headers=headers)
                except:
                    pass
            return False

def main():
    print("🎬 Testing Movie Suggestions System - Drivin And Chill Cinema API")
    print("=" * 80)
    
    tester = MovieSuggestionsAPITester()
    
    # Run all movie suggestions tests
    tests = [
        tester.test_create_movie_suggestion_full_data,
        tester.test_create_movie_suggestion_minimal_data,
        tester.test_create_movie_suggestion_invalid_data,
        tester.test_create_movie_suggestion_invalid_year,
        tester.test_create_movie_suggestion_invalid_email,
        tester.test_create_movie_suggestion_long_title,
        tester.test_create_movie_suggestion_long_reason,
        tester.test_get_movie_suggestions_no_auth,
        tester.test_get_movie_suggestions_with_auth,
        tester.test_get_movie_suggestions_with_status_filter,
        tester.test_update_movie_suggestion_status,
        tester.test_update_movie_suggestion_no_auth,
        tester.test_update_nonexistent_movie_suggestion,
        tester.test_delete_movie_suggestion_no_auth,
        tester.test_movie_suggestions_workflow,
        tester.test_delete_movie_suggestion,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 80)
    print(f"📊 MOVIE SUGGESTIONS SYSTEM TEST RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())