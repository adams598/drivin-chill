#!/usr/bin/env python3
"""
Script de migration pour initialiser la base de données MongoDB
Crée toutes les collections, index, contraintes et données par défaut
"""
import asyncio
import os
import logging
import uuid
from pathlib import Path
from urllib.parse import quote_plus, urlparse, urlunparse
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from pymongo import ASCENDING, DESCENDING, TEXT

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Charger le .env
ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / '.env'
if env_path.exists():
    load_dotenv(env_path)
    logger.info(f"✅ Fichier .env chargé depuis {env_path}")
else:
    logger.warning(f"⚠️  Fichier .env non trouvé à {env_path}")

# Configuration MongoDB
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

if not mongo_url or not db_name:
    logger.error("❌ MONGO_URL et DB_NAME doivent être définis dans le fichier .env")
    raise ValueError("MONGO_URL et DB_NAME requis")

def encode_mongo_url(url):
    """Encode l'URL MongoDB pour gérer les caractères spéciaux dans le mot de passe"""
    try:
        # Si l'URL contient déjà des caractères encodés, la retourner telle quelle
        if '%' in url and ('%40' in url or '%3A' in url):
            logger.info("   ℹ️  URL déjà encodée, utilisation telle quelle")
            return url
        
        # Parser l'URL
        parsed = urlparse(url)
        
        # Si pas d'authentification, retourner telle quelle
        if '@' not in parsed.netloc:
            return url
        
        # Extraire username et password
        auth_part, host_part = parsed.netloc.rsplit('@', 1)
        if ':' in auth_part:
            username, password = auth_part.split(':', 1)
            # Encoder le username et le password selon RFC 3986
            encoded_username = quote_plus(username, safe='')
            encoded_password = quote_plus(password, safe='')
            # Reconstruire l'URL
            encoded_netloc = f"{encoded_username}:{encoded_password}@{host_part}"
            new_parsed = parsed._replace(netloc=encoded_netloc)
            encoded_url = urlunparse(new_parsed)
            logger.info("   ✅ URL encodée automatiquement pour gérer les caractères spéciaux")
            return encoded_url
        else:
            # Pas de mot de passe, juste encoder le username si nécessaire
            encoded_username = quote_plus(auth_part, safe='')
            encoded_netloc = f"{encoded_username}@{host_part}"
            new_parsed = parsed._replace(netloc=encoded_netloc)
            return urlunparse(new_parsed)
    except Exception as e:
        logger.warning(f"⚠️  Impossible d'encoder l'URL automatiquement: {e}")
        logger.warning("   Tentative avec l'URL originale...")
        return url

# Encoder l'URL si nécessaire
encoded_mongo_url = encode_mongo_url(mongo_url)

logger.info(f"🔗 Connexion à MongoDB: {db_name}")
logger.info(f"   URL: {encoded_mongo_url.split('@')[0] + '@***' if '@' in encoded_mongo_url else '***'}")

async def create_indexes():
    """Crée tous les index nécessaires pour optimiser les requêtes"""
    client = AsyncIOMotorClient(
        encoded_mongo_url,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000,
        socketTimeoutMS=30000
    )
    db = client[db_name]
    
    try:
        # Tester la connexion
        await client.admin.command('ping')
        logger.info("✅ Connexion MongoDB établie")
    except Exception as e:
        logger.error(f"❌ Erreur de connexion MongoDB: {e}")
        raise
    
    logger.info("\n" + "="*60)
    logger.info("🚀 DÉBUT DE LA MIGRATION DE LA BASE DE DONNÉES")
    logger.info("="*60 + "\n")
    
    # ============================================================
    # 1. COLLECTION: movies (Films)
    # ============================================================
    logger.info("📽️  Création de la collection 'movies'...")
    movies_collection = db.movies
    
    # Index pour movies
    await movies_collection.create_index([("id", ASCENDING)], unique=True, name="idx_movies_id_unique")
    await movies_collection.create_index([("is_active", ASCENDING)], name="idx_movies_is_active")
    await movies_collection.create_index([("genre", ASCENDING)], name="idx_movies_genre")
    await movies_collection.create_index([("age_rating", ASCENDING)], name="idx_movies_age_rating")
    await movies_collection.create_index([("title", TEXT)], name="idx_movies_title_text")
    await movies_collection.create_index([("created_at", DESCENDING)], name="idx_movies_created_at")
    logger.info("   ✅ Index créés: id (unique), is_active, genre, age_rating, title (text), created_at")
    
    # ============================================================
    # 2. COLLECTION: events (Événements)
    # ============================================================
    logger.info("\n🎭 Création de la collection 'events'...")
    events_collection = db.events
    
    # Index pour events
    await events_collection.create_index([("id", ASCENDING)], unique=True, name="idx_events_id_unique")
    await events_collection.create_index([("is_active", ASCENDING)], name="idx_events_is_active")
    await events_collection.create_index([("event_type", ASCENDING)], name="idx_events_event_type")
    await events_collection.create_index([("title", TEXT)], name="idx_events_title_text")
    await events_collection.create_index([("created_at", DESCENDING)], name="idx_events_created_at")
    logger.info("   ✅ Index créés: id (unique), is_active, event_type, title (text), created_at")
    
    # ============================================================
    # 3. COLLECTION: bookings (Réservations)
    # ============================================================
    logger.info("\n🎫 Création de la collection 'bookings'...")
    bookings_collection = db.bookings
    
    # Index pour bookings
    await bookings_collection.create_index([("id", ASCENDING)], unique=True, name="idx_bookings_id_unique")
    await bookings_collection.create_index([("email", ASCENDING)], name="idx_bookings_email")
    await bookings_collection.create_index([("booking_date", ASCENDING)], name="idx_bookings_booking_date")
    await bookings_collection.create_index([("time_slot", ASCENDING)], name="idx_bookings_time_slot")
    await bookings_collection.create_index([("status", ASCENDING)], name="idx_bookings_status")
    await bookings_collection.create_index([("payment_status", ASCENDING)], name="idx_bookings_payment_status")
    await bookings_collection.create_index([("is_cancelled", ASCENDING)], name="idx_bookings_is_cancelled")
    await bookings_collection.create_index([("payment_session_id", ASCENDING)], name="idx_bookings_payment_session_id")
    await bookings_collection.create_index([("created_at", DESCENDING)], name="idx_bookings_created_at")
    # Index composé pour les requêtes fréquentes
    await bookings_collection.create_index(
        [("booking_date", ASCENDING), ("time_slot", ASCENDING)],
        name="idx_bookings_date_slot"
    )
    await bookings_collection.create_index(
        [("booking_date", ASCENDING), ("is_cancelled", ASCENDING)],
        name="idx_bookings_date_cancelled"
    )
    logger.info("   ✅ Index créés: id (unique), email, booking_date, time_slot, status, payment_status, is_cancelled, payment_session_id, created_at")
    logger.info("   ✅ Index composés: (booking_date, time_slot), (booking_date, is_cancelled)")
    
    # ============================================================
    # 4. COLLECTION: content_schedules (Programmation de contenu)
    # ============================================================
    logger.info("\n📅 Création de la collection 'content_schedules'...")
    content_schedules_collection = db.content_schedules
    
    # Index pour content_schedules
    await content_schedules_collection.create_index([("id", ASCENDING)], unique=True, name="idx_content_schedules_id_unique")
    await content_schedules_collection.create_index([("content_id", ASCENDING)], name="idx_content_schedules_content_id")
    await content_schedules_collection.create_index([("content_type", ASCENDING)], name="idx_content_schedules_content_type")
    await content_schedules_collection.create_index([("date", ASCENDING)], name="idx_content_schedules_date")
    await content_schedules_collection.create_index([("time_slot", ASCENDING)], name="idx_content_schedules_time_slot")
    await content_schedules_collection.create_index([("is_active", ASCENDING)], name="idx_content_schedules_is_active")
    await content_schedules_collection.create_index([("custom_time", ASCENDING)], name="idx_content_schedules_custom_time")
    # Index composé pour éviter les doublons et optimiser les recherches
    await content_schedules_collection.create_index(
        [("date", ASCENDING), ("time_slot", ASCENDING), ("is_active", ASCENDING)],
        name="idx_content_schedules_date_slot_active"
    )
    await content_schedules_collection.create_index(
        [("date", ASCENDING), ("content_type", ASCENDING), ("is_active", ASCENDING)],
        name="idx_content_schedules_date_type_active"
    )
    # Index unique pour éviter les conflits de programmation
    await content_schedules_collection.create_index(
        [("date", ASCENDING), ("time_slot", ASCENDING), ("is_active", ASCENDING)],
        unique=True,
        partialFilterExpression={"is_active": True, "custom_time": None},
        name="idx_content_schedules_unique_slot"
    )
    logger.info("   ✅ Index créés: id (unique), content_id, content_type, date, time_slot, is_active, custom_time")
    logger.info("   ✅ Index composés: (date, time_slot, is_active), (date, content_type, is_active)")
    logger.info("   ✅ Index unique: (date, time_slot, is_active) pour éviter les conflits")
    
    # ============================================================
    # 5. COLLECTION: movie_schedules (Programmation de films - Legacy)
    # ============================================================
    logger.info("\n🎬 Création de la collection 'movie_schedules' (legacy)...")
    movie_schedules_collection = db.movie_schedules
    
    # Index pour movie_schedules (legacy)
    await movie_schedules_collection.create_index([("id", ASCENDING)], unique=True, name="idx_movie_schedules_id_unique")
    await movie_schedules_collection.create_index([("movie_id", ASCENDING)], name="idx_movie_schedules_movie_id")
    await movie_schedules_collection.create_index([("date", ASCENDING)], name="idx_movie_schedules_date")
    await movie_schedules_collection.create_index([("time_slot", ASCENDING)], name="idx_movie_schedules_time_slot")
    await movie_schedules_collection.create_index([("is_active", ASCENDING)], name="idx_movie_schedules_is_active")
    await movie_schedules_collection.create_index(
        [("date", ASCENDING), ("time_slot", ASCENDING), ("is_active", ASCENDING)],
        name="idx_movie_schedules_date_slot_active"
    )
    logger.info("   ✅ Index créés: id (unique), movie_id, date, time_slot, is_active")
    logger.info("   ✅ Index composé: (date, time_slot, is_active)")
    
    # ============================================================
    # 6. COLLECTION: promo_codes (Codes promo)
    # ============================================================
    logger.info("\n🎟️  Création de la collection 'promo_codes'...")
    promo_codes_collection = db.promo_codes
    
    # Index pour promo_codes
    await promo_codes_collection.create_index([("id", ASCENDING)], unique=True, name="idx_promo_codes_id_unique")
    await promo_codes_collection.create_index([("code", ASCENDING)], unique=True, name="idx_promo_codes_code_unique")
    await promo_codes_collection.create_index([("is_active", ASCENDING)], name="idx_promo_codes_is_active")
    await promo_codes_collection.create_index([("type", ASCENDING)], name="idx_promo_codes_type")
    await promo_codes_collection.create_index([("expiration_date", ASCENDING)], name="idx_promo_codes_expiration_date")
    await promo_codes_collection.create_index([("created_at", DESCENDING)], name="idx_promo_codes_created_at")
    logger.info("   ✅ Index créés: id (unique), code (unique), is_active, type, expiration_date, created_at")
    
    # ============================================================
    # 7. COLLECTION: payment_transactions (Transactions de paiement)
    # ============================================================
    logger.info("\n💳 Création de la collection 'payment_transactions'...")
    payment_transactions_collection = db.payment_transactions
    
    # Index pour payment_transactions
    await payment_transactions_collection.create_index([("id", ASCENDING)], unique=True, name="idx_payment_transactions_id_unique")
    await payment_transactions_collection.create_index([("booking_id", ASCENDING)], name="idx_payment_transactions_booking_id")
    await payment_transactions_collection.create_index([("session_id", ASCENDING)], unique=True, name="idx_payment_transactions_session_id_unique")
    await payment_transactions_collection.create_index([("status", ASCENDING)], name="idx_payment_transactions_status")
    await payment_transactions_collection.create_index([("payment_status", ASCENDING)], name="idx_payment_transactions_payment_status")
    await payment_transactions_collection.create_index([("created_at", DESCENDING)], name="idx_payment_transactions_created_at")
    logger.info("   ✅ Index créés: id (unique), booking_id, session_id (unique), status, payment_status, created_at")
    
    # ============================================================
    # 8. COLLECTION: partner_contacts (Contacts partenaires)
    # ============================================================
    logger.info("\n📧 Création de la collection 'partner_contacts'...")
    partner_contacts_collection = db.partner_contacts
    
    # Index pour partner_contacts
    await partner_contacts_collection.create_index([("id", ASCENDING)], unique=True, name="idx_partner_contacts_id_unique")
    await partner_contacts_collection.create_index([("email", ASCENDING)], name="idx_partner_contacts_email")
    await partner_contacts_collection.create_index([("company_name", ASCENDING)], name="idx_partner_contacts_company_name")
    await partner_contacts_collection.create_index([("created_at", DESCENDING)], name="idx_partner_contacts_created_at")
    logger.info("   ✅ Index créés: id (unique), email, company_name, created_at")
    
    # ============================================================
    # 9. COLLECTION: movie_suggestions (Suggestions de films)
    # ============================================================
    logger.info("\n💡 Création de la collection 'movie_suggestions'...")
    movie_suggestions_collection = db.movie_suggestions
    
    # Index pour movie_suggestions
    await movie_suggestions_collection.create_index([("id", ASCENDING)], unique=True, name="idx_movie_suggestions_id_unique")
    await movie_suggestions_collection.create_index([("status", ASCENDING)], name="idx_movie_suggestions_status")
    await movie_suggestions_collection.create_index([("email", ASCENDING)], name="idx_movie_suggestions_email")
    await movie_suggestions_collection.create_index([("created_at", DESCENDING)], name="idx_movie_suggestions_created_at")
    await movie_suggestions_collection.create_index([("movie_title", TEXT)], name="idx_movie_suggestions_title_text")
    logger.info("   ✅ Index créés: id (unique), status, email, created_at, movie_title (text)")
    
    # ============================================================
    # 10. COLLECTION: time_slot_settings (Paramètres des créneaux)
    # ============================================================
    logger.info("\n⏰ Création de la collection 'time_slot_settings'...")
    time_slot_settings_collection = db.time_slot_settings
    
    # Index pour time_slot_settings
    await time_slot_settings_collection.create_index([("id", ASCENDING)], unique=True, name="idx_time_slot_settings_id_unique")
    await time_slot_settings_collection.create_index([("is_active", ASCENDING)], name="idx_time_slot_settings_is_active")
    logger.info("   ✅ Index créés: id (unique), is_active")
    
    # ============================================================
    # INITIALISATION DES DONNÉES PAR DÉFAUT
    # ============================================================
    logger.info("\n" + "="*60)
    logger.info("📦 INITIALISATION DES DONNÉES PAR DÉFAUT")
    logger.info("="*60 + "\n")
    
    # Vérifier si time_slot_settings existe déjà
    existing_settings = await time_slot_settings_collection.find_one({"is_active": True})
    if not existing_settings:
        logger.info("⚙️  Création des paramètres de créneaux par défaut...")
        default_settings = {
            "id": str(uuid.uuid4()),
            "first_slot_entry_time": "18h45",
            "first_slot_start_time": "19h00",
            "second_slot_entry_time": "21h00",
            "second_slot_start_time": "21h15",
            "third_slot_entry_time": "23h15",
            "third_slot_start_time": "23h30",
            "is_active": True,
            "updated_at": datetime.now(timezone.utc)
        }
        await time_slot_settings_collection.insert_one(default_settings)
        logger.info("   ✅ Paramètres de créneaux par défaut créés")
    else:
        logger.info("   ℹ️  Paramètres de créneaux déjà existants, ignorés")
    
    # ============================================================
    # RÉSUMÉ
    # ============================================================
    logger.info("\n" + "="*60)
    logger.info("✅ MIGRATION TERMINÉE AVEC SUCCÈS")
    logger.info("="*60 + "\n")
    
    # Compter les documents dans chaque collection
    collections_info = {
        "movies": movies_collection,
        "events": events_collection,
        "bookings": bookings_collection,
        "content_schedules": content_schedules_collection,
        "movie_schedules": movie_schedules_collection,
        "promo_codes": promo_codes_collection,
        "payment_transactions": payment_transactions_collection,
        "partner_contacts": partner_contacts_collection,
        "movie_suggestions": movie_suggestions_collection,
        "time_slot_settings": time_slot_settings_collection,
    }
    
    logger.info("📊 RÉSUMÉ DES COLLECTIONS:")
    for name, collection in collections_info.items():
        count = await collection.count_documents({})
        logger.info(f"   • {name}: {count} document(s)")
    
    logger.info("\n🎉 La base de données est prête à être utilisée !")
    
    client.close()

if __name__ == "__main__":
    try:
        asyncio.run(create_indexes())
    except Exception as e:
        logger.error(f"\n❌ ERREUR LORS DE LA MIGRATION: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

