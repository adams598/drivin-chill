#!/usr/bin/env python3
"""
Tests spécifiques pour les scénarios mentionnés dans la demande d'audit française
"""

import requests
import sys
from datetime import datetime, date, timedelta
import json

class SpecificScenariosTest:
    def __init__(self, base_url="https://cinema-admin-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

    def test_reduction20_specific_calculation(self):
        """
        Test spécifique : REDUCTION20 donnait 7,2€ au lieu de 13,6€ attendus
        Vérifier avec un prix de 17€ (prix standard des films)
        """
        print("🎯 Testing REDUCTION20 specific calculation issue...")
        
        # Prix standard d'un film : 17€
        original_price = 17.0
        expected_discount = original_price * 0.20  # 3.4€
        expected_final_price = original_price - expected_discount  # 13.6€
        
        print(f"   Original price: {original_price}€")
        print(f"   Expected discount (20%): {expected_discount}€")
        print(f"   Expected final price: {expected_final_price}€")
        
        validation_data = {
            "code": "REDUCTION20",
            "booking_price": original_price
        }
        
        try:
            response = requests.post(f"{self.api_url}/validate-promo-code", json=validation_data)
            if response.status_code == 200:
                result = response.json()
                if result.get('valid'):
                    actual_final_price = result.get('final_price')
                    actual_discount = result.get('discount_amount')
                    
                    print(f"   API returned final price: {actual_final_price}€")
                    print(f"   API returned discount: {actual_discount}€")
                    
                    # Vérifier si on a le bug (7.2€ au lieu de 13.6€)
                    if abs(actual_final_price - 7.2) < 0.01:
                        print(f"   🚨 BUG CONFIRMED: Getting 7.2€ instead of 13.6€")
                        return False
                    elif abs(actual_final_price - expected_final_price) < 0.01:
                        print(f"   ✅ CALCULATION CORRECT: Getting expected 13.6€")
                        return True
                    else:
                        print(f"   ⚠️ UNEXPECTED RESULT: Getting {actual_final_price}€")
                        return False
                else:
                    print(f"   ❌ REDUCTION20 code not valid: {result.get('message')}")
                    return False
            else:
                print(f"   ❌ API call failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return False

    def test_stripe_metadata_null_handling(self):
        """
        Test spécifique : /api/payments/create-checkout échoue avec erreur 500 quand promo_code=None
        """
        print("🎯 Testing Stripe metadata null handling...")
        
        # Créer un événement et une réservation pour tester
        event_data = {
            "title": "Test Event Stripe Metadata",
            "description": "Test pour métadonnées Stripe",
            "duration_minutes": 90,
            "event_type": "test",
            "price": 17.0
        }
        
        try:
            # Créer l'événement
            event_response = requests.post(f"{self.api_url}/events", json=event_data, headers=self.admin_headers)
            if event_response.status_code != 200:
                print(f"   ❌ Failed to create test event: {event_response.status_code}")
                return False
            
            event_id = event_response.json()['id']
            print(f"   ✅ Test event created: {event_id}")
            
            # Programmer l'événement
            future_date = date.today() + timedelta(days=7)
            schedule_data = {
                "content_id": event_id,
                "content_type": "event",
                "date": future_date.isoformat(),
                "time_slot": "21h15"
            }
            
            schedule_response = requests.post(f"{self.api_url}/content-schedules", json=schedule_data, headers=self.admin_headers)
            if schedule_response.status_code != 200:
                print(f"   ❌ Failed to schedule event: {schedule_response.status_code}")
                requests.delete(f"{self.api_url}/events/{event_id}", headers=self.admin_headers)
                return False
            
            schedule_id = schedule_response.json()['id']
            print(f"   ✅ Event scheduled: {schedule_id}")
            
            # Créer une réservation SANS code promo (promo_code explicitement None)
            booking_data = {
                "first_name": "Test",
                "last_name": "Stripe",
                "email": "test@stripe-null.com",
                "booking_date": future_date.isoformat(),
                "day_of_week": "vendredi" if future_date.weekday() == 4 else "samedi",
                "time_slot": "21h15",
                "payment_method": "card",
                "promo_code": None  # Explicitement None
            }
            
            booking_response = requests.post(f"{self.api_url}/bookings", json=booking_data)
            if booking_response.status_code != 200:
                print(f"   ❌ Failed to create booking: {booking_response.status_code}")
                requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event_id}", headers=self.admin_headers)
                return False
            
            booking_id = booking_response.json()['id']
            print(f"   ✅ Booking created: {booking_id}")
            
            # Tester la création du checkout Stripe avec métadonnées null
            payment_data = {
                "booking_id": booking_id,
                "origin_url": self.base_url
            }
            
            print("   Testing Stripe checkout with null metadata...")
            payment_response = requests.post(f"{self.api_url}/payments/create-checkout", json=payment_data)
            
            if payment_response.status_code == 500:
                print(f"   🚨 BUG CONFIRMED: Stripe checkout fails with 500 error")
                try:
                    error_data = payment_response.json()
                    print(f"   Error details: {error_data}")
                except:
                    print(f"   Error text: {payment_response.text}")
                
                # Cleanup
                requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event_id}", headers=self.admin_headers)
                return False
            elif payment_response.status_code == 200:
                print(f"   ✅ Stripe checkout created successfully")
                result = payment_response.json()
                print(f"   Checkout URL: {result.get('checkout_url', 'N/A')}")
                
                # Cleanup
                requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event_id}", headers=self.admin_headers)
                return True
            else:
                print(f"   ⚠️ Unexpected status code: {payment_response.status_code}")
                
                # Cleanup
                requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event_id}", headers=self.admin_headers)
                return False
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return False

    def test_double_programming_scenario(self):
        """
        Test spécifique : système permet double programmation sur même créneau
        """
        print("🎯 Testing double programming prevention...")
        
        # Créer deux événements différents
        event1_data = {
            "title": "Premier Événement",
            "description": "Premier événement pour test conflit",
            "duration_minutes": 90,
            "event_type": "spectacle",
            "price": 15.0
        }
        
        event2_data = {
            "title": "Deuxième Événement",
            "description": "Deuxième événement pour test conflit",
            "duration_minutes": 120,
            "event_type": "concert",
            "price": 20.0
        }
        
        try:
            # Créer les deux événements
            event1_response = requests.post(f"{self.api_url}/events", json=event1_data, headers=self.admin_headers)
            event2_response = requests.post(f"{self.api_url}/events", json=event2_data, headers=self.admin_headers)
            
            if event1_response.status_code != 200 or event2_response.status_code != 200:
                print(f"   ❌ Failed to create test events")
                return False
            
            event1_id = event1_response.json()['id']
            event2_id = event2_response.json()['id']
            print(f"   ✅ Two test events created")
            
            # Programmer le premier événement
            future_date = date.today() + timedelta(days=10)
            schedule1_data = {
                "content_id": event1_id,
                "content_type": "event",
                "date": future_date.isoformat(),
                "time_slot": "21h15"
            }
            
            schedule1_response = requests.post(f"{self.api_url}/content-schedules", json=schedule1_data, headers=self.admin_headers)
            if schedule1_response.status_code != 200:
                print(f"   ❌ Failed to schedule first event: {schedule1_response.status_code}")
                requests.delete(f"{self.api_url}/events/{event1_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event2_id}", headers=self.admin_headers)
                return False
            
            schedule1_id = schedule1_response.json()['id']
            print(f"   ✅ First event scheduled for {future_date} at 21h15")
            
            # Tenter de programmer le deuxième événement au MÊME créneau
            schedule2_data = {
                "content_id": event2_id,
                "content_type": "event",
                "date": future_date.isoformat(),
                "time_slot": "21h15"  # MÊME DATE ET HEURE
            }
            
            print("   Attempting to schedule second event at same slot...")
            schedule2_response = requests.post(f"{self.api_url}/content-schedules", json=schedule2_data, headers=self.admin_headers)
            
            if schedule2_response.status_code == 200:
                # BUG : Double programmation autorisée !
                schedule2_id = schedule2_response.json()['id']
                print(f"   🚨 BUG CONFIRMED: Double programming allowed!")
                print(f"   Both events scheduled at same time slot")
                
                # Cleanup
                requests.delete(f"{self.api_url}/content-schedules/{schedule1_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/content-schedules/{schedule2_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event1_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event2_id}", headers=self.admin_headers)
                return False
                
            elif schedule2_response.status_code == 400:
                print(f"   ✅ Conflict correctly detected and prevented")
                error_data = schedule2_response.json()
                print(f"   Error message: {error_data.get('detail', 'No detail')}")
                
                # Cleanup
                requests.delete(f"{self.api_url}/content-schedules/{schedule1_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event1_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event2_id}", headers=self.admin_headers)
                return True
            else:
                print(f"   ⚠️ Unexpected response: {schedule2_response.status_code}")
                
                # Cleanup
                requests.delete(f"{self.api_url}/content-schedules/{schedule1_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event1_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event2_id}", headers=self.admin_headers)
                return False
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return False

    def test_october_1st_booking_scenario(self):
        """
        Test spécifique : problème de réservation du 1er octobre mentionné dans l'audit
        """
        print("🎯 Testing October 1st booking scenario...")
        
        # Simuler une programmation pour le 1er octobre 2025
        october_1st = date(2025, 10, 1)
        
        # Créer un événement de test
        event_data = {
            "title": "Événement 1er Octobre",
            "description": "Test pour le problème du 1er octobre",
            "duration_minutes": 120,
            "event_type": "spectacle",
            "price": 17.0
        }
        
        try:
            event_response = requests.post(f"{self.api_url}/events", json=event_data, headers=self.admin_headers)
            if event_response.status_code != 200:
                print(f"   ❌ Failed to create October event: {event_response.status_code}")
                return False
            
            event_id = event_response.json()['id']
            print(f"   ✅ October event created: {event_id}")
            
            # Programmer l'événement pour le 1er octobre 2025
            schedule_data = {
                "content_id": event_id,
                "content_type": "event",
                "date": october_1st.isoformat(),
                "time_slot": "21h15"
            }
            
            schedule_response = requests.post(f"{self.api_url}/content-schedules", json=schedule_data, headers=self.admin_headers)
            if schedule_response.status_code != 200:
                print(f"   ❌ Failed to schedule October event: {schedule_response.status_code}")
                requests.delete(f"{self.api_url}/events/{event_id}", headers=self.admin_headers)
                return False
            
            schedule_id = schedule_response.json()['id']
            print(f"   ✅ Event scheduled for October 1st, 2025")
            
            # Vérifier que l'événement est visible dans la programmation
            schedules_response = requests.get(f"{self.api_url}/content-schedules")
            if schedules_response.status_code == 200:
                schedules = schedules_response.json()
                october_schedules = [s for s in schedules if s['schedule']['date'] == october_1st.isoformat()]
                
                if october_schedules:
                    print(f"   ✅ October 1st event visible in schedules")
                    print(f"   Event details: {october_schedules[0]['content']['title']}")
                else:
                    print(f"   🚨 October 1st event NOT visible in schedules")
                    requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", headers=self.admin_headers)
                    requests.delete(f"{self.api_url}/events/{event_id}", headers=self.admin_headers)
                    return False
            
            # Tester la disponibilité pour le 1er octobre
            availability_response = requests.get(f"{self.api_url}/availability", params={
                "booking_date": october_1st.isoformat(),
                "time_slot": "21h15"
            })
            
            if availability_response.status_code == 200:
                availability = availability_response.json()
                print(f"   ✅ Availability check successful for October 1st")
                print(f"   Available spots: {availability.get('available_spots', 'N/A')}")
                print(f"   Is available: {availability.get('is_available', 'N/A')}")
            else:
                print(f"   ❌ Availability check failed: {availability_response.status_code}")
            
            # Tenter une réservation pour le 1er octobre
            booking_data = {
                "first_name": "Client",
                "last_name": "Octobre",
                "email": "client@octobre.com",
                "booking_date": october_1st.isoformat(),
                "day_of_week": "mercredi",  # 1er octobre 2025 est un mercredi
                "time_slot": "21h15",
                "payment_method": "card"
            }
            
            print("   Attempting to create booking for October 1st...")
            booking_response = requests.post(f"{self.api_url}/bookings", json=booking_data)
            
            if booking_response.status_code == 200:
                booking_id = booking_response.json()['id']
                print(f"   ✅ Booking successful for October 1st: {booking_id}")
                
                # Cleanup
                requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event_id}", headers=self.admin_headers)
                return True
            else:
                print(f"   ❌ Booking failed for October 1st: {booking_response.status_code}")
                try:
                    error_data = booking_response.json()
                    print(f"   Error: {error_data.get('detail', 'No detail')}")
                except:
                    print(f"   Error text: {booking_response.text}")
                
                # Cleanup
                requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", headers=self.admin_headers)
                requests.delete(f"{self.api_url}/events/{event_id}", headers=self.admin_headers)
                return False
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            return False

    def run_specific_tests(self):
        """Run all specific scenario tests"""
        print("🎯 TESTING SPECIFIC SCENARIOS FROM FRENCH AUDIT REQUEST")
        print("=" * 70)
        
        tests = [
            ("REDUCTION20 Specific Calculation", self.test_reduction20_specific_calculation),
            ("Stripe Metadata Null Handling", self.test_stripe_metadata_null_handling),
            ("Double Programming Prevention", self.test_double_programming_scenario),
            ("October 1st Booking Scenario", self.test_october_1st_booking_scenario)
        ]
        
        results = []
        for test_name, test_func in tests:
            print(f"\n🔍 {test_name}...")
            try:
                success = test_func()
                results.append((test_name, success))
                if success:
                    print(f"✅ PASSED: {test_name}")
                else:
                    print(f"❌ FAILED: {test_name}")
            except Exception as e:
                print(f"❌ ERROR in {test_name}: {str(e)}")
                results.append((test_name, False))
        
        print("\n" + "=" * 70)
        print("🎯 SPECIFIC SCENARIOS TEST RESULTS")
        print("=" * 70)
        
        passed = sum(1 for _, success in results if success)
        total = len(results)
        
        print(f"Tests run: {total}")
        print(f"Tests passed: {passed}")
        print(f"Success rate: {(passed/total)*100:.1f}%")
        
        print(f"\nDetailed Results:")
        for test_name, success in results:
            status = "✅ PASSED" if success else "❌ FAILED"
            print(f"  {status}: {test_name}")
        
        return passed == total

if __name__ == "__main__":
    tester = SpecificScenariosTest()
    success = tester.run_specific_tests()
    sys.exit(0 if success else 1)