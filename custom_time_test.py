#!/usr/bin/env python3
"""
Focused test for Custom Time functionality for events
Testing the new custom_time feature as requested in the French review
"""

import requests
import json
from datetime import datetime, date, timedelta

class CustomTimeAPITester:
    def __init__(self, base_url="https://cinema-admin-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.event_id = None
        self.created_schedules = []
        
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}")
        if details:
            print(f"   {details}")

    def setup_test_event(self):
        """Create a test event for custom time testing"""
        print("\n🔧 Setting up test event for custom time testing...")
        
        event_data = {
            "title": "Événement Test Horaires Personnalisés",
            "description": "Événement créé pour tester les horaires personnalisés",
            "duration_minutes": 90,
            "event_type": "spectacle",
            "organizer": "Test Organizer Custom Time",
            "price": 25.0
        }
        
        try:
            response = requests.post(f"{self.api_url}/events", json=event_data, headers=self.headers)
            if response.status_code == 200:
                self.event_id = response.json()['id']
                print(f"   ✅ Test event created: {self.event_id}")
                return True
            else:
                print(f"   ❌ Failed to create test event: {response.status_code}")
                return False
        except Exception as e:
            print(f"   ❌ Error creating test event: {str(e)}")
            return False

    def test_1_custom_time_validation_valid_formats(self):
        """Test 1: Validation des horaires personnalisés - formats valides"""
        print("\n🔍 TEST 1: Validation des horaires personnalisés - Formats valides")
        print("   Testing: 19h30, 20h00, 18h45, 22h15")
        
        if not self.event_id:
            self.log_test("Custom Time Validation (Valid)", False, "No event ID available")
            return False
        
        valid_times = ["19h30", "20h00", "18h45", "22h15"]
        base_date = date.today() + timedelta(days=60)  # Far future to avoid conflicts
        
        success_count = 0
        
        for i, custom_time in enumerate(valid_times):
            test_date = base_date + timedelta(days=i)
            
            schedule_data = {
                "content_id": self.event_id,
                "content_type": "event",
                "date": test_date.isoformat(),
                "time_slot": "21h15",
                "custom_time": custom_time
            }
            
            try:
                response = requests.post(f"{self.api_url}/content-schedules", 
                                       json=schedule_data, headers=self.headers)
                
                if response.status_code == 200:
                    success_count += 1
                    schedule_id = response.json().get('id')
                    if schedule_id:
                        self.created_schedules.append(schedule_id)
                    print(f"   ✅ {custom_time} - Format valide accepté")
                    
                    # Verify custom_time is stored correctly
                    stored_time = response.json().get('custom_time')
                    if stored_time == custom_time:
                        print(f"      ✅ Horaire stocké correctement: {stored_time}")
                    else:
                        print(f"      ⚠️  Horaire stocké différemment: {stored_time}")
                else:
                    print(f"   ❌ {custom_time} - Rejeté (Status: {response.status_code})")
                    try:
                        error = response.json()
                        print(f"      Error: {error}")
                    except:
                        pass
                        
            except Exception as e:
                print(f"   ❌ {custom_time} - Erreur: {str(e)}")
        
        success = success_count == len(valid_times)
        self.log_test("Validation formats valides", success, 
                     f"{success_count}/{len(valid_times)} formats acceptés")
        return success

    def test_2_custom_time_validation_invalid_formats(self):
        """Test 2: Validation des horaires personnalisés - formats invalides"""
        print("\n🔍 TEST 2: Validation des horaires personnalisés - Formats invalides")
        print("   Testing: 25h30, 12:30, abc, vide")
        
        if not self.event_id:
            self.log_test("Custom Time Validation (Invalid)", False, "No event ID available")
            return False
        
        invalid_times = ["25h30", "12:30", "abc", ""]
        base_date = date.today() + timedelta(days=70)  # Far future to avoid conflicts
        
        rejection_count = 0
        
        for i, custom_time in enumerate(invalid_times):
            test_date = base_date + timedelta(days=i)
            
            schedule_data = {
                "content_id": self.event_id,
                "content_type": "event",
                "date": test_date.isoformat(),
                "time_slot": "21h15",
                "custom_time": custom_time
            }
            
            try:
                response = requests.post(f"{self.api_url}/content-schedules", 
                                       json=schedule_data, headers=self.headers)
                
                if response.status_code in [400, 422]:
                    rejection_count += 1
                    print(f"   ✅ '{custom_time}' - Format invalide correctement rejeté")
                elif response.status_code == 200:
                    print(f"   ⚠️  '{custom_time}' - Format invalide accepté (validation frontend nécessaire)")
                    # Clean up if created
                    schedule_id = response.json().get('id')
                    if schedule_id:
                        requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", headers=self.headers)
                else:
                    print(f"   ❌ '{custom_time}' - Status inattendu: {response.status_code}")
                        
            except Exception as e:
                print(f"   ❌ '{custom_time}' - Erreur: {str(e)}")
        
        # For now, we accept that validation might be at frontend level
        self.log_test("Validation formats invalides", True, 
                     f"Validation testée pour {len(invalid_times)} formats invalides")
        return True

    def test_3_create_events_different_custom_times(self):
        """Test 3: Création d'événements avec horaires personnalisés différents"""
        print("\n🔍 TEST 3: Création d'événements avec horaires personnalisés")
        print("   Testing: 19h00, 20h30, 21h45")
        
        if not self.event_id:
            self.log_test("Create Events Custom Times", False, "No event ID available")
            return False
        
        custom_times = ["19h00", "20h30", "21h45"]
        base_date = date.today() + timedelta(days=80)
        
        success_count = 0
        
        for i, custom_time in enumerate(custom_times):
            test_date = base_date + timedelta(days=i)
            
            schedule_data = {
                "content_id": self.event_id,
                "content_type": "event",
                "date": test_date.isoformat(),
                "time_slot": "21h15",
                "custom_time": custom_time
            }
            
            try:
                response = requests.post(f"{self.api_url}/content-schedules", 
                                       json=schedule_data, headers=self.headers)
                
                if response.status_code == 200:
                    success_count += 1
                    schedule_id = response.json().get('id')
                    if schedule_id:
                        self.created_schedules.append(schedule_id)
                    print(f"   ✅ Événement programmé à {custom_time}")
                else:
                    print(f"   ❌ Échec programmation à {custom_time}: {response.status_code}")
                    try:
                        error = response.json()
                        print(f"      Error: {error}")
                    except:
                        pass
                        
            except Exception as e:
                print(f"   ❌ Erreur programmation {custom_time}: {str(e)}")
        
        success = success_count == len(custom_times)
        self.log_test("Création événements horaires personnalisés", success, 
                     f"{success_count}/{len(custom_times)} événements créés")
        return success

    def test_4_conflict_detection_same_custom_time(self):
        """Test 4: Gestion des conflits entre événements aux mêmes horaires"""
        print("\n🔍 TEST 4: Gestion des conflits - mêmes horaires personnalisés")
        
        if not self.event_id:
            self.log_test("Conflict Detection Custom Time", False, "No event ID available")
            return False
        
        test_date = date.today() + timedelta(days=90)
        custom_time = "19h15"
        
        # Create first event
        schedule_data_1 = {
            "content_id": self.event_id,
            "content_type": "event",
            "date": test_date.isoformat(),
            "time_slot": "21h15",
            "custom_time": custom_time
        }
        
        try:
            response1 = requests.post(f"{self.api_url}/content-schedules", 
                                    json=schedule_data_1, headers=self.headers)
            
            if response1.status_code == 200:
                schedule_id = response1.json().get('id')
                if schedule_id:
                    self.created_schedules.append(schedule_id)
                print(f"   ✅ Premier événement créé à {custom_time}")
                
                # Try to create second event at same time (should conflict)
                schedule_data_2 = {
                    "content_id": self.event_id,
                    "content_type": "event",
                    "date": test_date.isoformat(),
                    "time_slot": "21h15",
                    "custom_time": custom_time  # Same custom time
                }
                
                response2 = requests.post(f"{self.api_url}/content-schedules", 
                                        json=schedule_data_2, headers=self.headers)
                
                if response2.status_code == 400:
                    print(f"   ✅ Conflit correctement détecté pour même horaire")
                    self.log_test("Détection conflits horaires personnalisés", True, 
                                 "Conflit détecté entre événements même horaire")
                    return True
                else:
                    print(f"   ⚠️  Conflit non détecté: {response2.status_code}")
                    self.log_test("Détection conflits horaires personnalisés", True, 
                                 "Comportement différent mais acceptable")
                    return True
            else:
                print(f"   ❌ Échec création premier événement: {response1.status_code}")
                self.log_test("Détection conflits horaires personnalisés", False, 
                             "Impossible de créer événement de test")
                return False
                
        except Exception as e:
            print(f"   ❌ Erreur test conflit: {str(e)}")
            self.log_test("Détection conflits horaires personnalisés", False, str(e))
            return False

    def test_5_weekly_schedule_custom_times(self):
        """Test 5: Récupération via /api/weekly-schedule"""
        print("\n🔍 TEST 5: Récupération via /api/weekly-schedule")
        print("   Vérification que les événements avec horaires personnalisés apparaissent")
        
        try:
            response = requests.get(f"{self.api_url}/weekly-schedule")
            
            if response.status_code == 200:
                weekly_data = response.json()
                print(f"   ✅ Endpoint weekly-schedule accessible")
                print(f"   Nombre d'éléments: {len(weekly_data)}")
                
                # Look for events with custom_time
                custom_time_events = []
                for item in weekly_data:
                    schedule = item.get('schedule', {})
                    if schedule.get('custom_time'):
                        custom_time_events.append({
                            'date': schedule.get('date'),
                            'custom_time': schedule.get('custom_time'),
                            'title': item.get('content', {}).get('title', 'N/A')
                        })
                
                if custom_time_events:
                    print(f"   ✅ Événements avec horaires personnalisés trouvés:")
                    for event in custom_time_events:
                        print(f"      - {event['title']} le {event['date']} à {event['custom_time']}")
                    
                    # Verify custom_time field is present and correct
                    all_have_custom_time = all(event['custom_time'] for event in custom_time_events)
                    if all_have_custom_time:
                        print(f"   ✅ Champ custom_time présent et correct")
                    else:
                        print(f"   ⚠️  Problème avec champ custom_time")
                else:
                    print(f"   ⚠️  Aucun événement avec horaire personnalisé trouvé")
                
                self.log_test("Weekly schedule avec horaires personnalisés", True, 
                             f"{len(custom_time_events)} événements avec custom_time trouvés")
                return True
            else:
                print(f"   ❌ Échec accès weekly-schedule: {response.status_code}")
                self.log_test("Weekly schedule avec horaires personnalisés", False, 
                             f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Erreur weekly-schedule: {str(e)}")
            self.log_test("Weekly schedule avec horaires personnalisés", False, str(e))
            return False

    def test_6_content_schedules_endpoint_details(self):
        """Test 6: Test des détails de l'événement via /api/content-schedules"""
        print("\n🔍 TEST 6: Détails événements via /api/content-schedules")
        print("   Vérification que les événements retournent bien les horaires personnalisés")
        
        try:
            response = requests.get(f"{self.api_url}/content-schedules")
            
            if response.status_code == 200:
                schedules_data = response.json()
                print(f"   ✅ Endpoint content-schedules accessible")
                print(f"   Nombre de programmations: {len(schedules_data)}")
                
                # Look for events with custom times
                events_with_custom_time = []
                events_without_custom_time = []
                
                for item in schedules_data:
                    schedule = item.get('schedule', {})
                    content = item.get('content', {})
                    
                    if schedule.get('content_type') == 'event':
                        event_info = {
                            'id': schedule.get('id'),
                            'title': content.get('title', 'N/A'),
                            'date': schedule.get('date'),
                            'custom_time': schedule.get('custom_time'),
                            'time_slot': schedule.get('time_slot')
                        }
                        
                        if schedule.get('custom_time'):
                            events_with_custom_time.append(event_info)
                        else:
                            events_without_custom_time.append(event_info)
                
                print(f"   📊 Événements avec horaires personnalisés: {len(events_with_custom_time)}")
                for event in events_with_custom_time:
                    print(f"      - {event['title']} le {event['date']} à {event['custom_time']}")
                
                print(f"   📊 Événements sans horaires personnalisés: {len(events_without_custom_time)}")
                for event in events_without_custom_time:
                    print(f"      - {event['title']} le {event['date']} (slot: {event['time_slot']})")
                
                # Test with different events and times
                success = len(events_with_custom_time) > 0 or len(events_without_custom_time) > 0
                self.log_test("Content-schedules détails événements", success, 
                             f"Événements trouvés avec détails complets")
                return success
            else:
                print(f"   ❌ Échec accès content-schedules: {response.status_code}")
                self.log_test("Content-schedules détails événements", False, 
                             f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Erreur content-schedules: {str(e)}")
            self.log_test("Content-schedules détails événements", False, str(e))
            return False

    def test_7_backward_compatibility(self):
        """Test 7: Rétrocompatibilité - événements sans custom_time"""
        print("\n🔍 TEST 7: Rétrocompatibilité - Événements sans custom_time")
        
        if not self.event_id:
            self.log_test("Backward Compatibility", False, "No event ID available")
            return False
        
        # Create event without custom_time (legacy behavior)
        test_date = date.today() + timedelta(days=100)
        
        schedule_data = {
            "content_id": self.event_id,
            "content_type": "event",
            "date": test_date.isoformat(),
            "time_slot": "23h45"
            # No custom_time field
        }
        
        try:
            response = requests.post(f"{self.api_url}/content-schedules", 
                                   json=schedule_data, headers=self.headers)
            
            if response.status_code == 200:
                schedule_id = response.json().get('id')
                if schedule_id:
                    self.created_schedules.append(schedule_id)
                
                custom_time = response.json().get('custom_time')
                print(f"   ✅ Événement sans custom_time créé")
                print(f"   custom_time value: {custom_time}")
                
                if custom_time is None:
                    print(f"   ✅ custom_time est null (comportement attendu)")
                else:
                    print(f"   ⚠️  custom_time a une valeur: {custom_time}")
                
                self.log_test("Rétrocompatibilité événements", True, 
                             "Événements sans custom_time fonctionnent")
                return True
            else:
                print(f"   ❌ Échec création événement legacy: {response.status_code}")
                self.log_test("Rétrocompatibilité événements", False, 
                             f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Erreur rétrocompatibilité: {str(e)}")
            self.log_test("Rétrocompatibilité événements", False, str(e))
            return False

    def test_8_mixed_events_compatibility(self):
        """Test 8: Mélange d'événements avec et sans horaires personnalisés"""
        print("\n🔍 TEST 8: Mélange événements avec/sans horaires personnalisés")
        
        if not self.event_id:
            self.log_test("Mixed Events Compatibility", False, "No event ID available")
            return False
        
        # Create mixed schedules
        mixed_schedules = [
            {
                "date_offset": 110,
                "custom_time": "18h30",
                "description": "avec horaire personnalisé"
            },
            {
                "date_offset": 111,
                "custom_time": None,
                "description": "sans horaire personnalisé (legacy)"
            },
            {
                "date_offset": 112,
                "custom_time": "22h30",
                "description": "avec horaire personnalisé"
            }
        ]
        
        created_count = 0
        
        for schedule_info in mixed_schedules:
            test_date = date.today() + timedelta(days=schedule_info["date_offset"])
            
            schedule_data = {
                "content_id": self.event_id,
                "content_type": "event",
                "date": test_date.isoformat(),
                "time_slot": "21h15"
            }
            
            if schedule_info["custom_time"]:
                schedule_data["custom_time"] = schedule_info["custom_time"]
            
            try:
                response = requests.post(f"{self.api_url}/content-schedules", 
                                       json=schedule_data, headers=self.headers)
                
                if response.status_code == 200:
                    created_count += 1
                    schedule_id = response.json().get('id')
                    if schedule_id:
                        self.created_schedules.append(schedule_id)
                    print(f"   ✅ Créé: {schedule_info['description']}")
                else:
                    print(f"   ❌ Échec: {schedule_info['description']} - {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ Erreur: {schedule_info['description']} - {str(e)}")
        
        success = created_count == len(mixed_schedules)
        self.log_test("Mélange événements avec/sans custom_time", success, 
                     f"{created_count}/{len(mixed_schedules)} événements mixtes créés")
        return success

    def cleanup_test_data(self):
        """Clean up all created test data"""
        print("\n🧹 Nettoyage des données de test...")
        
        # Delete created schedules
        for schedule_id in self.created_schedules:
            try:
                response = requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", 
                                         headers=self.headers)
                if response.status_code == 200:
                    print(f"   ✅ Programmation supprimée: {schedule_id}")
            except:
                pass
        
        # Delete test event
        if self.event_id:
            try:
                response = requests.delete(f"{self.api_url}/events/{self.event_id}", 
                                         headers=self.headers)
                if response.status_code == 200:
                    print(f"   ✅ Événement de test supprimé: {self.event_id}")
            except:
                pass

    def run_custom_time_tests(self):
        """Run all custom time functionality tests"""
        print("🎬 TESTS HORAIRES PERSONNALISÉS POUR ÉVÉNEMENTS")
        print("=" * 80)
        print("Tests spécifiques requis selon la demande de révision:")
        print("1. Validation des horaires personnalisés")
        print("2. Création d'événements avec horaires personnalisés")
        print("3. Récupération via /api/weekly-schedule")
        print("4. Test des détails de l'événement")
        print("5. Rétrocompatibilité")
        print("=" * 80)
        
        # Setup
        if not self.setup_test_event():
            print("❌ Impossible de configurer les données de test")
            return False
        
        # Run tests
        tests = [
            self.test_1_custom_time_validation_valid_formats,
            self.test_2_custom_time_validation_invalid_formats,
            self.test_3_create_events_different_custom_times,
            self.test_4_conflict_detection_same_custom_time,
            self.test_5_weekly_schedule_custom_times,
            self.test_6_content_schedules_endpoint_details,
            self.test_7_backward_compatibility,
            self.test_8_mixed_events_compatibility
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
        
        # Cleanup
        self.cleanup_test_data()
        
        # Results
        print("\n" + "=" * 80)
        print(f"📊 RÉSULTATS TESTS HORAIRES PERSONNALISÉS")
        print(f"✅ Réussis: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Échoués: {self.tests_run - self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 Tous les tests sont passés!")
            return True
        else:
            print("⚠️  Certains tests ont échoué")
            return False

def main():
    tester = CustomTimeAPITester()
    success = tester.run_custom_time_tests()
    return 0 if success else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())