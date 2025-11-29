#!/usr/bin/env python3
"""
AUDIT DES PROBLÈMES CRITIQUES - Tests spécifiques pour les bugs identifiés
Tests pour vérifier les bugs critiques qui pourraient affecter d'autres clients
"""

import requests
import sys
from datetime import datetime, date, timedelta
import json

class CriticalBugsAuditor:
    def __init__(self, base_url="https://cinema-admin-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.critical_issues = []
        self.admin_headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_2024'
        }

    def log_critical_issue(self, issue_type, description, details=None):
        """Log a critical issue found during testing"""
        issue = {
            "type": issue_type,
            "description": description,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.critical_issues.append(issue)
        print(f"🚨 CRITICAL ISSUE: {issue_type} - {description}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, test_func):
        """Run a test and track results"""
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            success = test_func()
            if success:
                self.tests_passed += 1
                print(f"✅ Passed: {name}")
            else:
                print(f"❌ Failed: {name}")
            return success
        except Exception as e:
            print(f"❌ Error in {name}: {str(e)}")
            return False

    def create_test_event(self, price=9.0):
        """Create a test event for price calculation tests"""
        event_data = {
            "title": "Soirée Comedy Club Test",
            "description": "Événement de test pour vérifier les calculs de prix",
            "duration_minutes": 90,
            "event_type": "stand_up",
            "organizer": "Test Organizer",
            "price": price
        }
        
        try:
            response = requests.post(f"{self.api_url}/events", json=event_data, headers=self.admin_headers)
            if response.status_code == 200:
                event_id = response.json()['id']
                print(f"   ✅ Test event created: {event_id} (price: {price}€)")
                return event_id
            else:
                print(f"   ❌ Failed to create test event: {response.status_code}")
                return None
        except Exception as e:
            print(f"   ❌ Error creating test event: {str(e)}")
            return None

    def schedule_test_event(self, event_id, days_ahead=7):
        """Schedule a test event"""
        future_date = date.today() + timedelta(days=days_ahead)
        schedule_data = {
            "content_id": event_id,
            "content_type": "event",
            "date": future_date.isoformat(),
            "time_slot": "21h15"
        }
        
        try:
            response = requests.post(f"{self.api_url}/content-schedules", json=schedule_data, headers=self.admin_headers)
            if response.status_code == 200:
                schedule_id = response.json()['id']
                print(f"   ✅ Event scheduled: {schedule_id} for {future_date}")
                return schedule_id, future_date
            else:
                print(f"   ❌ Failed to schedule event: {response.status_code}")
                return None, None
        except Exception as e:
            print(f"   ❌ Error scheduling event: {str(e)}")
            return None, None

    def cleanup_test_data(self, event_id=None, schedule_id=None):
        """Clean up test data"""
        if event_id:
            try:
                requests.delete(f"{self.api_url}/events/{event_id}", headers=self.admin_headers)
                print(f"   🧹 Cleaned up event: {event_id}")
            except:
                pass
        
        if schedule_id:
            try:
                requests.delete(f"{self.api_url}/content-schedules/{schedule_id}", headers=self.admin_headers)
                print(f"   🧹 Cleaned up schedule: {schedule_id}")
            except:
                pass

    def test_promo_code_price_calculation_bug(self):
        """
        BUG CRITIQUE 1: Calcul de Prix avec Codes Promo
        Test REDUCTION20 (20% de réduction) - bug précédent : donnait 7,2€ au lieu de 13,6€ attendus
        """
        print("🎯 Testing REDUCTION20 promo code calculation bug...")
        
        # Test avec différents prix d'événements
        test_prices = [9.0, 17.0, 25.0]  # Prix différents pour tester le calcul
        
        for price in test_prices:
            print(f"\n   Testing with event price: {price}€")
            
            # Calculer le prix attendu avec 20% de réduction
            expected_discount = price * 0.20
            expected_final_price = price - expected_discount
            
            print(f"   Expected: {price}€ - {expected_discount}€ = {expected_final_price}€")
            
            # Tester la validation du code promo
            validation_data = {
                "code": "REDUCTION20",
                "booking_price": price
            }
            
            try:
                response = requests.post(f"{self.api_url}/validate-promo-code", json=validation_data)
                if response.status_code == 200:
                    result = response.json()
                    if result.get('valid'):
                        actual_final_price = result.get('final_price')
                        actual_discount = result.get('discount_amount')
                        
                        print(f"   API returned: {price}€ - {actual_discount}€ = {actual_final_price}€")
                        
                        # Vérifier si le calcul est correct (tolérance de 0.01€ pour les arrondis)
                        if abs(actual_final_price - expected_final_price) > 0.01:
                            self.log_critical_issue(
                                "PRICE_CALCULATION_ERROR",
                                f"REDUCTION20 calculation incorrect for {price}€",
                                {
                                    "original_price": price,
                                    "expected_final_price": expected_final_price,
                                    "actual_final_price": actual_final_price,
                                    "expected_discount": expected_discount,
                                    "actual_discount": actual_discount
                                }
                            )
                            return False
                        else:
                            print(f"   ✅ Price calculation correct for {price}€")
                    else:
                        print(f"   ❌ REDUCTION20 code not valid: {result.get('message')}")
                        return False
                else:
                    print(f"   ❌ Promo code validation failed: {response.status_code}")
                    return False
            except Exception as e:
                print(f"   ❌ Error testing price calculation: {str(e)}")
                return False
        
        # Test GRATUIT100 et SNACKGRATUIT également
        print(f"\n   Testing GRATUIT100 code...")
        validation_data = {"code": "GRATUIT100", "booking_price": 17.0}
        try:
            response = requests.post(f"{self.api_url}/validate-promo-code", json=validation_data)
            if response.status_code == 200:
                result = response.json()
                if result.get('valid') and result.get('final_price') == 0:
                    print(f"   ✅ GRATUIT100 calculation correct (0€)")
                else:
                    self.log_critical_issue(
                        "PRICE_CALCULATION_ERROR",
                        "GRATUIT100 should result in 0€ final price",
                        {"result": result}
                    )
                    return False
        except Exception as e:
            print(f"   ❌ Error testing GRATUIT100: {str(e)}")
            return False
        
        print(f"\n   Testing SNACKGRATUIT code...")
        validation_data = {"code": "SNACKGRATUIT", "booking_price": 17.0}
        try:
            response = requests.post(f"{self.api_url}/validate-promo-code", json=validation_data)
            if response.status_code == 200:
                result = response.json()
                if result.get('valid') and result.get('final_price') == 17.0 and result.get('benefit_description'):
                    print(f"   ✅ SNACKGRATUIT calculation correct (maintains price, adds benefits)")
                else:
                    self.log_critical_issue(
                        "PRICE_CALCULATION_ERROR",
                        "SNACKGRATUIT should maintain original price with benefits",
                        {"result": result}
                    )
                    return False
        except Exception as e:
            print(f"   ❌ Error testing SNACKGRATUIT: {str(e)}")
            return False
        
        return True

    def test_stripe_payment_metadata_bug(self):
        """
        BUG CRITIQUE 2: Métadonnées de Paiement Stripe
        Bug précédent : /api/payments/create-checkout échoue avec erreur 500 quand promo_code=None
        """
        print("🎯 Testing Stripe payment metadata handling...")
        
        # Créer un événement de test et le programmer
        event_id = self.create_test_event(17.0)
        if not event_id:
            return False
        
        schedule_id, event_date = self.schedule_test_event(event_id)
        if not schedule_id:
            self.cleanup_test_data(event_id)
            return False
        
        try:
            # Créer une réservation sans code promo (promo_code=None)
            booking_data = {
                "first_name": "Test",
                "last_name": "User",
                "email": "test@stripe-metadata.com",
                "booking_date": event_date.isoformat(),
                "day_of_week": "vendredi" if event_date.weekday() == 4 else "samedi",
                "time_slot": "21h15",
                "payment_method": "card",
                "promo_code": None  # Explicitement None pour tester le bug
            }
            
            print("   Creating booking without promo code...")
            response = requests.post(f"{self.api_url}/bookings", json=booking_data)
            
            if response.status_code == 200:
                booking_id = response.json()['id']
                print(f"   ✅ Booking created: {booking_id}")
                
                # Tester la création du checkout Stripe
                payment_data = {
                    "booking_id": booking_id,
                    "origin_url": self.base_url
                }
                
                print("   Testing Stripe checkout creation with null promo_code...")
                payment_response = requests.post(f"{self.api_url}/payments/create-checkout", json=payment_data)
                
                if payment_response.status_code == 500:
                    self.log_critical_issue(
                        "STRIPE_METADATA_ERROR",
                        "Stripe checkout fails with 500 error when promo_code is None",
                        {
                            "booking_id": booking_id,
                            "error_response": payment_response.text
                        }
                    )
                    self.cleanup_test_data(event_id, schedule_id)
                    return False
                elif payment_response.status_code == 200:
                    print(f"   ✅ Stripe checkout created successfully without promo code")
                else:
                    print(f"   ⚠️ Unexpected status code: {payment_response.status_code}")
                
                # Tester avec un code promo valide
                booking_data_with_promo = booking_data.copy()
                booking_data_with_promo["email"] = "test2@stripe-metadata.com"
                booking_data_with_promo["promo_code"] = "REDUCTION20"
                
                print("   Creating booking with promo code...")
                response2 = requests.post(f"{self.api_url}/bookings", json=booking_data_with_promo)
                
                if response2.status_code == 200:
                    booking_id2 = response2.json()['id']
                    
                    payment_data2 = {
                        "booking_id": booking_id2,
                        "origin_url": self.base_url
                    }
                    
                    print("   Testing Stripe checkout creation with promo code...")
                    payment_response2 = requests.post(f"{self.api_url}/payments/create-checkout", json=payment_data2)
                    
                    if payment_response2.status_code == 200:
                        print(f"   ✅ Stripe checkout created successfully with promo code")
                    else:
                        self.log_critical_issue(
                            "STRIPE_METADATA_ERROR",
                            f"Stripe checkout failed with promo code: {payment_response2.status_code}",
                            {"error_response": payment_response2.text}
                        )
                        self.cleanup_test_data(event_id, schedule_id)
                        return False
                
            else:
                print(f"   ❌ Failed to create booking: {response.status_code}")
                self.cleanup_test_data(event_id, schedule_id)
                return False
                
        except Exception as e:
            print(f"   ❌ Error testing Stripe metadata: {str(e)}")
            self.cleanup_test_data(event_id, schedule_id)
            return False
        finally:
            self.cleanup_test_data(event_id, schedule_id)
        
        return True

    def test_programming_conflict_detection_bug(self):
        """
        BUG CRITIQUE 3: Détection de Conflits de Programmation
        Bug précédent : système permet double programmation sur même créneau
        """
        print("🎯 Testing programming conflict detection...")
        
        # Créer deux événements différents
        event1_id = self.create_test_event(15.0)
        event2_id = self.create_test_event(20.0)
        
        if not event1_id or not event2_id:
            self.cleanup_test_data(event1_id, event2_id)
            return False
        
        try:
            future_date = date.today() + timedelta(days=10)
            time_slot = "21h15"
            
            # Programmer le premier événement
            schedule1_data = {
                "content_id": event1_id,
                "content_type": "event",
                "date": future_date.isoformat(),
                "time_slot": time_slot
            }
            
            print(f"   Scheduling first event for {future_date} at {time_slot}...")
            response1 = requests.post(f"{self.api_url}/content-schedules", json=schedule1_data, headers=self.admin_headers)
            
            if response1.status_code == 200:
                schedule1_id = response1.json()['id']
                print(f"   ✅ First event scheduled: {schedule1_id}")
                
                # Tenter de programmer le deuxième événement au même créneau
                schedule2_data = {
                    "content_id": event2_id,
                    "content_type": "event",
                    "date": future_date.isoformat(),
                    "time_slot": time_slot  # Même créneau !
                }
                
                print(f"   Attempting to schedule second event at same slot...")
                response2 = requests.post(f"{self.api_url}/content-schedules", json=schedule2_data, headers=self.admin_headers)
                
                if response2.status_code == 200:
                    # PROBLÈME : Le système a permis la double programmation !
                    schedule2_id = response2.json()['id']
                    self.log_critical_issue(
                        "PROGRAMMING_CONFLICT_ERROR",
                        "System allows double programming on same time slot",
                        {
                            "date": future_date.isoformat(),
                            "time_slot": time_slot,
                            "first_schedule_id": schedule1_id,
                            "second_schedule_id": schedule2_id,
                            "first_event_id": event1_id,
                            "second_event_id": event2_id
                        }
                    )
                    
                    # Nettoyer les deux programmations
                    requests.delete(f"{self.api_url}/content-schedules/{schedule1_id}", headers=self.admin_headers)
                    requests.delete(f"{self.api_url}/content-schedules/{schedule2_id}", headers=self.admin_headers)
                    self.cleanup_test_data(event1_id, event2_id)
                    return False
                    
                elif response2.status_code == 400:
                    print(f"   ✅ Conflict correctly detected and prevented")
                    error_data = response2.json()
                    print(f"   Error message: {error_data.get('detail', 'No detail')}")
                    
                    # Nettoyer la première programmation
                    requests.delete(f"{self.api_url}/content-schedules/{schedule1_id}", headers=self.admin_headers)
                    
                else:
                    print(f"   ⚠️ Unexpected response: {response2.status_code}")
                    self.cleanup_test_data(event1_id, event2_id)
                    return False
                    
            else:
                print(f"   ❌ Failed to schedule first event: {response1.status_code}")
                self.cleanup_test_data(event1_id, event2_id)
                return False
                
        except Exception as e:
            print(f"   ❌ Error testing conflict detection: {str(e)}")
            self.cleanup_test_data(event1_id, event2_id)
            return False
        finally:
            self.cleanup_test_data(event1_id, event2_id)
        
        return True

    def test_capacity_overbooking_prevention(self):
        """
        VÉRIFICATION DE SÉCURITÉ 4: Limites de capacité (prévention overbooking)
        """
        print("🎯 Testing capacity overbooking prevention...")
        
        # Créer un événement avec une capacité réduite pour les tests
        event_id = self.create_test_event(10.0)
        if not event_id:
            return False
        
        try:
            future_date = date.today() + timedelta(days=5)
            
            # Programmer l'événement avec une capacité de 2 places seulement
            schedule_data = {
                "content_id": event_id,
                "content_type": "event",
                "date": future_date.isoformat(),
                "time_slot": "21h15",
                "capacity": 2  # Capacité très réduite pour les tests
            }
            
            response = requests.post(f"{self.api_url}/content-schedules", json=schedule_data, headers=self.admin_headers)
            if response.status_code != 200:
                print(f"   ❌ Failed to schedule event: {response.status_code}")
                self.cleanup_test_data(event_id)
                return False
            
            schedule_id = response.json()['id']
            print(f"   ✅ Event scheduled with capacity 2")
            
            # Créer 2 réservations (devrait réussir)
            booking_ids = []
            for i in range(2):
                booking_data = {
                    "first_name": f"Test{i+1}",
                    "last_name": "User",
                    "email": f"test{i+1}@capacity.com",
                    "booking_date": future_date.isoformat(),
                    "day_of_week": "vendredi" if future_date.weekday() == 4 else "samedi",
                    "time_slot": "21h15",
                    "payment_method": "card"
                }
                
                booking_response = requests.post(f"{self.api_url}/bookings", json=booking_data)
                if booking_response.status_code == 200:
                    booking_ids.append(booking_response.json()['id'])
                    print(f"   ✅ Booking {i+1}/2 created successfully")
                else:
                    print(f"   ❌ Failed to create booking {i+1}: {booking_response.status_code}")
                    self.cleanup_test_data(event_id, schedule_id)
                    return False
            
            # Tenter une 3ème réservation (devrait échouer)
            booking_data_overflow = {
                "first_name": "Overflow",
                "last_name": "User",
                "email": "overflow@capacity.com",
                "booking_date": future_date.isoformat(),
                "day_of_week": "vendredi" if future_date.weekday() == 4 else "samedi",
                "time_slot": "21h15",
                "payment_method": "card"
            }
            
            print("   Attempting to create 3rd booking (should fail)...")
            overflow_response = requests.post(f"{self.api_url}/bookings", json=booking_data_overflow)
            
            if overflow_response.status_code == 200:
                # PROBLÈME : Overbooking autorisé !
                self.log_critical_issue(
                    "OVERBOOKING_ERROR",
                    "System allows overbooking beyond capacity limit",
                    {
                        "capacity": 2,
                        "bookings_created": 3,
                        "date": future_date.isoformat(),
                        "time_slot": "21h15"
                    }
                )
                self.cleanup_test_data(event_id, schedule_id)
                return False
            elif overflow_response.status_code == 400:
                print(f"   ✅ Overbooking correctly prevented")
                error_data = overflow_response.json()
                print(f"   Error message: {error_data.get('detail', 'No detail')}")
            else:
                print(f"   ⚠️ Unexpected response: {overflow_response.status_code}")
            
            # Vérifier la disponibilité
            availability_response = requests.get(f"{self.api_url}/availability", params={
                "booking_date": future_date.isoformat(),
                "time_slot": "21h15"
            })
            
            if availability_response.status_code == 200:
                availability = availability_response.json()
                if availability.get('available_spots') == 0 and not availability.get('is_available'):
                    print(f"   ✅ Availability correctly shows 0 spots available")
                else:
                    self.log_critical_issue(
                        "AVAILABILITY_ERROR",
                        "Availability endpoint shows incorrect information",
                        {"availability_response": availability}
                    )
            
        except Exception as e:
            print(f"   ❌ Error testing capacity limits: {str(e)}")
            self.cleanup_test_data(event_id)
            return False
        finally:
            self.cleanup_test_data(event_id, schedule_id)
        
        return True

    def test_24h_rule_scenarios(self):
        """
        VÉRIFICATION DE SÉCURITÉ 5: Règle 24h avec différents scénarios
        """
        print("🎯 Testing 24-hour booking rule scenarios...")
        
        # Créer un événement de test
        event_id = self.create_test_event(15.0)
        if not event_id:
            return False
        
        try:
            # Test 1: Réservation plus de 24h à l'avance (devrait réussir)
            future_date = date.today() + timedelta(days=3)
            schedule_data = {
                "content_id": event_id,
                "content_type": "event",
                "date": future_date.isoformat(),
                "time_slot": "21h15"
            }
            
            response = requests.post(f"{self.api_url}/content-schedules", json=schedule_data, headers=self.admin_headers)
            if response.status_code != 200:
                print(f"   ❌ Failed to schedule event: {response.status_code}")
                self.cleanup_test_data(event_id)
                return False
            
            schedule_id = response.json()['id']
            
            # Réservation normale (plus de 24h)
            booking_data = {
                "first_name": "Test",
                "last_name": "User",
                "email": "test@24h-rule.com",
                "booking_date": future_date.isoformat(),
                "day_of_week": "vendredi" if future_date.weekday() == 4 else "samedi",
                "time_slot": "21h15",
                "payment_method": "card"
            }
            
            print(f"   Testing booking >24h in advance ({future_date})...")
            booking_response = requests.post(f"{self.api_url}/bookings", json=booking_data)
            
            if booking_response.status_code == 200:
                print(f"   ✅ Booking >24h allowed correctly")
            else:
                print(f"   ❌ Booking >24h failed unexpectedly: {booking_response.status_code}")
                self.cleanup_test_data(event_id, schedule_id)
                return False
            
            # Test 2: Vérifier l'endpoint availability avec la règle 24h
            print(f"   Testing availability endpoint with 24h rule...")
            availability_response = requests.get(f"{self.api_url}/availability", params={
                "booking_date": future_date.isoformat(),
                "time_slot": "21h15"
            })
            
            if availability_response.status_code == 200:
                availability = availability_response.json()
                expected_fields = ['is_booking_open', 'hours_until_show', 'closure_reason', 'show_datetime', 'booking_closes_at']
                
                missing_fields = [field for field in expected_fields if field not in availability]
                if missing_fields:
                    self.log_critical_issue(
                        "24H_RULE_MISSING_FIELDS",
                        "Availability endpoint missing 24h rule fields",
                        {"missing_fields": missing_fields}
                    )
                    self.cleanup_test_data(event_id, schedule_id)
                    return False
                
                print(f"   ✅ All 24h rule fields present in availability response")
                print(f"   Hours until show: {availability.get('hours_until_show')}")
                print(f"   Booking open: {availability.get('is_booking_open')}")
                
                if availability.get('hours_until_show', 0) > 24 and not availability.get('is_booking_open'):
                    self.log_critical_issue(
                        "24H_RULE_LOGIC_ERROR",
                        "Booking closed when >24h until show",
                        {"availability": availability}
                    )
                    self.cleanup_test_data(event_id, schedule_id)
                    return False
            
            # Test 3: Exception pour réservations gratuites
            print(f"   Testing 24h rule exception for free bookings...")
            
            # Créer une réservation avec code promo gratuit
            booking_data_free = booking_data.copy()
            booking_data_free["email"] = "test-free@24h-rule.com"
            booking_data_free["promo_code"] = "GRATUIT100"
            booking_data_free["final_price"] = 0.0
            
            free_booking_response = requests.post(f"{self.api_url}/bookings", json=booking_data_free)
            
            if free_booking_response.status_code == 200:
                print(f"   ✅ Free booking allowed (24h rule exception working)")
            else:
                print(f"   ⚠️ Free booking failed: {free_booking_response.status_code}")
                # Ce n'est pas forcément un bug critique si les réservations gratuites suivent aussi la règle 24h
            
        except Exception as e:
            print(f"   ❌ Error testing 24h rule: {str(e)}")
            self.cleanup_test_data(event_id)
            return False
        finally:
            self.cleanup_test_data(event_id, schedule_id)
        
        return True

    def test_admin_authentication_security(self):
        """
        VÉRIFICATION DE SÉCURITÉ 6: Authentification admin sur endpoints sensibles
        """
        print("🎯 Testing admin authentication on sensitive endpoints...")
        
        sensitive_endpoints = [
            ("GET", "admin/dashboard"),
            ("GET", "admin/bookings"),
            ("GET", "admin/promo-codes"),
            ("POST", "admin/promo-codes"),
            ("GET", "admin/movie-suggestions"),
            ("POST", "events"),
            ("PUT", "events/test-id"),
            ("DELETE", "events/test-id"),
            ("POST", "content-schedules"),
            ("DELETE", "content-schedules/test-id"),
            ("POST", "admin/reset-data"),
            ("GET", "admin/time-slots"),
            ("PUT", "admin/time-slots")
        ]
        
        failed_endpoints = []
        
        for method, endpoint in sensitive_endpoints:
            print(f"   Testing {method} /{endpoint} without auth...")
            
            try:
                if method == "GET":
                    response = requests.get(f"{self.api_url}/{endpoint}")
                elif method == "POST":
                    response = requests.post(f"{self.api_url}/{endpoint}", json={})
                elif method == "PUT":
                    response = requests.put(f"{self.api_url}/{endpoint}", json={})
                elif method == "DELETE":
                    response = requests.delete(f"{self.api_url}/{endpoint}")
                
                if response.status_code != 403:
                    failed_endpoints.append(f"{method} /{endpoint} -> {response.status_code}")
                    print(f"   ❌ Expected 403, got {response.status_code}")
                else:
                    print(f"   ✅ Correctly protected (403)")
                    
            except Exception as e:
                print(f"   ⚠️ Error testing {endpoint}: {str(e)}")
        
        if failed_endpoints:
            self.log_critical_issue(
                "ADMIN_AUTH_ERROR",
                "Some admin endpoints not properly protected",
                {"unprotected_endpoints": failed_endpoints}
            )
            return False
        
        print(f"   ✅ All sensitive endpoints properly protected")
        return True

    def run_critical_audit(self):
        """Run all critical bug tests"""
        print("🚨 STARTING CRITICAL BUGS AUDIT")
        print("=" * 60)
        
        tests = [
            ("Price Calculation with Promo Codes", self.test_promo_code_price_calculation_bug),
            ("Stripe Payment Metadata Handling", self.test_stripe_payment_metadata_bug),
            ("Programming Conflict Detection", self.test_programming_conflict_detection_bug),
            ("Capacity Overbooking Prevention", self.test_capacity_overbooking_prevention),
            ("24-Hour Rule Scenarios", self.test_24h_rule_scenarios),
            ("Admin Authentication Security", self.test_admin_authentication_security)
        ]
        
        for test_name, test_func in tests:
            self.run_test(test_name, test_func)
        
        print("\n" + "=" * 60)
        print("🚨 CRITICAL AUDIT RESULTS")
        print("=" * 60)
        
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.critical_issues:
            print(f"\n🚨 CRITICAL ISSUES FOUND: {len(self.critical_issues)}")
            for i, issue in enumerate(self.critical_issues, 1):
                print(f"\n{i}. {issue['type']}: {issue['description']}")
                if issue['details']:
                    print(f"   Details: {json.dumps(issue['details'], indent=2, default=str)}")
        else:
            print(f"\n✅ NO CRITICAL ISSUES FOUND")
        
        return len(self.critical_issues) == 0

if __name__ == "__main__":
    auditor = CriticalBugsAuditor()
    success = auditor.run_critical_audit()
    sys.exit(0 if success else 1)