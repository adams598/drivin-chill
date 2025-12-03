from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Query
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from urllib.parse import quote_plus, urlparse, urlunparse
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, date, time, timezone, timedelta
from enum import Enum
import qrcode
import io
import base64
import stripe
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from jinja2 import Template
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import aiosmtplib
import httpx

ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / '.env'

# Charger le .env s'il existe
if env_path.exists():
    load_dotenv(env_path)
    logging.info(f"✅ Fichier .env chargé depuis {env_path}")
else:
    logging.warning(f"⚠️  Fichier .env non trouvé à {env_path}")
    logging.warning("   Créez un fichier .env ou utilisez les variables d'environnement système")

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

if not mongo_url or not db_name:
    logging.error("❌ MONGO_URL et DB_NAME doivent être définis dans les variables d'environnement")
    logging.error("   Créez un fichier .env dans le dossier backend/ avec :")
    logging.error("   MONGO_URL=mongodb://localhost:27017")
    logging.error("   DB_NAME=drivinnchill")
    logging.error("   Ou utilisez MongoDB Atlas : MONGO_URL=mongodb+srv://...")
    # Ne pas bloquer le démarrage, mais les requêtes échoueront
    mongo_url = mongo_url or "mongodb://localhost:27017"
    db_name = db_name or "drivinnchill"
    logging.warning(f"   Utilisation des valeurs par défaut : {mongo_url} / {db_name}")

def encode_mongo_url(url):
    """Encode l'URL MongoDB pour gérer les caractères spéciaux dans le mot de passe"""
    try:
        # Si l'URL contient déjà des caractères encodés, la retourner telle quelle
        if '%' in url and ('%40' in url or '%3A' in url):
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
            return urlunparse(new_parsed)
        else:
            # Pas de mot de passe, juste encoder le username si nécessaire
            encoded_username = quote_plus(auth_part, safe='')
            encoded_netloc = f"{encoded_username}@{host_part}"
            new_parsed = parsed._replace(netloc=encoded_netloc)
            return urlunparse(new_parsed)
    except Exception:
        # En cas d'erreur, retourner l'URL originale
        return url

# Encoder l'URL si nécessaire
encoded_mongo_url = encode_mongo_url(mongo_url)

try:
    # Augmenter le timeout pour MongoDB Atlas (30 secondes)
    client = AsyncIOMotorClient(
        encoded_mongo_url, 
        serverSelectionTimeoutMS=30000, 
        connectTimeoutMS=30000,
        socketTimeoutMS=30000
    )
    db = client[db_name]
    logging.info(f"✅ Connexion MongoDB configurée : {db_name}")
    logging.info(f"   URL: {mongo_url.split('@')[0] + '@***' if '@' in mongo_url else '***'}")
except Exception as e:
    logging.error(f"❌ Erreur lors de la configuration MongoDB : {e}")
    logging.error("   Le serveur démarrera mais les requêtes MongoDB échoueront")
    logging.error("   Vérifiez votre MONGO_URL dans le fichier .env")
    logging.error("   Si votre mot de passe contient @, :, /, etc., encodez-les en URL")
    # Créer des objets None pour éviter les erreurs, mais ils ne fonctionneront pas
    client = None
    db = None

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

class TimeSlot(str, Enum):
    FIRST_SHOW = "21h15"    # Maps to 19h00 Halloween schedule
    SECOND_SHOW = "23h45"   # Maps to 21h15 Halloween schedule
    THIRD_SHOW = "01h30"    # Maps to 23h30 Halloween schedule


# Legacy aliases that should be transparently mapped to the new enum values.
LEGACY_TIME_SLOT_ALIASES = {
    "19h00": TimeSlot.FIRST_SHOW.value,
    "19:00": TimeSlot.FIRST_SHOW.value,
    "21:15": TimeSlot.FIRST_SHOW.value,
    "23h30": TimeSlot.THIRD_SHOW.value,
    "23:30": TimeSlot.THIRD_SHOW.value,
    "23:45": TimeSlot.SECOND_SHOW.value,
    "01:30": TimeSlot.THIRD_SHOW.value,
}


def normalize_time_slot_value(value, *, allow_unknown: bool = False):
    """Normalize legacy time slot values to the canonical enum.

    Args:
        value: Incoming value that may already be a ``TimeSlot`` or a legacy string.
        allow_unknown: When ``True``, do not raise if the value cannot be converted.

    Returns:
        ``TimeSlot`` when the value is recognised, otherwise the original value when
        ``allow_unknown`` is set. Raises ``ValueError`` when conversion fails and
        ``allow_unknown`` is ``False``.
    """

    if value is None or isinstance(value, TimeSlot):
        return value

    if isinstance(value, str):
        normalized = LEGACY_TIME_SLOT_ALIASES.get(value.strip(), value.strip())
        try:
            return TimeSlot(normalized)
        except ValueError:
            if allow_unknown:
                logging.warning(
                    "Créneau horaire inattendu '%s' détecté en base – vérification requise",
                    value,
                )
                return normalized
            raise ValueError(
                "Créneau horaire invalide. Utilisez 21h15, 23h45 ou 01h30."
            )

    if allow_unknown:
        logging.warning(
            "Type de créneau horaire inattendu (%s). Valeur conservée telle quelle.",
            type(value),
        )
        return value

    raise ValueError("Type de créneau horaire invalide fourni")

class DayOfWeek(str, Enum):
    MONDAY = "lundi"
    TUESDAY = "mardi"
    WEDNESDAY = "mercredi"
    THURSDAY = "jeudi"
    FRIDAY = "vendredi"
    SATURDAY = "samedi" 
    SUNDAY = "dimanche"

class PaymentMethod(str, Enum):
    APPLE_PAY = "apple_pay"
    LYDIA = "lydia"
    CARD = "card"
    OTHER = "other"
    FREE_PROMO_CODE = "free_promo_code"

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    PAID = "paid"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class Genre(str, Enum):
    ACTION = "action"
    COMEDY = "comedie"
    DRAMA = "drame"
    HORROR = "horreur"
    ROMANCE = "romance"
    THRILLER = "thriller"
    FANTASY = "fantastique"
    SCIFI = "science-fiction"
    ANIMATION = "animation"
    DOCUMENTARY = "documentaire"
    ADVENTURE = "aventure"

class AgeRating(str, Enum):
    ALL_AGES = "tout_public"
    PG_10 = "deconseille_moins_10"
    PG_12 = "deconseille_moins_12"
    PG_16 = "deconseille_moins_16"
    PG_18 = "interdit_moins_18"

# Models for movies
class Movie(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    synopsis: str
    duration_minutes: int
    genre: Genre
    age_rating: AgeRating
    director: Optional[str] = None
    release_year: Optional[int] = None
    poster_url: Optional[str] = None
    trailer_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MovieCreate(BaseModel):
    title: str
    synopsis: str
    duration_minutes: int
    genre: Genre
    age_rating: AgeRating
    director: Optional[str] = None
    release_year: Optional[int] = None
    poster_url: Optional[str] = None
    trailer_url: Optional[str] = None

class MovieUpdate(BaseModel):
    title: Optional[str] = None
    synopsis: Optional[str] = None
    duration_minutes: Optional[int] = None
    genre: Optional[Genre] = None
    age_rating: Optional[AgeRating] = None
    director: Optional[str] = None
    release_year: Optional[int] = None
    poster_url: Optional[str] = None
    trailer_url: Optional[str] = None
    is_active: Optional[bool] = None

# Models for events
class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    duration_minutes: int
    event_type: str = "spectacle"  # spectacle, concert, soirée thématique, etc.
    organizer: Optional[str] = None
    poster_url: Optional[str] = None
    price: float = 17.0  # Default price, can be different for events
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    title: str
    description: str
    duration_minutes: int
    event_type: str = "spectacle"
    organizer: Optional[str] = None
    poster_url: Optional[str] = None
    price: float = 17.0

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    event_type: Optional[str] = None
    organizer: Optional[str] = None
    poster_url: Optional[str] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None

# Models for system time slots management
class TimeSlotSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Valeurs des créneaux (identifiants configurables)
    first_slot_value: str = "21h15"   # Identifiant du premier créneau (configurable)
    second_slot_value: str = "23h45"  # Identifiant du deuxième créneau (configurable)
    third_slot_value: str = "01h30"   # Identifiant du troisième créneau (configurable)
    # Horaires du premier créneau
    first_slot_entry_time: str = "18h45"   # 15min avant 19h00
    first_slot_start_time: str = "19h00"   # FILM 1: 19H00 - 21H00
    first_slot_end_time: str = "21h00"   # Fin de la première séance
    # Horaires du deuxième créneau
    second_slot_entry_time: str = "21h00"  # 15min avant 21h15
    second_slot_start_time: str = "21h15"  # FILM 2: 21H15 - 23H15
    second_slot_end_time: str = "23h15"   # Fin de la deuxième séance
    # Horaires du troisième créneau
    third_slot_entry_time: str = "23h15"   # 15min avant 23h30
    third_slot_start_time: str = "23h30"   # FILM 3: 23H30 - 01H30
    third_slot_end_time: str = "01h30"    # Fin de la troisième séance
    is_active: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TimeSlotSettingsUpdate(BaseModel):
    # Valeurs des créneaux (identifiants configurables)
    first_slot_value: Optional[str] = None
    second_slot_value: Optional[str] = None
    third_slot_value: Optional[str] = None
    # Horaires
    first_slot_entry_time: Optional[str] = None
    first_slot_start_time: Optional[str] = None
    first_slot_end_time: Optional[str] = None
    second_slot_entry_time: Optional[str] = None
    second_slot_start_time: Optional[str] = None
    second_slot_end_time: Optional[str] = None
    third_slot_entry_time: Optional[str] = None
    third_slot_start_time: Optional[str] = None
    third_slot_end_time: Optional[str] = None
    is_active: Optional[bool] = None

# Models for address management
class AddressSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    address_text: str = "Le petit juillac 87100 Limoges"  # Adresse affichée sur le site
    full_address: str = "Le petit juillac 87100 Limoges"  # Adresse complète pour mentions légales
    latitude: float = 45.8336  # Coordonnée GPS latitude
    longitude: float = 1.2611  # Coordonnée GPS longitude
    is_active: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AddressSettingsUpdate(BaseModel):
    address_text: Optional[str] = None
    full_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None

# Models for promo codes
class PromoCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # The promo code itself (e.g., "SUMMER2024")
    type: str  # "reduction_percentage" or "free_benefit"
    value: Optional[float] = None  # For percentage reduction (e.g., 20 for 20%)
    benefit_description: Optional[str] = None  # For free benefits (e.g., "Boisson + Popcorn offerts")
    is_active: bool = True
    expiration_date: Optional[date] = None
    usage_limit: Optional[int] = None  # Maximum number of uses
    current_usage: int = 0  # Current number of uses
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PromoCodeCreate(BaseModel):
    code: str
    type: str  # "reduction_percentage" or "free_benefit"
    value: Optional[float] = None
    benefit_description: Optional[str] = None
    expiration_date: Optional[date] = None
    usage_limit: Optional[int] = None

class PromoCodeUpdate(BaseModel):
    code: Optional[str] = None
    type: Optional[str] = None
    value: Optional[float] = None
    benefit_description: Optional[str] = None
    is_active: Optional[bool] = None
    expiration_date: Optional[date] = None
    usage_limit: Optional[int] = None

class PromoCodeValidation(BaseModel):
    code: str
    booking_price: float

class PromoCodeResponse(BaseModel):
    valid: bool
    message: str
    discount_amount: Optional[float] = None
    final_price: Optional[float] = None
    benefit_description: Optional[str] = None

# Models for movie suggestions from spectators
class MovieSuggestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    movie_title: str
    director: Optional[str] = None
    release_year: Optional[int] = None
    reason: Optional[str] = None  # Why they want to see this movie
    suggested_by: str  # Name of the person suggesting
    email: Optional[str] = None  # Optional contact email
    status: str = "pending"  # pending, under_review, accepted, rejected
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MovieSuggestionCreate(BaseModel):
    movie_title: str = Field(..., min_length=1, max_length=200)
    director: Optional[str] = Field(None, max_length=100)
    release_year: Optional[int] = Field(None, ge=1900, le=2030)
    reason: Optional[str] = Field(None, max_length=500)
    suggested_by: str = Field(..., min_length=1, max_length=100)
    email: Optional[EmailStr] = None

class MovieSuggestionUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None

# Models for content schedules (movies and events)
class ContentSchedule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content_id: str  # Can be movie_id or event_id
    content_type: str  # "movie" or "event"
    date: date
    time_slot: TimeSlot  # For movies: standard slots (21h15, 23h45)
    custom_time: Optional[str] = None  # For events: custom time (e.g., "19h30")
    capacity: int = 21  # Customizable capacity per schedule (default 21)
    entry_time: Optional[str] = None  # Heure d'entrée (ex: "20h45" ou "20:45")
    start_time: Optional[str] = None  # Heure de début du film (ex: "21h00" ou "21:00")
    end_time: Optional[str] = None  # Heure de fin du film (ex: "23h00" ou "23:00")
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validator("time_slot", pre=True)
    def _normalize_time_slot(cls, value):
        return normalize_time_slot_value(value)

class ContentScheduleCreate(BaseModel):
    content_id: str
    content_type: str  # "movie" or "event"
    date: date
    time_slot: TimeSlot  # For movies: required, for events: can be placeholder
    custom_time: Optional[str] = None  # For events: custom time format (e.g., "19h30")
    capacity: int = 21  # Default capacity, can be customized
    entry_time: Optional[str] = None  # Heure d'entrée (ex: "20h45" ou "20:45")
    start_time: Optional[str] = None  # Heure de début du film (ex: "21h00" ou "21:00")
    end_time: Optional[str] = None  # Heure de fin du film (ex: "23h00" ou "23:00")

    @validator("time_slot", pre=True)
    def _normalize_time_slot(cls, value):
        return normalize_time_slot_value(value)

class ContentScheduleWithDetails(BaseModel):
    schedule: ContentSchedule
    content: Union[Movie, Event]  # Can be either Movie or Event

# Legacy models for backwards compatibility
class MovieSchedule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    movie_id: str
    date: date
    time_slot: TimeSlot
    entry_time: Optional[str] = None  # Heure d'entrée (ex: "20h45" ou "20:45")
    start_time: Optional[str] = None  # Heure de début du film (ex: "21h00" ou "21:00")
    end_time: Optional[str] = None  # Heure de fin du film (ex: "23h00" ou "23:00")
    capacity: int = 21  # Customizable capacity per schedule (default 21)
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MovieScheduleCreate(BaseModel):
    movie_id: str
    date: date
    time_slot: TimeSlot
    entry_time: Optional[str] = None  # Heure d'entrée (ex: "20h45" ou "20:45")
    start_time: Optional[str] = None  # Heure de début du film (ex: "21h00" ou "21:00")
    end_time: Optional[str] = None  # Heure de fin du film (ex: "23h00" ou "23:00")
    capacity: int = 21  # Default capacity, can be customized

class MovieScheduleUpdate(BaseModel):
    movie_id: Optional[str] = None
    date: Optional[date] = None
    time_slot: Optional[TimeSlot] = None
    entry_time: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    capacity: Optional[int] = None

    @validator("time_slot", pre=True)
    def _normalize_time_slot(cls, value):
        if value is None:
            return None
        return normalize_time_slot_value(value)

class MovieScheduleWithMovie(BaseModel):
    schedule: MovieSchedule
    movie: Movie

# Models for ticket booking
class TicketBooking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    booking_date: date
    day_of_week: Union[DayOfWeek, str]  # Allow string for events
    time_slot: Union[TimeSlot, str]     # Allow string for events - identifiant du créneau (21h15, 23h45)
    # Heure d'entrée effective au moment de la réservation (dénormalisée pour l'admin)
    entry_time: Optional[str] = None
    payment_method: PaymentMethod
    price: float = 17.0
    final_price: Optional[float] = None  # Price after promo code discount
    promo_code: Optional[str] = None
    promo_discount_info: Optional[dict] = None
    status: BookingStatus = BookingStatus.PENDING
    payment_status: PaymentStatus = PaymentStatus.PENDING
    payment_session_id: Optional[str] = None
    qr_code: Optional[str] = None
    is_checked_in: bool = False
    checked_in_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_cancelled: bool = False
    nb_personne: int = 1
    content_type: Optional[str] = None  # 'movie' or 'event'
    content_id: Optional[str] = None  # ID of the movie or event

class TicketBookingCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    booking_date: date
    day_of_week: Union[DayOfWeek, str]  # Allow string for events  
    time_slot: Union[TimeSlot, str]     # Allow string for events
    payment_method: PaymentMethod
    promo_code: Optional[str] = None
    final_price: Optional[float] = None  # Price after promo code discount
    # Permet au frontend d'envoyer directement l'heure d'entrée exacte
    entry_time: Optional[str] = None
    nb_personne: int = 1
    # New fields for event booking flexibility
    content_type: Optional[str] = None  # 'movie' or 'event'
    content_id: Optional[str] = None

class TicketBookingUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    booking_date: Optional[date] = None
    day_of_week: Optional[DayOfWeek] = None
    time_slot: Optional[TimeSlot] = None
    status: Optional[BookingStatus] = None

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    session_id: str
    amount: float
    currency: str = "eur"
    status: PaymentStatus = PaymentStatus.PENDING
    payment_status: str = "pending"
    metadata: Dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentRequest(BaseModel):
    booking_id: str
    origin_url: str

class PartnerContact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    contact_name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PartnerContactCreate(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str

class AvailabilityCheck(BaseModel):
    booking_date: date
    time_slot: TimeSlot

# Admin authentication (simple token-based)
async def get_admin_user(credentials = Depends(security)):
    admin_token = os.environ.get('ADMIN_TOKEN', 'admin_token_2024')  # Fallback for development
    if not credentials or credentials.credentials != admin_token:
        raise HTTPException(status_code=403, detail="Accès refusé")
    return True

# Helper function to check MongoDB connection
async def check_mongodb_connection():
    """Check if MongoDB is available"""
    if db is None or client is None:
        logging.warning("⚠️  MongoDB client non initialisé")
        return False
    try:
        await asyncio.wait_for(client.admin.command('ping'), timeout=5.0)
        return True
    except asyncio.TimeoutError:
        logging.error("❌ Timeout lors de la connexion MongoDB")
        return False
    except Exception as e:
        logging.error(f"❌ Erreur de connexion MongoDB : {e}")
        return False

# Helper function to get current time slot settings
async def get_time_slot_settings():
    """Get the current time slot settings from database, or return defaults"""
    if not await check_mongodb_connection():
        logging.warning("MongoDB non disponible - utilisation des paramètres par défaut")
        # Return default settings when MongoDB is not available
        return TimeSlotSettings(
            first_slot_value="21h15",
            second_slot_value="23h45",
            third_slot_value="01h30",
            first_slot_entry_time="18h45",
            first_slot_start_time="19h00",
            first_slot_end_time="21h00",
            second_slot_entry_time="21h00",
            second_slot_start_time="21h15",
            second_slot_end_time="23h15",
            third_slot_entry_time="23h15",
            third_slot_start_time="23h30",
            third_slot_end_time="01h30"
        )
    try:
        settings = await db.time_slot_settings.find_one({"is_active": True})
        if settings:
            return TimeSlotSettings(**parse_from_mongo(settings))
    except Exception as e:
        logging.warning(f"Erreur lors de la récupération des settings: {e} - utilisation des valeurs par défaut")
    else:
        # Return default settings if none exist
        return TimeSlotSettings()

# Helper function to get current address settings
async def get_address_settings():
    """Get the current address settings from database, or return defaults"""
    if not await check_mongodb_connection():
        logging.warning("MongoDB non disponible - utilisation des paramètres d'adresse par défaut")
        # Return default settings when MongoDB is not available
        return AddressSettings(
            address_text="Le petit juillac 87100 Limoges",
            full_address="10 rue de dion bouton, 87280 Limoges, France",
            latitude=45.8336,
            longitude=1.2611
        )
    try:
        settings = await db.address_settings.find_one({"is_active": True})
        if settings:
            return AddressSettings(**parse_from_mongo(settings))
    except Exception as e:
        logging.warning(f"Erreur lors de la récupération des paramètres d'adresse: {e} - utilisation des valeurs par défaut")
    else:
        # Return default settings if none exist
        return AddressSettings()

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data.get('booking_date'), date):
        data['booking_date'] = data['booking_date'].isoformat()
    if isinstance(data.get('date'), date):
        data['date'] = data['date'].isoformat()
    if isinstance(data.get('time_slot'), Enum):
        data['time_slot'] = data['time_slot'].value
    if isinstance(data.get('status'), Enum):
        data['status'] = data['status'].value
    if isinstance(data.get('payment_status'), Enum):
        data['payment_status'] = data['payment_status'].value
    if isinstance(data.get('payment_method'), Enum):
        data['payment_method'] = data['payment_method'].value
    if isinstance(data.get('day_of_week'), Enum):
        data['day_of_week'] = data['day_of_week'].value
    if isinstance(data.get('created_at'), datetime):
        data['created_at'] = data['created_at'].isoformat()
    if isinstance(data.get('updated_at'), datetime):
        data['updated_at'] = data['updated_at'].isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item.get('booking_date'), str):
        item['booking_date'] = datetime.fromisoformat(item['booking_date']).date()
    if isinstance(item.get('date'), str):
        item['date'] = datetime.fromisoformat(item['date']).date()
    if 'time_slot' in item:
        normalized_slot = normalize_time_slot_value(item['time_slot'], allow_unknown=True)
        if isinstance(normalized_slot, TimeSlot):
            item['time_slot'] = normalized_slot.value
        else:
            item['time_slot'] = normalized_slot
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('updated_at'), str):
        item['updated_at'] = datetime.fromisoformat(item['updated_at'])
    # Ensure nb_personne exists for backward compatibility with old bookings
    if 'nb_personne' not in item:
        item['nb_personne'] = 1
    return item


async def migrate_legacy_time_slots():
    """Replace legacy time slots stored in MongoDB with the new enum values."""
    
    # Vérifier que MongoDB est disponible
    if db is None:
        logging.warning("⚠️  MongoDB non disponible - migration des créneaux legacy ignorée")
        return
    
    # Tester la connexion
    try:
        await client.admin.command('ping')
    except Exception as e:
        logging.warning(f"⚠️  Impossible de se connecter à MongoDB - migration ignorée : {e}")
        return

    legacy_values = {
        legacy: target for legacy, target in LEGACY_TIME_SLOT_ALIASES.items() if legacy != target
    }

    if not legacy_values:
        return

    collections_to_update = (
        (db.content_schedules, "content_schedules"),
        (db.movie_schedules, "movie_schedules"),
        (db.bookings, "bookings"),
    )

    for collection, collection_name in collections_to_update:
        try:
            documents = await collection.find({
                "time_slot": {"$in": list(legacy_values.keys())},
                "is_active": {"$ne": False}
            }).to_list(1000)
        except Exception as exc:
            logging.error(
                "Impossible de rechercher les créneaux legacy dans %s: %s",
                collection_name,
                exc,
            )
            continue

        for document in documents:
            legacy_value = document.get("time_slot")
            try:
                normalized = normalize_time_slot_value(legacy_value)
            except ValueError:
                logging.warning(
                    "Valeur de créneau '%s' non convertie pour %s (id=%s)",
                    legacy_value,
                    collection_name,
                    document.get("id", document.get("_id")),
                )
                continue

            new_value = normalized.value if isinstance(normalized, TimeSlot) else normalized

            if new_value == legacy_value:
                continue

            try:
                await collection.update_one(
                    {"_id": document["_id"]},
                    {"$set": {"time_slot": new_value}}
                )
                logging.info(
                    "Créneau legacy %s -> %s migré dans %s (id=%s)",
                    legacy_value,
                    new_value,
                    collection_name,
                    document.get("id", document.get("_id")),
                )
            except Exception as exc:
                logging.error(
                    "Échec de la mise à jour du créneau %s dans %s (id=%s): %s",
                    legacy_value,
                    collection_name,
                    document.get("id", document.get("_id")),
                    exc,
                )

def generate_qr_code(booking_data: dict) -> str:
    """Generate QR code for booking - returns base64 data URI"""
    qr_data = f"DRIVIN_AND_CHILL\nRéservation: {booking_data['id']}\n{booking_data['first_name']} {booking_data['last_name']}\nDate: {booking_data['booking_date']}\nCréneau: {booking_data['time_slot']}\nPrix: {booking_data['price']}€"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 string
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def generate_qr_code_image_bytes(booking_data: dict) -> bytes:
    """Generate QR code as binary image bytes for email attachments"""
    qr_data = f"DRIVIN_AND_CHILL\nRéservation: {booking_data['id']}\n{booking_data['first_name']} {booking_data['last_name']}\nDate: {booking_data['booking_date']}\nCréneau: {booking_data['time_slot']}\nPrix: {booking_data['price']}€"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()

# Initialize Stripe
stripe_api_key = os.environ.get('STRIPE_SECRET_KEY') or os.environ.get('STRIPE_API_KEY')
if not stripe_api_key:
    logging.warning("STRIPE_SECRET_KEY or STRIPE_API_KEY not found in environment")
else:
    stripe.api_key = stripe_api_key

# Email configuration
conf = None
email_enabled = False

# Check if email credentials are provided
email_username = os.environ.get('EMAIL_FROM')
email_password = os.environ.get('EMAIL_PASSWORD')
email_host = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
email_port = int(os.environ.get('EMAIL_PORT', '587'))

if email_username and email_password:
    conf = ConnectionConfig(
        MAIL_USERNAME=email_username,
        MAIL_PASSWORD=email_password,
        MAIL_FROM=email_username,
        MAIL_PORT=email_port,
        MAIL_SERVER=email_host,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )
    email_enabled = True
    logging.info(f"Email configuration loaded: {email_username}")
else:
    logging.warning("Email credentials not found. Emails will be simulated.")

# Enhanced email sending with retry mechanism
async def send_confirmation_email(booking: TicketBooking, qr_code: str, max_retries: int = 3):
    """Send confirmation email with QR code - with retry mechanism"""
    logging.info(f"📧 send_confirmation_email appelé pour {booking.email}")
    logging.info(f"📧 email_enabled = {email_enabled}")
    
    # Récupérer les informations du film et du schedule
    movie_title = "Film à confirmer"
    entry_time = None
    start_time = None
    end_time = None
    promo_info = None
    booking_final_price = booking.final_price if booking.final_price else booking.price
    booking_promo_code = booking.promo_code
    booking_promo_discount_info = booking.promo_discount_info
    
    try:
        # Récupérer le booking depuis la base de données pour avoir toutes les infos à jour
        booking_db = await db.bookings.find_one({"id": booking.id})
        if booking_db:
            # Utiliser les données de la DB pour avoir les infos complètes
            booking_final_price = booking_db.get("final_price") or booking.price
            booking_promo_code = booking_db.get("promo_code") or booking.promo_code
            booking_promo_discount_info = booking_db.get("promo_discount_info")
        
        # Utiliser la même logique que pour l'admin : récupérer les détails via get_booking_details_from_schedules
        # Cela permet d'avoir les bonnes valeurs même pour les anciennes réservations
        booking_date_str = booking.booking_date.isoformat() if isinstance(booking.booking_date, date) else str(booking.booking_date)
        time_slot_str = str(booking.time_slot)
        
        # Récupérer le schedule complet une seule fois pour avoir tous les horaires cohérents
        # Utiliser la même logique que dans le frontend : récupérer le schedule complet
        final_schedule = None
        movie_title_final = None
        
        # 1) Si on a content_id et content_type, chercher directement
        if booking.content_id and booking.content_type:
            final_schedule = await db.content_schedules.find_one({
                "date": booking_date_str,
                "content_id": booking.content_id,
                "content_type": booking.content_type,
                "is_active": True
            })
            if not final_schedule:
                final_schedule = await db.content_schedules.find_one({
                    "date": booking_date_str,
                    "content_id": booking.content_id,
                    "content_type": booking.content_type
                })
        
        # 2) Si pas trouvé, récupérer movie_title d'abord pour chercher précisément
        if not final_schedule:
            booking_details = await get_booking_details_from_schedules(
                booking.booking_date,
                booking.time_slot,
                booking.content_id,
                booking.content_type
            )
            movie_title_final = booking_details.get("movie_title")
            
            # Si on a movie_title, chercher tous les schedules et trouver celui qui correspond
            if movie_title_final:
                # Chercher dans content_schedules
                all_schedules = await db.content_schedules.find({
                    "date": booking_date_str,
                    "time_slot": time_slot_str,
                    "is_active": True
                }).to_list(100)
                
                if not all_schedules:
                    all_schedules = await db.content_schedules.find({
                        "date": booking_date_str,
                        "time_slot": time_slot_str
                    }).to_list(100)
                
                # Trouver le schedule qui correspond au movie_title
                for schedule in all_schedules:
                    schedule_content_id = schedule.get("content_id")
                    schedule_content_type = schedule.get("content_type", "movie")
                    
                    if schedule_content_type == "movie" and schedule_content_id:
                        movie = await db.movies.find_one({"id": schedule_content_id})
                        if movie and movie.get("title") == movie_title_final:
                            final_schedule = schedule
                            logging.info(f"📧 content_schedule trouvé via movie_title '{movie_title_final}'")
                            break
                    elif schedule_content_type == "event" and schedule_content_id:
                        event = await db.events.find_one({"id": schedule_content_id})
                        if event and event.get("title") == movie_title_final:
                            final_schedule = schedule
                            logging.info(f"📧 content_schedule trouvé via movie_title '{movie_title_final}'")
                            break
                
                # Si pas trouvé dans content_schedules, chercher dans movie_schedules legacy
                if not final_schedule:
                    all_movie_schedules = await db.movie_schedules.find({
                        "date": booking_date_str,
                        "time_slot": time_slot_str,
                        "is_active": True
                    }).to_list(100)
                    
                    if not all_movie_schedules:
                        all_movie_schedules = await db.movie_schedules.find({
                            "date": booking_date_str,
                            "time_slot": time_slot_str
                        }).to_list(100)
                    
                    # Pour chaque schedule, vérifier si le titre correspond
                    for sched in all_movie_schedules:
                        movie_id = sched.get("movie_id")
                        if movie_id:
                            movie = await db.movies.find_one({"id": movie_id})
                            if movie and movie.get("title") == movie_title_final:
                                final_schedule = sched
                                logging.info(f"📧 movie_schedule trouvé via movie_title '{movie_title_final}'")
                                break
        
        # 3) Si toujours pas trouvé, chercher par time_slot seul (fallback)
        if not final_schedule:
            final_schedule = await db.content_schedules.find_one({
                "date": booking_date_str,
                "time_slot": time_slot_str,
                "is_active": True
            })
            if not final_schedule:
                final_schedule = await db.content_schedules.find_one({
                    "date": booking_date_str,
                    "time_slot": time_slot_str
                })
            
            # Si toujours pas trouvé, chercher dans movie_schedules legacy
            if not final_schedule:
                final_schedule = await db.movie_schedules.find_one({
                    "date": booking_date_str,
                    "time_slot": time_slot_str,
                    "is_active": True
                })
                if not final_schedule:
                    final_schedule = await db.movie_schedules.find_one({
                        "date": booking_date_str,
                        "time_slot": time_slot_str
                    })
        
        # 4) Récupérer tous les horaires depuis le même schedule (comme dans le frontend)
        if final_schedule:
            entry_time = booking.entry_time or final_schedule.get("entry_time")
            start_time = final_schedule.get("start_time")
            end_time = final_schedule.get("end_time")
            
            # Récupérer aussi movie_title depuis le schedule si pas déjà fait
            if not movie_title_final:
                if final_schedule.get("content_type") == "movie" and final_schedule.get("content_id"):
                    movie = await db.movies.find_one({"id": final_schedule.get("content_id")})
                    if movie:
                        movie_title_final = movie.get("title")
                elif final_schedule.get("content_type") == "event" and final_schedule.get("content_id"):
                    event = await db.events.find_one({"id": final_schedule.get("content_id")})
                    if event:
                        movie_title_final = event.get("title")
                elif final_schedule.get("movie_id"):
                    movie = await db.movies.find_one({"id": final_schedule.get("movie_id")})
                    if movie:
                        movie_title_final = movie.get("title")
            
            logging.info(f"📧 Horaires depuis schedule complet: entry={entry_time}, start={start_time}, end={end_time}, movie={movie_title_final}")
        
        movie_title = movie_title_final or movie_title
        
        # Si les horaires ne sont pas dans le schedule, utiliser TimeSlotSettings comme fallback
        if not entry_time or not start_time or not end_time:
            logging.info(f"📧 Horaires manquants dans schedule, utilisation de TimeSlotSettings comme fallback")
            try:
                time_settings = await get_time_slot_settings()
                time_slot_str = str(booking.time_slot).lower()
                
                # Déterminer quel créneau utiliser en comparant avec les valeurs configurées
                first_slot_match = (time_slot_str == time_settings.first_slot_value.lower() or 
                                   time_slot_str in time_settings.first_slot_value.lower() or
                                   time_settings.first_slot_value.lower() in time_slot_str)
                second_slot_match = (time_slot_str == time_settings.second_slot_value.lower() or 
                                    time_slot_str in time_settings.second_slot_value.lower() or
                                    time_settings.second_slot_value.lower() in time_slot_str)
                third_slot_match = (time_slot_str == time_settings.third_slot_value.lower() or 
                                   time_slot_str in time_settings.third_slot_value.lower() or
                                   time_settings.third_slot_value.lower() in time_slot_str)
                
                if first_slot_match:
                    entry_time = entry_time or time_settings.first_slot_entry_time
                    start_time = start_time or time_settings.first_slot_start_time
                    end_time = end_time or time_settings.first_slot_end_time
                    logging.info(f"📧 Utilisation du premier créneau depuis TimeSlotSettings")
                elif second_slot_match:
                    entry_time = entry_time or time_settings.second_slot_entry_time
                    start_time = start_time or time_settings.second_slot_start_time
                    end_time = end_time or time_settings.second_slot_end_time
                    logging.info(f"📧 Utilisation du deuxième créneau depuis TimeSlotSettings")
                elif third_slot_match:
                    entry_time = entry_time or time_settings.third_slot_entry_time
                    start_time = start_time or time_settings.third_slot_start_time
                    end_time = end_time or time_settings.third_slot_end_time
                    logging.info(f"📧 Utilisation du troisième créneau depuis TimeSlotSettings")
                else:
                    # Fallback: essayer de déterminer depuis le time_slot
                    if "19h" in time_slot_str or "18h" in time_slot_str:
                        entry_time = entry_time or time_settings.first_slot_entry_time
                        start_time = start_time or time_settings.first_slot_start_time
                        end_time = end_time or time_settings.first_slot_end_time
                        logging.info(f"📧 Fallback: utilisation du premier créneau (détection par heure)")
                    elif "21h" in time_slot_str and "23h" not in time_slot_str:
                        entry_time = entry_time or time_settings.second_slot_entry_time
                        start_time = start_time or time_settings.second_slot_start_time
                        end_time = end_time or time_settings.second_slot_end_time
                        logging.info(f"📧 Fallback: utilisation du deuxième créneau (détection par heure)")
                    elif "23h" in time_slot_str or "01h" in time_slot_str or "1h" in time_slot_str:
                        entry_time = entry_time or time_settings.third_slot_entry_time
                        start_time = start_time or time_settings.third_slot_start_time
                        end_time = end_time or time_settings.third_slot_end_time
                        logging.info(f"📧 Fallback: utilisation du troisième créneau (détection par heure)")
                
                logging.info(f"📧 Horaires depuis TimeSlotSettings: entry={entry_time}, start={start_time}, end={end_time}")
            except Exception as e:
                logging.warning(f"⚠️ Erreur lors de la récupération des TimeSlotSettings: {str(e)}")
        
        # Récupérer les informations du code promo si applicable
        if booking_promo_code:
            promo_code_doc = await db.promo_codes.find_one({
                "code": booking_promo_code.upper().strip(),
                "is_active": True
            })
            
            if promo_code_doc:
                promo_type = promo_code_doc.get("type")
                if promo_type == "reduction_percentage":
                    # Utiliser discount_amount depuis promo_discount_info si disponible, sinon calculer
                    if booking_promo_discount_info and booking_promo_discount_info.get("discount_amount"):
                        discount_amount = booking_promo_discount_info.get("discount_amount", 0)
                    else:
                        # Calculer depuis le code promo
                        promo_value = promo_code_doc.get("value", 0)
                        discount_amount = (booking.price * promo_value) / 100
                    
                    # Calculer le prix final : prix initial - réduction (ne peut pas être négatif)
                    calculated_final_price = max(0, booking.price - discount_amount)
                    # Utiliser booking_final_price si disponible et différent, sinon utiliser le calcul
                    final_price_to_use = booking_final_price if booking_final_price is not None and booking_final_price != booking.price else calculated_final_price
                    
                    promo_info = {
                        "code": booking_promo_code,
                        "type": "reduction",
                        "discount_amount": round(discount_amount, 2),
                        "final_price": round(final_price_to_use, 2)
                    }
                    logging.info(f"📧 Code promo calculé: discount={discount_amount}, prix initial={booking.price}, prix final={final_price_to_use}")
                elif promo_type == "free_benefit":
                    benefit_desc = promo_code_doc.get("benefit_description", "")
                    promo_info = {
                        "code": booking_promo_code,
                        "type": "benefit",
                        "benefit_description": benefit_desc
                    }
    except Exception as e:
        logging.warning(f"⚠️ Erreur lors de la récupération des infos pour l'email: {str(e)}")
    
    # Formater les heures (normaliser le format)
    def format_time(time_str):
        if not time_str:
            return "À confirmer"
        # Normaliser le format (20h45 -> 20:45 ou garder tel quel)
        return time_str.replace("h", ":") if "h" in time_str else time_str
    
    entry_time_formatted = format_time(entry_time) if entry_time else "À confirmer"
    start_time_formatted = format_time(start_time) if start_time else "À confirmer"
    end_time_formatted = format_time(end_time) if end_time else "À confirmer"
    
    # Construire la section code promo
    promo_section = ""
    if promo_info:
        if promo_info["type"] == "reduction":
            promo_section = f"""
                    <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4caf50;">
                        <h4 style="margin: 0 0 10px 0; color: #2e7d32;">🎟️ Code Promo Appliqué</h4>
                        <p style="margin: 5px 0;"><strong>Code :</strong> {promo_info["code"]}</p>
                        <p style="margin: 5px 0;"><strong>Réduction :</strong> {promo_info["discount_amount"]:.2f}€</p>
                        <p style="margin: 5px 0;"><strong>Prix final :</strong> {promo_info["final_price"]:.2f}€</p>
                    </div>
            """
        elif promo_info["type"] == "benefit":
            promo_section = f"""
                    <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4caf50;">
                        <h4 style="margin: 0 0 10px 0; color: #2e7d32;">🎟️ Code Promo Appliqué</h4>
                        <p style="margin: 5px 0;"><strong>Code :</strong> {promo_info["code"]}</p>
                        <p style="margin: 5px 0;"><strong>Avantages inclus :</strong> {promo_info["benefit_description"]}</p>
                    </div>
            """
    
    if not email_enabled:
        # Simulate email for demo/development
        logging.info(f"📧 [SIMULATION] Email envoyé à {booking.email}")
        logging.info(f"📧 Sujet: Confirmation de votre réservation - Drivin And Chill")
        logging.info(f"📧 QR Code inclus pour la réservation {booking.id}")
        logging.info(f"📧 Film: {movie_title}")
        logging.info(f"📧 Heures: Entrée {entry_time_formatted}, Début {start_time_formatted}, Fin {end_time_formatted}")
        if promo_info:
            logging.info(f"📧 Code promo: {promo_info['code']}")
        logging.warning(f"⚠️ EMAIL EN MODE SIMULATION - Configurez EMAIL_USERNAME et EMAIL_PASSWORD dans .env pour activer l'envoi réel")
        return True
    
    if not conf:
        logging.error(f"❌ Configuration email non initialisée (conf is None)")
        return False
    
    # Generate QR code as bytes for inline attachment
    # We'll use inline attachment with Content-ID for better email client compatibility
    qr_code_bytes = generate_qr_code_image_bytes(booking.dict())
    qr_cid = f"qrcode_{booking.id}"
    logging.info(f"📧 QR Code généré pour pièce jointe inline (CID: {qr_cid})")
    
    # Create email template
    email_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
            .header {{ text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }}
            .content {{ line-height: 1.6; color: #333; }}
            .qr-code {{ text-align: center; margin: 30px 0; }}
            .booking-details {{ background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎬 Drivin And Chill</h1>
                <h2>Confirmation de Réservation</h2>
            </div>
            
            <div class="content">
                <p>Bonjour {booking.first_name} {booking.last_name},</p>
                
                <p>Votre réservation a été confirmée avec succès ! Nous sommes ravis de vous accueillir dans notre cinéma drive-in à Limoges.</p>
                
                <div class="booking-details">
                    <h3>📋 Détails de votre réservation</h3>
                    <p><strong>ID de réservation :</strong> {booking.id}</p>
                    <p><strong>Date :</strong> {booking.booking_date}</p>
                    <p><strong>Créneau :</strong> {entry_time_formatted}</p>
                    <p><strong>Film :</strong> {movie_title}</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                    <h4 style="margin: 15px 0 10px 0; color: #667eea;">⏰ Horaires</h4>
                    <p><strong>Heure d'entrée :</strong> {entry_time_formatted}</p>
                    <p><strong>Heure de début du film :</strong> {start_time_formatted}</p>
                    <p><strong>Heure de fin du film :</strong> {end_time_formatted}</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                    <p><strong>Prix :</strong> {booking_final_price:.2f}€</p>
                    {promo_section}
                    <p><strong>Statut :</strong> Confirmé</p>
                </div>
                
                <div class="qr-code">
                    <h3>🎫 Votre billet d'entrée</h3>
                    <p>Présentez ce QR code à l'entrée :</p>
                    <!-- Utilisation de Content-ID pour pièce jointe inline -->
                    <img src="cid:{qr_cid}" alt="QR Code de réservation" style="max-width: 200px; height: auto; display: block; margin: 15px auto; border: 2px solid #667eea; border-radius: 8px; padding: 10px; background-color: white;">
                    <!-- Fallback avec data URI si le client email ne supporte pas les pièces jointes inline -->
                    <img src="{qr_code}" alt="QR Code Fallback" style="max-width: 200px; height: auto; display: none;">
                    <p style="text-align: center; font-size: 12px; color: #666; margin-top: 10px;">Si l'image ne s'affiche pas, vérifiez que votre client email autorise l'affichage des images.</p>
                </div>
                
                <h3>ℹ️ Informations importantes</h3>
                <ul>
                    <li>Arrivez 15 minutes avant le début de la séance</li>
                    <li>Syntonisez votre radio FM pour le son du film</li>
                    <li>Snacking disponible sur place via QR code</li>
                    <li>En cas de pluie, consultez notre politique d'annulation</li>
                </ul>
                
                <p>Nous avons hâte de vous voir ! 🍿</p>
            </div>
            
            <div class="footer">
                <p>Drivin And Chill - Cinéma Drive-in Limoges</p>
                <p>Questions ? Contactez-nous sur Instagram @drivinnchill</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Try sending email with retry mechanism
    logging.info(f"📧 Début de l'envoi d'email à {booking.email} (max {max_retries} tentatives)")
    for attempt in range(max_retries):
        try:
            logging.info(f"📧 Tentative {attempt + 1}/{max_retries} d'envoi d'email à {booking.email}")
            
            try:
                # Create multipart message with inline QR code attachment
                # Using email.mime for proper Content-ID support
                msg = MIMEMultipart('related')
                msg['Subject'] = "🎬 Confirmation de votre réservation - Drivin And Chill"
                msg['From'] = email_username
                msg['To'] = booking.email
                
                # Create the HTML part
                html_part = MIMEText(email_template, 'html', 'utf-8')
                msg.attach(html_part)
                
                # Attach QR code as inline image with Content-ID
                qr_image = MIMEImage(qr_code_bytes)
                qr_image.add_header('Content-ID', f'<{qr_cid}>')
                qr_image.add_header('Content-Disposition', 'inline', filename=f'qrcode_{booking.id}.png')
                msg.attach(qr_image)
                
                logging.info(f"📧 Message multipart créé avec QR code inline (Content-ID: <{qr_cid}>)")
                
                # Send email using aiosmtplib for better control
                logging.info(f"📧 Envoi via SMTP direct: {email_host}:{email_port}")
                async with aiosmtplib.SMTP(hostname=email_host, port=email_port, start_tls=True) as smtp:
                    await smtp.login(email_username, email_password)
                    await smtp.send_message(msg)
                    
            except ImportError:
                # Fallback to fastapi-mail if aiosmtplib is not available
                logging.warning("⚠️ aiosmtplib non disponible, utilisation de fastapi-mail avec data URI")
                message = MessageSchema(
                    subject="🎬 Confirmation de votre réservation - Drivin And Chill",
                    recipients=[booking.email],
                    body=email_template,
                    subtype=MessageType.html
                )
                fm = FastMail(conf)
                await fm.send_message(message)
            
            logging.info(f"✅ Email envoyé avec succès à {booking.email} (tentative {attempt + 1})")
            return True
            
        except Exception as e:
            error_msg = str(e)
            logging.error(f"❌ Échec envoi email à {booking.email} (tentative {attempt + 1}/{max_retries})")
            logging.error(f"❌ Erreur détaillée: {error_msg}", exc_info=True)
            
            # Log more details about the error
            if "535" in error_msg or "authentication" in error_msg.lower() or "invalid" in error_msg.lower():
                logging.error(f"❌ Erreur d'authentification SMTP - Vérifiez EMAIL_USERNAME et EMAIL_PASSWORD")
                logging.error(f"❌ Le mot de passe d'application Gmail doit être utilisé, pas le mot de passe principal")
            elif "connection" in error_msg.lower() or "timeout" in error_msg.lower() or "network" in error_msg.lower():
                logging.error(f"❌ Erreur de connexion SMTP - Vérifiez EMAIL_HOST ({email_host}) et EMAIL_PORT ({email_port})")
            elif "550" in error_msg or "recipient" in error_msg.lower():
                logging.error(f"❌ Erreur de destinataire - Vérifiez l'adresse email: {booking.email}")
            
            if attempt < max_retries - 1:
                # Wait before retry (exponential backoff)
                wait_time = 2 ** attempt
                logging.info(f"⏳ Attente de {wait_time} secondes avant nouvelle tentative...")
                await asyncio.sleep(wait_time)
            else:
                logging.error(f"❌ Abandon envoi email après {max_retries} tentatives - Dernière erreur: {error_msg}")
                # Don't raise exception - booking should still succeed even if email fails
                return False
    
    return False

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Bienvenue sur la billetterie Drivin And Chill"}

@api_router.post("/bookings", response_model=TicketBooking)
async def create_booking(booking_data: TicketBookingCreate):
    try:
        # Initialize content_schedule
        content_schedule = None
        movie_schedule = None
        
        # Special handling for events - allow more flexible validation
        if booking_data.content_type == "event":
            # For events, we can be more flexible with day_of_week and time_slot validation
            # Convert any day string to proper DayOfWeek enum if needed
            valid_days = {
                "lundi": DayOfWeek.MONDAY,
                "mardi": DayOfWeek.TUESDAY, 
                "mercredi": DayOfWeek.WEDNESDAY,
                "jeudi": DayOfWeek.THURSDAY,
                "vendredi": DayOfWeek.FRIDAY,
                "samedi": DayOfWeek.SATURDAY,
                "dimanche": DayOfWeek.SUNDAY
            }
            
            # Check if we have a content schedule for this event
            # Try to find by content_id first if provided
            if booking_data.content_id:
                content_schedule = await db.content_schedules.find_one({
                    "date": booking_data.booking_date.isoformat(),
                    "content_id": booking_data.content_id,
                    "content_type": "event",
                    "is_active": True
                })
            
            # If not found and content_id not provided, try to find by time_slot or custom_time
            if not content_schedule:
                # Try by time_slot
                content_schedule = await db.content_schedules.find_one({
                    "date": booking_data.booking_date.isoformat(),
                    "time_slot": booking_data.time_slot,
                    "content_type": "event",
                    "is_active": True
                })
            
            # If still not found, try by custom_time
            if not content_schedule:
                content_schedule = await db.content_schedules.find_one({
                    "date": booking_data.booking_date.isoformat(),
                    "custom_time": booking_data.time_slot,
                    "content_type": "event",
                    "is_active": True
                })
            
            if not content_schedule:
                raise HTTPException(status_code=400, detail="Aucun événement n'est programmé à cette date")
        
        else:
            # For movies, allow any day of the week (no more weekend restriction)            
            # Check if a movie is scheduled for this date and time slot
            content_schedule = await db.content_schedules.find_one({
                "date": booking_data.booking_date.isoformat(),
                "time_slot": booking_data.time_slot,
                "content_type": "movie",
                "is_active": True
            }) or await db.movie_schedules.find_one({
                "date": booking_data.booking_date.isoformat(),
                "time_slot": booking_data.time_slot,
                "is_active": True
            })
            
            if not content_schedule:
                raise HTTPException(status_code=400, detail="Aucun film n'est programmé à cette date et ce créneau")
        
        # Check if booking date is not in the past
        if booking_data.booking_date < datetime.now(timezone.utc).date():
            raise HTTPException(status_code=400, detail="Impossible de réserver pour une date passée")
        
        # Check 8-hour booking cutoff
        time_settings = await get_time_slot_settings()
        
        # Determine the exact show start time based on time slot
        if booking_data.time_slot == TimeSlot.FIRST_SHOW:  # "21h15"
            show_time_str = time_settings.first_slot_start_time
        else:  # "23h45" 
            show_time_str = time_settings.second_slot_start_time
        
        # Parse show time (format: "20h45")
        hour, minute = show_time_str.split('h')
        show_time = time(int(hour), int(minute))
        
        # Create datetime for the show
        show_datetime = datetime.combine(booking_data.booking_date, show_time)
        show_datetime_utc = show_datetime.replace(tzinfo=timezone.utc)
        
        # Get current time
        now_utc = datetime.now(timezone.utc)
        
        # Calculate time difference
        time_until_show = show_datetime_utc - now_utc
        hours_until_show = time_until_show.total_seconds() / 3600
        
        # We'll check the 8-hour rule later, after calculating if it's a free booking
        if hours_until_show < 0:
            raise HTTPException(status_code=400, detail="Cette séance a déjà eu lieu.")
        
        # Check if a content (movie or event) is scheduled for this date and time slot
        content_schedule = await db.content_schedules.find_one({
            "date": booking_data.booking_date.isoformat(),
            "time_slot": booking_data.time_slot,
            "is_active": True
        })
        
        # SPECIAL CASE: For events with custom_time, also check if user sent custom_time as time_slot
        # This happens when frontend passes custom_time as selectedTimeSlot
        if not content_schedule and booking_data.content_type == "event":
            # Try to find event by custom_time instead of time_slot
            content_schedule = await db.content_schedules.find_one({
                "date": booking_data.booking_date.isoformat(),
                "custom_time": booking_data.time_slot,  # User sent custom_time as time_slot
                "content_type": "event",
                "is_active": True
            })
        
        movie_schedule = None
        if not content_schedule:
            # Check legacy movie schedules if no content schedule found
            movie_schedule = await db.movie_schedules.find_one({
                "date": booking_data.booking_date.isoformat(),
                "time_slot": booking_data.time_slot,
                "is_active": True
            })
        
        if not content_schedule and not movie_schedule:
            raise HTTPException(
                status_code=400, 
                detail=f"Aucun contenu n'est programmé pour le {booking_data.booking_date} à {booking_data.time_slot}. Veuillez choisir une autre date ou contactez-nous."
            )
        
        # Get the custom capacity from the schedule
        schedule_capacity = 21  # Default capacity
        
        if content_schedule:
            schedule_capacity = content_schedule.get("capacity", 21)
        elif movie_schedule:
            schedule_capacity = movie_schedule.get("capacity", 21)
        
        existing_bookings = await db.bookings.count_documents({
            "booking_date": booking_data.booking_date.isoformat(),
            "time_slot": booking_data.time_slot,
            "is_cancelled": {"$ne": True},
            "status": {"$ne": "cancelled"}
        })
        
        if existing_bookings >= schedule_capacity:
            raise HTTPException(
                status_code=400,
                detail=f"Complet ! Les {schedule_capacity} places pour le créneau {booking_data.time_slot} du {booking_data.booking_date} sont toutes réservées. Essayez un autre créneau."
            )
        
        # Calculate final price based on content type and promo code
        final_price = 17.0  # Default movie price
        
        # Check if it's an event (from content_schedules)
        if content_schedule:
            # It's an event or movie from content_schedules, get the content details
            content_type = content_schedule.get("content_type", "movie")
            content_id = content_schedule.get("content_id")
            
            if content_type == "event":
                # Get event price
                event = await db.events.find_one({"id": content_id, "is_active": True})
                if event:
                    final_price = event.get("price", 17.0)
        
        # Apply promo code if provided
        promo_discount_info = None
        if booking_data.promo_code:
            promo_code = await db.promo_codes.find_one({
                "code": booking_data.promo_code.upper().strip(),
                "is_active": True
            })
            
            if promo_code:
                code = PromoCode(**parse_from_mongo(promo_code))
                
                # Check expiration and usage limits
                if not (code.expiration_date and code.expiration_date < date.today()) and \
                   not (code.usage_limit and code.current_usage >= code.usage_limit):
                    
                    # Apply promo code
                    if code.type == "reduction_percentage":
                        discount_amount = (final_price * code.value) / 100
                        final_price = max(0, final_price - discount_amount)
                        
                        # Increment usage counter
                        await db.promo_codes.update_one(
                            {"id": code.id},
                            {"$inc": {"current_usage": 1}}
                        )
                        
                        promo_discount_info = {
                            "code": code.code,
                            "type": code.type,
                            "discount_amount": discount_amount,
                            "benefit_description": None
                        }
                    elif code.type == "free_benefit":
                        # Increment usage counter
                        await db.promo_codes.update_one(
                            {"id": code.id},
                            {"$inc": {"current_usage": 1}}
                        )
                        
                        promo_discount_info = {
                            "code": code.code,
                            "type": code.type,
                            "discount_amount": 0,
                            "benefit_description": code.benefit_description
                        }
        
        # Override final_price if provided in request (client-side calculation)
        if booking_data.final_price is not None:
            final_price = booking_data.final_price
        
        # Now check the 8-hour rule, with exception for free bookings
        if final_price > 0 and hours_until_show <= 8 and hours_until_show >= 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Les réservations ferment 8h avant la séance. Cette séance commence dans {round(hours_until_show, 1)}h. Réservations fermées."
            )
        
        # For free bookings (final_price == 0), we allow booking even within 8h
        if final_price <= 0 and hours_until_show <= 8 and hours_until_show >= 0:
            logging.info(f"Exception 24h pour réservation gratuite: {booking_data.first_name} {booking_data.last_name} - Prix final: {final_price}€")
        
        # Create booking object
        # Note: movie_title n'est PAS sauvegardé dans bookings (toujours via jointures),
        # mais on stocke désormais entry_time pour refléter exactement l'heure d'entrée
        # utilisée au moment de la réservation (utile côté admin).
        booking_dict = booking_data.dict()
        booking_dict["final_price"] = final_price
        if promo_discount_info:
            booking_dict["promo_discount_info"] = promo_discount_info
        
        # S'assurer que entry_time est renseigné :
        # 1) Priorité à la valeur explicite envoyée par le frontend
        # 2) Sinon, essayer de la récupérer depuis content_schedule / movie_schedule
        # 3) Sinon, valeur par défaut basée sur time_slot via get_booking_details_from_schedules
        if not booking_dict.get("entry_time"):
            derived_entry_time = None
            try:
                # Essayer de dériver via les programmations existantes
                booking_details = await get_booking_details_from_schedules(
                    booking_data.booking_date,
                    booking_data.time_slot,
                    content_id=booking_dict.get("content_id"),
                    content_type=booking_dict.get("content_type"),
                )
                derived_entry_time = booking_details.get("entry_time")
            except Exception as e:
                logging.warning(
                    "⚠️ Impossible de dériver entry_time lors de la création de réservation: %s",
                    str(e),
                )

            if derived_entry_time:
                booking_dict["entry_time"] = derived_entry_time
        
        # Sauvegarder content_id et content_type si disponibles depuis le schedule trouvé
        if content_schedule:
            booking_dict["content_type"] = content_schedule.get("content_type", "movie")
            booking_dict["content_id"] = content_schedule.get("content_id")
        elif movie_schedule:
            # Pour les movie_schedules legacy, c'est toujours un film
            booking_dict["content_type"] = "movie"
            booking_dict["content_id"] = movie_schedule.get("movie_id")
        # Si booking_data contient déjà content_id et content_type, les garder
        elif booking_data.content_id and booking_data.content_type:
            booking_dict["content_type"] = booking_data.content_type
            booking_dict["content_id"] = booking_data.content_id
        
        booking_obj = TicketBooking(**booking_dict)
        
        # Generate QR code
        qr_code = generate_qr_code(booking_obj.dict())
        booking_obj.qr_code = qr_code
        
        # Prepare for MongoDB storage
        booking_mongo = prepare_for_mongo(booking_obj.dict())
        
        # Insert into database
        result = await db.bookings.insert_one(booking_mongo)
        
        # Send confirmation email asynchronously
        logging.info(f"📧 Tentative d'envoi d'email pour la réservation {booking_obj.id} à {booking_obj.email}")
        logging.info(f"📧 Email enabled: {email_enabled}")
        try:
            email_result = await send_confirmation_email(booking_obj, qr_code)
            if email_result:
                logging.info(f"✅ Email envoyé avec succès pour la réservation {booking_obj.id}")
            else:
                logging.warning(f"⚠️ Échec de l'envoi d'email pour la réservation {booking_obj.id} (mais réservation créée)")
        except Exception as e:
            # Don't fail the booking if email fails, just log it
            logging.error(f"❌ Exception lors de l'envoi d'email pour {booking_obj.id}: {str(e)}", exc_info=True)
        
        return booking_obj
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de la réservation: {str(e)}")

@api_router.get("/bookings", response_model=List[TicketBooking])
async def get_all_bookings():
    try:
        bookings = await db.bookings.find({"is_cancelled": {"$ne": True}}).to_list(1000)
        return [TicketBooking(**parse_from_mongo(booking)) for booking in bookings]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des réservations: {str(e)}")

@api_router.get("/bookings/{booking_id}", response_model=TicketBooking)
async def get_booking(booking_id: str):
    try:
        booking = await db.bookings.find_one({"id": booking_id, "is_cancelled": {"$ne": True}})
        if not booking:
            raise HTTPException(status_code=404, detail="Réservation non trouvée")
        return TicketBooking(**parse_from_mongo(booking))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la réservation: {str(e)}")

@api_router.put("/bookings/{booking_id}", response_model=TicketBooking)
async def update_booking(booking_id: str, update_data: TicketBookingUpdate, admin = Depends(get_admin_user)):
    try:
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
        
        update_dict['updated_at'] = datetime.now(timezone.utc)
        update_mongo = prepare_for_mongo(update_dict)
        
        result = await db.bookings.update_one(
            {"id": booking_id},
            {"$set": update_mongo}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Réservation non trouvée")
        
        updated_booking = await db.bookings.find_one({"id": booking_id})
        return TicketBooking(**parse_from_mongo(updated_booking))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str):
    try:
        result = await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"is_cancelled": True, "status": "cancelled"}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Réservation non trouvée")
        return {"message": "Réservation annulée avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'annulation: {str(e)}")

@api_router.get("/availability")
async def check_availability(booking_date: str, time_slot: TimeSlot):
    try:
        # Parse date
        check_date = datetime.fromisoformat(booking_date).date()
        
        # Get current time slot settings to determine exact show times
        time_settings = await get_time_slot_settings()
        
        # Determine the exact show start time based on time slot
        if time_slot == TimeSlot.FIRST_SHOW:  # "21h15"
            show_time_str = time_settings.first_slot_start_time
        else:  # "23h45" 
            show_time_str = time_settings.second_slot_start_time
        
        # Parse show time (format: "20h45")
        hour, minute = show_time_str.split('h')
        show_time = time(int(hour), int(minute))
        
        # Create datetime for the show
        show_datetime = datetime.combine(check_date, show_time)
        show_datetime_utc = show_datetime.replace(tzinfo=timezone.utc)
        
        # Get current time
        now_utc = datetime.now(timezone.utc)
        
        # Calculate time difference
        time_until_show = show_datetime_utc - now_utc
        hours_until_show = time_until_show.total_seconds() / 3600
        
        # Check if we're within 24 hours of the show
        is_within_24h = hours_until_show <= 24 and hours_until_show >= 0
        has_booking_window_closed = hours_until_show <= 24
        
        # Count existing bookings for that date and time
        booking_count = await db.bookings.count_documents({
            "booking_date": check_date.isoformat(),
            "time_slot": time_slot,
            "is_cancelled": {"$ne": True},
            "status": {"$ne": "cancelled"}
        })
        
        # Get capacity from schedule or default to 21
        max_capacity = 21  # Default capacity
        
        # Check both new content schedules and legacy movie schedules for custom capacity
        content_schedule = await db.content_schedules.find_one({
            "date": check_date.isoformat(),
            "time_slot": time_slot,
            "is_active": True
        })
        
        movie_schedule = await db.movie_schedules.find_one({
            "date": check_date.isoformat(),
            "time_slot": time_slot,
            "is_active": True
        })
        
        if content_schedule:
            max_capacity = content_schedule.get("capacity", 21)
        elif movie_schedule:
            max_capacity = movie_schedule.get("capacity", 21)
        
        available_spots = max_capacity - booking_count
        
        # Determine availability: must have spots AND booking window must be open
        is_spots_available = available_spots > 0
        is_booking_open = not has_booking_window_closed
        is_available = is_spots_available and is_booking_open
        
        # Determine closure reason
        closure_reason = None
        if has_booking_window_closed and hours_until_show >= 0:
            closure_reason = "booking_closed_24h"
        elif hours_until_show < 0:
            closure_reason = "show_has_passed"
        elif not is_spots_available:
            closure_reason = "sold_out"
        
        return {
            "date": booking_date,
            "time_slot": time_slot,
            "available_spots": available_spots,
            "is_available": is_available,
            "is_booking_open": is_booking_open,
            "total_capacity": max_capacity,
            "hours_until_show": round(hours_until_show, 1),
            "closure_reason": closure_reason,
            "show_datetime": show_datetime_utc.isoformat(),
            "booking_closes_at": (show_datetime_utc - timedelta(hours=24)).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la vérification de disponibilité: {str(e)}")

# Payment endpoints
@api_router.post("/payments/create-checkout")
async def create_payment_checkout(request: PaymentRequest):
    try:
        # Get booking details
        booking = await db.bookings.find_one({"id": request.booking_id})
        if not booking:
            raise HTTPException(status_code=404, detail="Réservation non trouvée")
        
        # Get the final price from booking (includes promo code discount)
        final_price = booking.get("final_price", booking.get("price", 17.0))
        
        # Handle free bookings (0€) - bypass Stripe and confirm directly
        if final_price == 0.0:
            # Mark booking as confirmed and paid
            await db.bookings.update_one(
                {"id": request.booking_id},
                {"$set": {
                    "status": "confirmed",
                    "payment_status": "completed",
                    "payment_method": "free_promo_code",
                    "payment_session_id": f"FREE_{request.booking_id}_{int(datetime.now(timezone.utc).timestamp())}"
                }}
            )
            
            # Create a free payment transaction record
            transaction = PaymentTransaction(
                booking_id=request.booking_id,
                session_id=f"FREE_{request.booking_id}",
                amount=0.0,
                currency="eur",
                status="completed",
                metadata={
                    "booking_id": request.booking_id,
                    "customer_email": booking['email'],
                    "customer_name": f"{booking['first_name']} {booking['last_name']}",
                    "promo_code": booking.get('promo_code', ''),
                    "original_price": str(booking.get('price', 17.0)),
                    "final_price": "0.0",
                    "payment_type": "free_promo_code"
                }
            )
            
            transaction_mongo = prepare_for_mongo(transaction.dict())
            await db.payment_transactions.insert_one(transaction_mongo)
            
            # Send confirmation email for free booking
            logging.info(f"📧 Tentative d'envoi d'email pour réservation gratuite {request.booking_id}")
            try:
                # Get the full booking details
                updated_booking = await db.bookings.find_one({"id": request.booking_id})
                if updated_booking:
                    booking_obj = TicketBooking(**parse_from_mongo(updated_booking))
                    # Generate QR code for the booking
                    qr_code = generate_qr_code(booking_obj.dict())
                    # Send confirmation email
                    email_result = await send_confirmation_email(booking_obj, qr_code)
                    if email_result:
                        logging.info(f"📧 Email de confirmation envoyé pour réservation gratuite: {booking_obj.email}")
                    else:
                        logging.warning(f"⚠️ Échec envoi email pour réservation gratuite: {booking_obj.email}")
                else:
                    logging.error(f"❌ Réservation {request.booking_id} non trouvée pour envoi d'email")
            except Exception as e:
                # Don't fail the booking if email fails, just log it
                logging.error(f"❌ Erreur envoi email réservation gratuite {request.booking_id}: {str(e)}", exc_info=True)
            
            # Return success URL for free booking
            return {
                "checkout_url": f"{request.origin_url}/payment-success?session_id=FREE_{request.booking_id}&free_booking=true",
                "session_id": f"FREE_{request.booking_id}",
                "is_free": True
            }
        
        # For paid bookings, proceed with Stripe
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Configuration de paiement manquante")
        
        # Create checkout session with Stripe
        success_url = f"{request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/payment-cancelled"
        
        # Get the final price from booking (includes promo code discount)
        final_price = booking.get("final_price", booking.get("price", 17.0))
        
        # Create Stripe Checkout Session
        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'eur',
                        'product_data': {
                            'name': f"Réservation Drivin And Chill - {booking.get('booking_date', 'Séance')}",
                            'description': f"Réservation pour {booking.get('first_name', '')} {booking.get('last_name', '')}"
                        },
                        'unit_amount': int(final_price * 100),  # Stripe uses cents
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "booking_id": request.booking_id,
                    "customer_email": booking['email'],
                    "customer_name": f"{booking['first_name']} {booking['last_name']}",
                    "promo_code": str(booking.get('promo_code', '')),
                    "original_price": str(booking.get('price', 17.0)),
                    "final_price": str(final_price)
                },
                customer_email=booking['email']
            )
            session_id = checkout_session.id
            session_url = checkout_session.url
        except stripe.error.StripeError as e:
            logging.error(f"Stripe error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erreur Stripe: {str(e)}")
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            booking_id=request.booking_id,
            session_id=session_id,
            amount=final_price,
            currency="eur",
            metadata={
                "booking_id": request.booking_id,
                "customer_email": booking['email'],
                "customer_name": f"{booking['first_name']} {booking['last_name']}",
                "promo_code": str(booking.get('promo_code', '')),
                "original_price": str(booking.get('price', 17.0)),
                "final_price": str(final_price)
            }
        )
        
        transaction_mongo = prepare_for_mongo(transaction.dict())
        await db.payment_transactions.insert_one(transaction_mongo)
        
        # Update booking with session ID
        await db.bookings.update_one(
            {"id": request.booking_id},
            {"$set": {"payment_session_id": session_id}}
        )
        
        return {
            "checkout_url": session_url,
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du paiement: {str(e)}")

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str):
    try:
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Configuration de paiement manquante")
        
        # Handle free bookings
        if session_id.startswith("FREE_"):
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction:
                return {
                    "session_id": session_id,
                    "status": "completed",
                    "payment_status": "paid",
                    "amount_total": 0,
                    "currency": "eur"
                }
            raise HTTPException(status_code=404, detail="Session non trouvée")
        
        # Get Stripe session status
        try:
            stripe_session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.StripeError as e:
            logging.error(f"Stripe error retrieving session: {str(e)}")
            raise HTTPException(status_code=404, detail="Session Stripe non trouvée")
        
        payment_status = "paid" if stripe_session.payment_status == "paid" else "pending"
        session_status = "completed" if stripe_session.status == "complete" else "open"
        
        # Update transaction and booking status
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction:
            # Update transaction status
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": PaymentStatus.PAID if payment_status == "paid" else PaymentStatus.PENDING,
                    "payment_status": payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update booking status if payment is successful
            if payment_status == "paid":
                await db.bookings.update_one(
                    {"id": transaction["booking_id"]},
                    {"$set": {
                        "status": BookingStatus.PAID,
                        "payment_status": PaymentStatus.PAID
                    }}
                )
        
        return {
            "session_id": session_id,
            "status": session_status,
            "payment_status": payment_status,
            "amount_total": stripe_session.amount_total / 100 if stripe_session.amount_total else 0,
            "currency": stripe_session.currency or "eur"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la vérification du paiement: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Configuration de paiement manquante")
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
        
        if not webhook_secret:
            logging.warning("STRIPE_WEBHOOK_SECRET not found - webhook signature verification disabled")
            # Without webhook secret, we can't verify the signature, but we can still process
            # This is not recommended for production
            event = None
            try:
                import json
                event = json.loads(body)
            except:
                raise HTTPException(status_code=400, detail="Invalid webhook payload")
        else:
            # Verify webhook signature
            try:
                event = stripe.Webhook.construct_event(
                    body, signature, webhook_secret
                )
            except ValueError as e:
                logging.error(f"Invalid webhook payload: {str(e)}")
                raise HTTPException(status_code=400, detail="Invalid webhook payload")
            except stripe.error.SignatureVerificationError as e:
                logging.error(f"Invalid webhook signature: {str(e)}")
                raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Handle the event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            booking_id = session.get('metadata', {}).get('booking_id')
            
            if booking_id:
                # Update booking status
                await db.bookings.update_one(
                    {"id": booking_id},
                    {"$set": {
                        "status": BookingStatus.PAID,
                        "payment_status": PaymentStatus.PAID
                    }}
                )
                
                # Update transaction status
                await db.payment_transactions.update_one(
                    {"session_id": session['id']},
                    {"$set": {
                        "status": PaymentStatus.PAID,
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Send confirmation email
                logging.info(f"📧 Tentative d'envoi d'email via webhook pour réservation {booking_id}")
                try:
                    booking = await db.bookings.find_one({"id": booking_id})
                    if booking:
                        booking_obj = TicketBooking(**parse_from_mongo(booking))
                        qr_code = generate_qr_code(booking_obj.dict())
                        email_result = await send_confirmation_email(booking_obj, qr_code)
                        if email_result:
                            logging.info(f"📧 Email de confirmation envoyé via webhook: {booking_obj.email}")
                        else:
                            logging.warning(f"⚠️ Échec envoi email via webhook: {booking_obj.email}")
                    else:
                        logging.error(f"❌ Réservation {booking_id} non trouvée pour envoi d'email via webhook")
                except Exception as e:
                    logging.error(f"❌ Erreur envoi email via webhook {booking_id}: {str(e)}", exc_info=True)
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

# Event management endpoints
@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, admin = Depends(get_admin_user)):
    try:
        event_obj = Event(**event_data.dict())
        event_mongo = prepare_for_mongo(event_obj.dict())
        
        await db.events.insert_one(event_mongo)
        return event_obj
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de l'événement: {str(e)}")

@api_router.get("/events", response_model=List[Event])
async def get_events(active_only: bool = True):
    try:
        filter_query = {"is_active": True} if active_only else {}
        events = await db.events.find(filter_query).to_list(1000)
        return [Event(**parse_from_mongo(event)) for event in events]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des événements: {str(e)}")

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    try:
        event = await db.events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Événement non trouvé")
        return Event(**parse_from_mongo(event))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de l'événement: {str(e)}")

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, update_data: EventUpdate, admin = Depends(get_admin_user)):
    try:
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
        
        update_dict['updated_at'] = datetime.now(timezone.utc)
        update_mongo = prepare_for_mongo(update_dict)
        
        result = await db.events.update_one(
            {"id": event_id},
            {"$set": update_mongo}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Événement non trouvé")
        
        updated_event = await db.events.find_one({"id": event_id})
        return Event(**parse_from_mongo(updated_event))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, admin = Depends(get_admin_user)):
    try:
        # Soft delete - just mark as inactive
        result = await db.events.update_one(
            {"id": event_id},
            {"$set": {"is_active": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Événement non trouvé")
        
        return {"message": "Événement supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# Promo code management endpoints
@api_router.get("/admin/promo-codes", response_model=List[PromoCode])
async def get_promo_codes(admin = Depends(get_admin_user)):
    try:
        codes = await db.promo_codes.find({"is_active": True}).to_list(1000)
        return [PromoCode(**parse_from_mongo(code)) for code in codes]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des codes promo: {str(e)}")

@api_router.post("/admin/promo-codes", response_model=PromoCode)
async def create_promo_code(promo_data: PromoCodeCreate, admin = Depends(get_admin_user)):
    try:
        # Check if code already exists
        existing_code = await db.promo_codes.find_one({"code": promo_data.code, "is_active": True})
        if existing_code:
            raise HTTPException(status_code=400, detail="Ce code promo existe déjà")
        
        # Validate promo code data
        if promo_data.type == "reduction_percentage":
            if not promo_data.value or promo_data.value <= 0 or promo_data.value > 100:
                raise HTTPException(status_code=400, detail="La réduction doit être entre 1% et 100%")
        elif promo_data.type == "free_benefit":
            if not promo_data.benefit_description:
                raise HTTPException(status_code=400, detail="La description de l'avantage est requise")
        else:
            raise HTTPException(status_code=400, detail="Type de code promo invalide")
        
        # Create new promo code
        promo_dict = promo_data.dict()
        promo_dict.update({
            "id": str(uuid.uuid4()),
            "is_active": True,
            "current_usage": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        new_code = PromoCode(**promo_dict)
        await db.promo_codes.insert_one(prepare_for_mongo(new_code.dict()))
        return new_code
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")

@api_router.put("/admin/promo-codes/{code_id}", response_model=PromoCode)
async def update_promo_code(code_id: str, promo_data: PromoCodeUpdate, admin = Depends(get_admin_user)):
    try:
        # Check if promo code exists
        existing_code = await db.promo_codes.find_one({"id": code_id, "is_active": True})
        if not existing_code:
            raise HTTPException(status_code=404, detail="Code promo non trouvé")
        
        # Prepare update data
        update_data = {k: v for k, v in promo_data.dict(exclude_unset=True).items() if v is not None}
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            result = await db.promo_codes.update_one(
                {"id": code_id},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Code promo non trouvé")
        
        # Return updated promo code
        updated_code = await db.promo_codes.find_one({"id": code_id})
        return PromoCode(**parse_from_mongo(updated_code))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@api_router.delete("/admin/promo-codes/{code_id}")
async def delete_promo_code(code_id: str, admin = Depends(get_admin_user)):
    try:
        # Soft delete - just mark as inactive
        result = await db.promo_codes.update_one(
            {"id": code_id},
            {"$set": {"is_active": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Code promo non trouvé")
        
        return {"message": "Code promo supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

@api_router.post("/validate-promo-code", response_model=PromoCodeResponse)
async def validate_promo_code(validation_data: PromoCodeValidation):
    try:
        # Find the promo code
        promo_code = await db.promo_codes.find_one({
            "code": validation_data.code.upper().strip(),
            "is_active": True
        })
        
        if not promo_code:
            return PromoCodeResponse(
                valid=False,
                message="Code promo invalide"
            )
        
        code = PromoCode(**parse_from_mongo(promo_code))
        
        # Check expiration
        if code.expiration_date and code.expiration_date < date.today():
            return PromoCodeResponse(
                valid=False,
                message="Code promo expiré"
            )
        
        # Check usage limit
        if code.usage_limit and code.current_usage >= code.usage_limit:
            return PromoCodeResponse(
                valid=False,
                message="Code promo épuisé"
            )
        
        # Apply promo code
        if code.type == "reduction_percentage":
            discount_amount = (validation_data.booking_price * code.value) / 100
            final_price = max(0, validation_data.booking_price - discount_amount)
            
            return PromoCodeResponse(
                valid=True,
                message=f"Réduction de {code.value}% appliquée",
                discount_amount=discount_amount,
                final_price=final_price
            )
        
        elif code.type == "free_benefit":
            return PromoCodeResponse(
                valid=True,
                message="Avantages gratuits inclus",
                final_price=validation_data.booking_price,
                benefit_description=code.benefit_description
            )
        
        else:
            return PromoCodeResponse(
                valid=False,
                message="Type de code promo invalide"
            )
            
    except Exception as e:
        return PromoCodeResponse(
            valid=False,
            message="Erreur lors de la validation du code promo"
        )

# Movie management endpoints
@api_router.post("/movies", response_model=Movie)
async def create_movie(movie_data: MovieCreate, admin = Depends(get_admin_user)):
    # Vérifier la connexion MongoDB
    if not await check_mongodb_connection():
        raise HTTPException(
            status_code=503,
            detail="Base de données MongoDB non disponible. Vérifiez votre connexion et votre fichier .env"
        )
    
    try:
        movie_obj = Movie(**movie_data.dict())
        movie_mongo = prepare_for_mongo(movie_obj.dict())
        
        await db.movies.insert_one(movie_mongo)
        logging.info(f"✅ Film créé : {movie_obj.title} (ID: {movie_obj.id})")
        return movie_obj
        
    except Exception as e:
        logging.error(f"❌ Erreur lors de la création du film: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du film: {str(e)}")

@api_router.get("/movies", response_model=List[Movie])
async def get_movies(active_only: bool = True):
    # Vérifier la connexion MongoDB
    if not await check_mongodb_connection():
        logging.warning("⚠️  MongoDB non disponible - retour d'une liste vide pour les films")
        return []
    
    try:
        filter_query = {"is_active": True} if active_only else {}
        movies = await db.movies.find(filter_query).to_list(1000)
        return [Movie(**parse_from_mongo(movie)) for movie in movies]
    except Exception as e:
        logging.error(f"❌ Erreur lors de la récupération des films: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des films: {str(e)}")

@api_router.get("/movies/{movie_id}", response_model=Movie)
async def get_movie(movie_id: str):
    try:
        movie = await db.movies.find_one({"id": movie_id})
        if not movie:
            raise HTTPException(status_code=404, detail="Film non trouvé")
        return Movie(**parse_from_mongo(movie))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du film: {str(e)}")

@api_router.put("/movies/{movie_id}", response_model=Movie)
async def update_movie(movie_id: str, update_data: MovieUpdate, admin = Depends(get_admin_user)):
    try:
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
        
        update_dict['updated_at'] = datetime.now(timezone.utc)
        update_mongo = prepare_for_mongo(update_dict)
        
        result = await db.movies.update_one(
            {"id": movie_id},
            {"$set": update_mongo}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Film non trouvé")
        
        updated_movie = await db.movies.find_one({"id": movie_id})
        return Movie(**parse_from_mongo(updated_movie))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@api_router.delete("/movies/{movie_id}")
async def delete_movie(movie_id: str, admin = Depends(get_admin_user)):
    try:
        # Soft delete - just mark as inactive
        result = await db.movies.update_one(
            {"id": movie_id},
            {"$set": {"is_active": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Film non trouvé")
        
        return {"message": "Film supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# Content schedule endpoints (movies and events)
@api_router.post("/content-schedules", response_model=ContentSchedule)
async def create_content_schedule(schedule_data: ContentScheduleCreate, admin = Depends(get_admin_user)):
    # Vérifier la connexion MongoDB
    if not await check_mongodb_connection():
        raise HTTPException(
            status_code=503,
            detail="Base de données MongoDB non disponible. Vérifiez votre connexion et votre fichier .env"
        )
    
    try:
        # Check if content exists (movie or event)
        if schedule_data.content_type == "movie":
            content = await db.movies.find_one({"id": schedule_data.content_id, "is_active": True})
            if not content:
                raise HTTPException(status_code=404, detail="Film non trouvé")
        elif schedule_data.content_type == "event":
            content = await db.events.find_one({"id": schedule_data.content_id, "is_active": True})
            if not content:
                raise HTTPException(status_code=404, detail="Événement non trouvé")
        else:
            raise HTTPException(status_code=400, detail="Type de contenu invalide (doit être 'movie' ou 'event')")
        
        # For events with custom time, we need different conflict checking logic
        if schedule_data.content_type == "event" and schedule_data.custom_time:
            # For events with custom time, only check against other events on the same date/time
            existing_event = await db.content_schedules.find_one({
                "date": schedule_data.date.isoformat(),
                "content_type": "event",
                "custom_time": schedule_data.custom_time,
                "is_active": True
            })
            
            if existing_event:
                raise HTTPException(status_code=400, detail=f"Un événement est déjà programmé le {schedule_data.date.isoformat()} à {schedule_data.custom_time}")
        else:
            # For movies or events using standard time slots, check traditional conflicts
            existing_movie = await db.movie_schedules.find_one({
                "date": schedule_data.date.isoformat(),
                "time_slot": schedule_data.time_slot,
                "is_active": True
            })
            
            existing_content = await db.content_schedules.find_one({
                "date": schedule_data.date.isoformat(),
                "time_slot": schedule_data.time_slot,
                "is_active": True
            })
            
            if existing_movie or existing_content:
                raise HTTPException(status_code=400, detail="Un contenu est déjà programmé à ce créneau")
        
        schedule_obj = ContentSchedule(**schedule_data.dict())
        schedule_mongo = prepare_for_mongo(schedule_obj.dict())
        
        await db.content_schedules.insert_one(schedule_mongo)
        logging.info(f"✅ Programmation créée : {schedule_data.content_type} {schedule_data.content_id} le {schedule_data.date.isoformat()}")
        return schedule_obj
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Erreur lors de la programmation: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la programmation: {str(e)}")

@api_router.get("/content-schedules", response_model=List[ContentScheduleWithDetails])
async def get_content_schedules(date_from: Optional[str] = None, date_to: Optional[str] = None):
    try:
        # Build filter query
        filter_query = {"is_active": True}
        
        if date_from:
            if "date" not in filter_query:
                filter_query["date"] = {}
            filter_query["date"]["$gte"] = date_from
        
        if date_to:
            if "date" not in filter_query:
                filter_query["date"] = {}
            filter_query["date"]["$lte"] = date_to
        
        schedules = await db.content_schedules.find(filter_query).to_list(1000)
        
        # Get content details for each schedule
        result = []
        for schedule in schedules:
            parsed_schedule = parse_from_mongo(schedule)
            
            # Enrichir avec les horaires depuis movie_schedules si disponibles
            schedule_date_str = parsed_schedule["date"].isoformat() if isinstance(parsed_schedule["date"], date) else str(parsed_schedule["date"])
            time_slot_str = parsed_schedule["time_slot"].value if isinstance(parsed_schedule["time_slot"], TimeSlot) else str(parsed_schedule["time_slot"])
            
            # Chercher les horaires dans movie_schedules correspondants
            movie_schedule = await db.movie_schedules.find_one({
                "date": schedule_date_str,
                "time_slot": time_slot_str,
                "is_active": True
            })
            
            if movie_schedule:
                parsed_movie_schedule = parse_from_mongo(movie_schedule)
                # Ajouter les horaires au schedule
                if parsed_movie_schedule.get("entry_time"):
                    parsed_schedule["entry_time"] = parsed_movie_schedule["entry_time"]
                if parsed_movie_schedule.get("start_time"):
                    parsed_schedule["start_time"] = parsed_movie_schedule["start_time"]
                if parsed_movie_schedule.get("end_time"):
                    parsed_schedule["end_time"] = parsed_movie_schedule["end_time"]
            
            if parsed_schedule["content_type"] == "movie":
                content = await db.movies.find_one({"id": parsed_schedule["content_id"]})
                if content:
                    result.append(ContentScheduleWithDetails(
                        schedule=ContentSchedule(**parsed_schedule),
                        content=Movie(**parse_from_mongo(content))
                    ))
            elif parsed_schedule["content_type"] == "event":
                content = await db.events.find_one({"id": parsed_schedule["content_id"]})
                if content:
                    result.append(ContentScheduleWithDetails(
                        schedule=ContentSchedule(**parsed_schedule),
                        content=Event(**parse_from_mongo(content))
                    ))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la programmation: {str(e)}")

@api_router.delete("/content-schedules/{schedule_id}")
async def delete_content_schedule(schedule_id: str, admin = Depends(get_admin_user)):
    try:
        result = await db.content_schedules.update_one(
            {"id": schedule_id},
            {"$set": {"is_active": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Programmation non trouvée")
        
        return {"message": "Programmation supprimée avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

@api_router.get("/weekly-schedule", response_model=List[ContentScheduleWithDetails])
async def get_weekly_schedule():
    """Get all content scheduled for the current week, ordered by date and time.
    If no content is found for current week, expand to next weeks."""
    if not await check_mongodb_connection():
        logging.warning("MongoDB non disponible - retour d'une liste vide")
        return []
    try:
        # Get current date and calculate week boundaries
        now = datetime.now(timezone.utc)
        today = now.date()
        
        result = []
        
        # Get content for the next 4 weeks (current week + 3 next weeks)
        for week_offset in range(4):  # Check current week + 3 next weeks
            # Calculate start of week (Monday) and end of week (Sunday)
            days_since_monday = today.weekday()
            week_start = today - timedelta(days=days_since_monday) + timedelta(weeks=week_offset)
            week_end = week_start + timedelta(days=6)
            
            # Get all schedules for this week, including both content_schedules and movie_schedules
            try:
                content_schedules = await db.content_schedules.find({
                    "is_active": True,
                    "date": {
                        "$gte": week_start.isoformat(),
                        "$lte": week_end.isoformat()
                    }
                }).to_list(1000)
            except Exception:
                content_schedules = []
            
            try:
                movie_schedules = await db.movie_schedules.find({
                    "is_active": True,
                    "date": {
                        "$gte": week_start.isoformat(),
                        "$lte": week_end.isoformat()
                    }
                }).to_list(1000)
            except Exception:
                movie_schedules = []
            
            # Process content schedules for this week
            for schedule in content_schedules:
                parsed_schedule = parse_from_mongo(schedule)
                
                # Enrichir avec les horaires depuis movie_schedules si disponibles
                schedule_date_str = parsed_schedule["date"].isoformat() if isinstance(parsed_schedule["date"], date) else str(parsed_schedule["date"])
                time_slot_str = parsed_schedule["time_slot"].value if isinstance(parsed_schedule["time_slot"], TimeSlot) else str(parsed_schedule["time_slot"])
                
                # Chercher les horaires dans movie_schedules correspondants
                movie_schedule = await db.movie_schedules.find_one({
                    "date": schedule_date_str,
                    "time_slot": time_slot_str,
                    "is_active": True
                })
                
                if movie_schedule:
                    parsed_movie_schedule = parse_from_mongo(movie_schedule)
                    # Ajouter les horaires au schedule
                    if parsed_movie_schedule.get("entry_time"):
                        parsed_schedule["entry_time"] = parsed_movie_schedule["entry_time"]
                    if parsed_movie_schedule.get("start_time"):
                        parsed_schedule["start_time"] = parsed_movie_schedule["start_time"]
                    if parsed_movie_schedule.get("end_time"):
                        parsed_schedule["end_time"] = parsed_movie_schedule["end_time"]
                
                if parsed_schedule["content_type"] == "movie":
                    content = await db.movies.find_one({"id": parsed_schedule["content_id"], "is_active": True})
                    if content:
                        result.append(ContentScheduleWithDetails(
                            schedule=ContentSchedule(**parsed_schedule),
                            content=Movie(**parse_from_mongo(content))
                        ))
                elif parsed_schedule["content_type"] == "event":
                    content = await db.events.find_one({"id": parsed_schedule["content_id"], "is_active": True})
                    if content:
                        result.append(ContentScheduleWithDetails(
                            schedule=ContentSchedule(**parsed_schedule),
                            content=Event(**parse_from_mongo(content))
                        ))
            
            # Process movie schedules (legacy) for this week
            for schedule in movie_schedules:
                try:
                    parsed_schedule = parse_from_mongo(schedule)
                    movie = await db.movies.find_one({"id": parsed_schedule["movie_id"], "is_active": True})
                    if movie:
                        # Convert legacy movie schedule to content schedule format
                        # Inclure les horaires entry_time, start_time, end_time
                        content_schedule = ContentSchedule(
                            id=parsed_schedule["id"],
                            content_id=parsed_schedule["movie_id"],
                            content_type="movie",
                            date=parsed_schedule["date"],
                            time_slot=parsed_schedule["time_slot"],
                            capacity=parsed_schedule.get("capacity", 21),
                            entry_time=parsed_schedule.get("entry_time"),
                            start_time=parsed_schedule.get("start_time"),
                            end_time=parsed_schedule.get("end_time"),
                            is_active=parsed_schedule["is_active"],
                            created_at=parsed_schedule["created_at"]
                        )
                        result.append(ContentScheduleWithDetails(
                            schedule=content_schedule,
                            content=Movie(**parse_from_mongo(movie))
                        ))
                except Exception as e:
                    logging.warning(f"Erreur lors du traitement du movie schedule {schedule.get('id')}: {e}")
                    continue
        
        # Sort by date and time slot order (21h15 -> 23h45 -> 01h30)
        slot_order = {
            TimeSlot.FIRST_SHOW.value: 0,
            TimeSlot.SECOND_SHOW.value: 1,
            TimeSlot.THIRD_SHOW.value: 2,
        }

        result.sort(key=lambda x: (
            x.schedule.date,
            slot_order.get(
                x.schedule.time_slot.value if isinstance(x.schedule.time_slot, TimeSlot)
                else x.schedule.time_slot,
                99,
            )
        ))

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la programmation hebdomadaire: {str(e)}")

# Time slot settings management endpoints
@api_router.get("/admin/time-slots", response_model=TimeSlotSettings)
async def get_time_slots(admin = Depends(get_admin_user)):
    """Get current time slot settings"""
    try:
        return await get_time_slot_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des horaires: {str(e)}")

@api_router.put("/admin/time-slots", response_model=TimeSlotSettings)
async def update_time_slots(update_data: TimeSlotSettingsUpdate, admin = Depends(get_admin_user)):
    """Update time slot settings"""
    try:
        # Get current settings
        current_settings = await get_time_slot_settings()
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
        
        update_dict['updated_at'] = datetime.now(timezone.utc)
        
        # First deactivate any existing settings
        await db.time_slot_settings.update_many(
            {"is_active": True},
            {"$set": {"is_active": False}}
        )
        
        # Create new settings with updated values
        new_settings_dict = current_settings.dict()
        new_settings_dict.update(update_dict)
        new_settings_dict['id'] = str(uuid.uuid4())  # New ID for new settings
        
        new_settings = TimeSlotSettings(**new_settings_dict)
        settings_mongo = prepare_for_mongo(new_settings.dict())
        
        await db.time_slot_settings.insert_one(settings_mongo)
        
        return new_settings
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour des horaires: {str(e)}")

@api_router.get("/time-slots", response_model=TimeSlotSettings)
async def get_public_time_slots():
    """Get current time slot settings for public use"""
    try:
        settings = await get_time_slot_settings()
        if settings is None:
            # Return default settings if MongoDB is not available
            return TimeSlotSettings(
                first_slot_value="21h15",
                second_slot_value="23h45",
                third_slot_value="01h30",
                first_slot_entry_time="18h45",
                first_slot_start_time="19h00",
                first_slot_end_time="21h00",
                second_slot_entry_time="21h00",
                second_slot_start_time="21h15",
                second_slot_end_time="23h15",
                third_slot_entry_time="23h15",
                third_slot_start_time="23h30",
                third_slot_end_time="01h30"
            )
        return settings
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des horaires: {e}")
        # Return default settings on error
        return TimeSlotSettings(
            first_slot_value="21h15",
            second_slot_value="23h45",
            third_slot_value="01h30",
            first_slot_entry_time="18h45",
            first_slot_start_time="19h00",
            first_slot_end_time="21h00",
            second_slot_entry_time="21h00",
            second_slot_start_time="21h15",
            second_slot_end_time="23h15",
            third_slot_entry_time="23h15",
            third_slot_start_time="23h30",
            third_slot_end_time="01h30"
        )

# Address settings management endpoints
@api_router.get("/admin/address", response_model=AddressSettings)
async def get_address(admin = Depends(get_admin_user)):
    """Get current address settings"""
    try:
        return await get_address_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de l'adresse: {str(e)}")

@api_router.put("/admin/address", response_model=AddressSettings)
async def update_address(update_data: AddressSettingsUpdate, admin = Depends(get_admin_user)):
    """Update address settings"""
    try:
        logging.info(f"📝 Mise à jour de l'adresse - Données reçues: {update_data.dict()}")
        
        # Get current settings
        current_settings = await get_address_settings()
        logging.info(f"📋 Paramètres actuels: {current_settings.dict()}")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
        
        update_dict['updated_at'] = datetime.now(timezone.utc)
        
        # First deactivate any existing settings
        deactivate_result = await db.address_settings.update_many(
            {"is_active": True},
            {"$set": {"is_active": False}}
        )
        logging.info(f"🔄 Paramètres désactivés: {deactivate_result.modified_count}")
        
        # Create new settings with updated values
        new_settings_dict = current_settings.dict()
        new_settings_dict.update(update_dict)
        new_settings_dict['id'] = str(uuid.uuid4())  # New ID for new settings
        new_settings_dict['is_active'] = True
        
        logging.info(f"💾 Nouveaux paramètres à sauvegarder: {new_settings_dict}")
        
        new_settings = AddressSettings(**new_settings_dict)
        settings_mongo = prepare_for_mongo(new_settings.dict())
        
        insert_result = await db.address_settings.insert_one(settings_mongo)
        logging.info(f"✅ Adresse sauvegardée avec l'ID: {insert_result.inserted_id}")
        
        return new_settings
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Erreur lors de la mise à jour de l'adresse: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour de l'adresse: {str(e)}")

@api_router.get("/address", response_model=AddressSettings)
async def get_public_address():
    """Get current address settings for public use"""
    try:
        settings = await get_address_settings()
        if settings is None:
            # Return default settings if MongoDB is not available
            return AddressSettings(
                address_text="Le petit juillac 87100 Limoges",
                full_address="10 rue de dion bouton, 87280 Limoges, France",
                latitude=45.8336,
                longitude=1.2611
            )
        return settings
    except Exception as e:
        logging.error(f"Erreur lors de la récupération de l'adresse: {e}")
        # Return default settings on error
        return AddressSettings(
            address_text="Le petit juillac 87100 Limoges",
            full_address="10 rue de dion bouton, 87280 Limoges, France",
            latitude=45.8336,
            longitude=1.2611
        )

@api_router.get("/admin/geocode")
async def geocode_address(address: str = Query(..., description="Adresse à géocoder"), admin = Depends(get_admin_user)):
    """Géocode une adresse en utilisant l'API Nominatim d'OpenStreetMap"""
    try:
        if not address or address.strip() == "":
            raise HTTPException(status_code=400, detail="L'adresse ne peut pas être vide")
        
        # Préparer l'adresse pour le géocodage (ajouter "France" si pas présent)
        search_address = address.strip()
        if "france" not in search_address.lower() and "fr" not in search_address.lower():
            search_address = f"{search_address}, France"
        
        # Utiliser httpx pour faire la requête (peut définir User-Agent)
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Ajouter un petit délai pour respecter les limites de l'API (1 requête/seconde)
            await asyncio.sleep(1)
            
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": search_address,
                    "format": "json",
                    "limit": 5,
                    "addressdetails": 1,
                    "countrycodes": "fr",
                },
                headers={
                    "User-Agent": "DrivinAndChill/1.0 (Contact: admin@drivinnchill.com)",
                    "Accept-Language": "fr-FR,fr;q=0.9",
                },
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Erreur lors de l'appel à l'API de géocodage: {response.status_code}"
                )
            
            data = response.json()
            
            if not data or len(data) == 0:
                return {
                    "success": False,
                    "message": "Aucun résultat trouvé pour cette adresse",
                    "latitude": None,
                    "longitude": None,
                }
            
            # Prendre le premier résultat (le plus pertinent)
            result = data[0]
            lat = float(result.get("lat", 0))
            lon = float(result.get("lon", 0))
            
            # Vérifier que les coordonnées sont valides
            if lat == 0 or lon == 0 or (lat < 41 or lat > 51 or lon < -5 or lon > 10):
                logging.warning(f"Coordonnées suspectes reçues: {lat}, {lon} pour l'adresse: {search_address}")
            
            return {
                "success": True,
                "latitude": lat,
                "longitude": lon,
                "display_name": result.get("display_name", ""),
                "address": search_address,
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout lors de la requête de géocodage")
    except httpx.RequestError as e:
        logging.error(f"Erreur de requête lors du géocodage: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la requête de géocodage: {str(e)}")
    except Exception as e:
        logging.error(f"Erreur lors du géocodage: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur lors du géocodage: {str(e)}")

@api_router.get("/admin/email-status")
async def get_email_status(admin = Depends(get_admin_user)):
    """Get email configuration status"""
    return {
        "email_enabled": email_enabled,
        "email_configured": email_username is not None and email_password is not None,
        "email_host": email_host,
        "email_port": email_port,
        "email_from": email_username if email_enabled else None,
        "message": "Email activé" if email_enabled else "Email en mode simulation - configurez EMAIL_USERNAME et EMAIL_PASSWORD"
    }

@api_router.post("/admin/test-email")
async def test_email_sending(
    recipient: Optional[str] = Query(None, description="Adresse email de test (optionnel)"),
    admin = Depends(get_admin_user)
):
    """Test email sending functionality"""
    try:
        # Use provided recipient or default test email
        test_email = recipient or "adamsdexter3@gmail.com"
        
        # Create a test booking
        test_booking = TicketBooking(
            first_name="Test",
            last_name="User",
            email=test_email,
            booking_date=datetime.now(timezone.utc).date(),
            day_of_week=DayOfWeek.FRIDAY,
            time_slot=TimeSlot.FIRST_SHOW,
            payment_method=PaymentMethod.CARD
        )
        
        # Generate test QR code
        test_qr = generate_qr_code(test_booking.dict())
        
        # Try sending email
        result = await send_confirmation_email(test_booking, test_qr)
        
        if result:
            return {
                "status": "success",
                "message": "Email de test envoyé avec succès",
                "email_enabled": email_enabled,
                "recipient": test_booking.email,
                "config_status": "configured" if email_enabled else "simulated"
            }
        else:
            return {
                "status": "error",
                "message": "Échec de l'envoi de l'email de test",
                "email_enabled": email_enabled,
                "recipient": test_booking.email,
                "details": "Vérifiez la configuration SMTP et les logs du serveur"
            }
            
    except Exception as e:
        logging.error(f"Erreur lors du test d'email: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur lors du test d'email: {str(e)}")

# Movie suggestions endpoints
@api_router.post("/movie-suggestions", response_model=MovieSuggestion)
async def create_movie_suggestion(suggestion_data: MovieSuggestionCreate):
    """Create a new movie suggestion from a spectator"""
    try:
        suggestion = MovieSuggestion(**suggestion_data.dict())
        suggestion_mongo = prepare_for_mongo(suggestion.dict())
        
        result = await db.movie_suggestions.insert_one(suggestion_mongo)
        
        logging.info(f"📽️ Nouvelle suggestion de film: '{suggestion.movie_title}' par {suggestion.suggested_by}")
        
        return suggestion
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de la suggestion: {str(e)}")

@api_router.get("/admin/movie-suggestions", response_model=List[MovieSuggestion])
async def get_movie_suggestions(admin = Depends(get_admin_user), status: Optional[str] = None):
    """Get all movie suggestions (admin only)"""
    try:
        filter_query = {}
        if status:
            filter_query["status"] = status
            
        suggestions = await db.movie_suggestions.find(filter_query).sort("created_at", -1).to_list(100)
        
        return [MovieSuggestion(**parse_from_mongo(suggestion)) for suggestion in suggestions]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des suggestions: {str(e)}")

@api_router.put("/admin/movie-suggestions/{suggestion_id}", response_model=MovieSuggestion)
async def update_movie_suggestion(suggestion_id: str, update_data: MovieSuggestionUpdate, admin = Depends(get_admin_user)):
    """Update a movie suggestion status or add admin notes"""
    try:
        # Build update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
            
        update_dict['updated_at'] = datetime.now(timezone.utc)
        
        result = await db.movie_suggestions.update_one(
            {"id": suggestion_id},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Suggestion non trouvée")
            
        # Get updated suggestion
        updated_suggestion = await db.movie_suggestions.find_one({"id": suggestion_id})
        
        return MovieSuggestion(**parse_from_mongo(updated_suggestion))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@api_router.delete("/admin/movie-suggestions/{suggestion_id}")
async def delete_movie_suggestion(suggestion_id: str, admin = Depends(get_admin_user)):
    """Delete a movie suggestion"""
    try:
        result = await db.movie_suggestions.delete_one({"id": suggestion_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Suggestion non trouvée")
            
        return {"message": "Suggestion supprimée avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# Movie schedule endpoints (legacy - for backwards compatibility)
def parse_time_to_minutes(time_str: str) -> Optional[int]:
    """Convertit une heure au format '20h45' ou '20:45' en minutes depuis minuit"""
    if not time_str:
        return None
    # Normaliser le format (remplacer 'h' par ':' si nécessaire)
    normalized = time_str.replace('h', ':')
    try:
        parts = normalized.split(':')
        if len(parts) == 2:
            hours = int(parts[0])
            minutes = int(parts[1])
            return hours * 60 + minutes
    except (ValueError, IndexError):
        pass
    return None

def times_overlap(start1: Optional[int], end1: Optional[int], start2: Optional[int], end2: Optional[int]) -> bool:
    """Vérifie si deux plages horaires se chevauchent"""
    if not all([start1, end1, start2, end2]):
        return False
    # Gérer le passage à minuit (si end < start, cela signifie que ça passe minuit)
    if end1 < start1:
        end1 += 24 * 60
    if end2 < start2:
        end2 += 24 * 60
    # Vérifier le chevauchement
    return not (end1 <= start2 or end2 <= start1)

@api_router.post("/movie-schedules", response_model=MovieSchedule)
async def create_movie_schedule(schedule_data: MovieScheduleCreate, admin = Depends(get_admin_user)):
    try:
        # Check if movie exists
        movie = await db.movies.find_one({"id": schedule_data.movie_id, "is_active": True})
        if not movie:
            raise HTTPException(status_code=404, detail="Film non trouvé")
        
        # Si des horaires personnalisés sont fournis, vérifier les chevauchements d'horaires
        if schedule_data.start_time and schedule_data.end_time:
            # Récupérer tous les films programmés le même jour
            existing_schedules = await db.movie_schedules.find({
                "date": schedule_data.date.isoformat(),
                "is_active": True
            }).to_list(100)
            
            existing_content_schedules = await db.content_schedules.find({
                "date": schedule_data.date.isoformat(),
                "is_active": True
            }).to_list(100)
            
            # Convertir les horaires de la nouvelle programmation en minutes
            new_start_minutes = parse_time_to_minutes(schedule_data.start_time)
            new_end_minutes = parse_time_to_minutes(schedule_data.end_time)
            
            if new_start_minutes is None or new_end_minutes is None:
                raise HTTPException(status_code=400, detail="Format d'heure invalide")
            
            # Vérifier les chevauchements avec les films existants
            for existing in existing_schedules:
                existing_start = existing.get("start_time")
                existing_end = existing.get("end_time")
                
                if existing_start and existing_end:
                    existing_start_minutes = parse_time_to_minutes(existing_start)
                    existing_end_minutes = parse_time_to_minutes(existing_end)
                    
                    if existing_start_minutes is not None and existing_end_minutes is not None:
                        if times_overlap(new_start_minutes, new_end_minutes, existing_start_minutes, existing_end_minutes):
                            raise HTTPException(
                                status_code=400, 
                                detail=f"Un film est déjà programmé à cette heure (chevauchement avec {existing_start} - {existing_end})"
                            )
            
            # Vérifier aussi avec les content_schedules qui utilisent le même time_slot
            # (on les bloque car ils n'ont généralement pas d'horaires personnalisés)
            for existing_content in existing_content_schedules:
                if existing_content.get("time_slot") == schedule_data.time_slot:
                    raise HTTPException(
                        status_code=400,
                        detail="Un contenu est déjà programmé à ce créneau horaire"
                    )
        else:
            # Si pas d'horaires personnalisés, vérifier comme avant (même time_slot = conflit)
            existing = await db.movie_schedules.find_one({
                "date": schedule_data.date.isoformat(),
                "time_slot": schedule_data.time_slot,
                "is_active": True
            })
            
            existing_content = await db.content_schedules.find_one({
                "date": schedule_data.date.isoformat(),
                "time_slot": schedule_data.time_slot,
                "is_active": True
            })
            
            if existing or existing_content:
                raise HTTPException(status_code=400, detail="Un contenu est déjà programmé à ce créneau")
        
        schedule_obj = MovieSchedule(**schedule_data.dict())
        schedule_mongo = prepare_for_mongo(schedule_obj.dict())
        
        await db.movie_schedules.insert_one(schedule_mongo)
        return schedule_obj
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la programmation: {str(e)}")

@api_router.get("/movie-schedules", response_model=List[MovieScheduleWithMovie])
async def get_movie_schedules(date_from: Optional[str] = None, date_to: Optional[str] = None):
    try:
        # Build filter query
        filter_query = {"is_active": True}
        
        if date_from:
            if "date" not in filter_query:
                filter_query["date"] = {}
            filter_query["date"]["$gte"] = date_from
        
        if date_to:
            if "date" not in filter_query:
                filter_query["date"] = {}
            filter_query["date"]["$lte"] = date_to
        
        schedules = await db.movie_schedules.find(filter_query).to_list(1000)
        
        # Get movies for each schedule
        result = []
        for schedule in schedules:
            parsed_schedule = parse_from_mongo(schedule)
            movie = await db.movies.find_one({"id": parsed_schedule["movie_id"]})
            if movie:
                result.append(MovieScheduleWithMovie(
                    schedule=MovieSchedule(**parsed_schedule),
                    movie=Movie(**parse_from_mongo(movie))
                ))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la programmation: {str(e)}")

@api_router.get("/movie-schedules/by-date/{schedule_date}")
async def get_schedules_by_date(schedule_date: str):
    try:
        schedules = await db.movie_schedules.find({
            "date": schedule_date,
            "is_active": True
        }).to_list(10)
        
        result = []
        for schedule in schedules:
            parsed_schedule = parse_from_mongo(schedule)
            movie = await db.movies.find_one({"id": parsed_schedule["movie_id"]})
            if movie:
                result.append({
                    "schedule": MovieSchedule(**parsed_schedule),
                    "movie": Movie(**parse_from_mongo(movie))
                })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")

@api_router.put("/movie-schedules/{schedule_id}", response_model=MovieSchedule)
async def update_movie_schedule(schedule_id: str, update_data: MovieScheduleUpdate, admin = Depends(get_admin_user)):
    try:
        # Vérifier que la programmation existe
        existing_schedule = await db.movie_schedules.find_one({"id": schedule_id, "is_active": True})
        if not existing_schedule:
            raise HTTPException(status_code=404, detail="Programmation non trouvée")
        
        # Vérifier si le film existe (si movie_id est modifié)
        if update_data.movie_id:
            movie = await db.movies.find_one({"id": update_data.movie_id, "is_active": True})
            if not movie:
                raise HTTPException(status_code=404, detail="Film non trouvé")
        
        # Préparer les données de mise à jour
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
        
        # Si la date ou le time_slot est modifié, vérifier les conflits
        new_date = update_dict.get("date")
        new_time_slot = update_dict.get("time_slot")
        
        if new_date or new_time_slot:
            # Utiliser les nouvelles valeurs ou les anciennes
            check_date = new_date.isoformat() if new_date else existing_schedule.get("date")
            check_time_slot = new_time_slot if new_time_slot else existing_schedule.get("time_slot")
            
            # Normaliser le time_slot
            if isinstance(check_time_slot, str):
                check_time_slot = normalize_time_slot_value(check_time_slot)
            
            # Vérifier les conflits (exclure la programmation actuelle)
            # Utiliser les horaires si disponibles
            new_start_time = update_dict.get("start_time") or existing_schedule.get("start_time")
            new_end_time = update_dict.get("end_time") or existing_schedule.get("end_time")
            
            if new_start_time and new_end_time:
                # Vérifier les chevauchements d'horaires
                existing_schedules = await db.movie_schedules.find({
                    "id": {"$ne": schedule_id},
                    "date": check_date,
                    "is_active": True
                }).to_list(100)
                
                new_start_minutes = parse_time_to_minutes(new_start_time)
                new_end_minutes = parse_time_to_minutes(new_end_time)
                
                if new_start_minutes is not None and new_end_minutes is not None:
                    for existing in existing_schedules:
                        existing_start = existing.get("start_time")
                        existing_end = existing.get("end_time")
                        
                        if existing_start and existing_end:
                            existing_start_minutes = parse_time_to_minutes(existing_start)
                            existing_end_minutes = parse_time_to_minutes(existing_end)
                            
                            if existing_start_minutes is not None and existing_end_minutes is not None:
                                if times_overlap(new_start_minutes, new_end_minutes, existing_start_minutes, existing_end_minutes):
                                    raise HTTPException(
                                        status_code=400,
                                        detail=f"Un film est déjà programmé à cette heure (chevauchement avec {existing_start} - {existing_end})"
                                    )
                
                # Vérifier aussi avec content_schedules (même time_slot = conflit si pas d'horaires)
                existing_content = await db.content_schedules.find_one({
                    "date": check_date,
                    "time_slot": check_time_slot,
                    "is_active": True
                })
                if existing_content:
                    raise HTTPException(status_code=400, detail="Un contenu est déjà programmé à ce créneau")
            else:
                # Pas d'horaires personnalisés, vérifier comme avant
                existing = await db.movie_schedules.find_one({
                    "id": {"$ne": schedule_id},
                    "date": check_date,
                    "time_slot": check_time_slot,
                    "is_active": True
                })
                
                existing_content = await db.content_schedules.find_one({
                    "date": check_date,
                    "time_slot": check_time_slot,
                    "is_active": True
                })
                
                if existing or existing_content:
                    raise HTTPException(status_code=400, detail="Un contenu est déjà programmé à ce créneau")
        
        # Normaliser le time_slot si modifié
        if "time_slot" in update_dict:
            update_dict["time_slot"] = normalize_time_slot_value(update_dict["time_slot"])
        
        # Convertir la date en format ISO si modifiée
        if "date" in update_dict:
            update_dict["date"] = update_dict["date"].isoformat()
        
        # Mettre à jour dans MongoDB
        update_mongo = prepare_for_mongo(update_dict)
        result = await db.movie_schedules.update_one(
            {"id": schedule_id},
            {"$set": update_mongo}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Programmation non trouvée")
        
        # Récupérer la programmation mise à jour
        updated_schedule = await db.movie_schedules.find_one({"id": schedule_id})
        return MovieSchedule(**parse_from_mongo(updated_schedule))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@api_router.delete("/movie-schedules/{schedule_id}")
async def delete_movie_schedule(schedule_id: str, admin = Depends(get_admin_user)):
    try:
        result = await db.movie_schedules.update_one(
            {"id": schedule_id},
            {"$set": {"is_active": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Programmation non trouvée")
        
        return {"message": "Programmation supprimée avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# QR Code scanning endpoints
@api_router.post("/scan-qr/{booking_id}")
async def scan_qr_code(booking_id: str, admin = Depends(get_admin_user)):
    try:
        # Find the booking
        booking = await db.bookings.find_one({"id": booking_id})
        if not booking:
            raise HTTPException(status_code=404, detail="Réservation non trouvée")
        
        # Check if already checked in
        if booking.get("is_checked_in", False):
            return {
                "status": "already_checked_in",
                "message": f"⚠️ Déjà scanné le {booking.get('checked_in_at', 'N/A')}",
                "booking": TicketBooking(**parse_from_mongo(booking))
            }
        
        # Check if the booking is valid (paid)
        if booking.get("payment_status") != "paid":
            return {
                "status": "not_paid",
                "message": "❌ Réservation non payée - Accès refusé",
                "booking": TicketBooking(**parse_from_mongo(booking))
            }
        
        # Check if cancelled
        if booking.get("is_cancelled", False):
            return {
                "status": "cancelled",
                "message": "❌ Réservation annulée - Accès refusé", 
                "booking": TicketBooking(**parse_from_mongo(booking))
            }
        
        # Mark as checked in
        check_in_time = datetime.now(timezone.utc)
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {
                "is_checked_in": True,
                "checked_in_at": check_in_time.isoformat()
            }}
        )
        
        # Get updated booking
        updated_booking = await db.bookings.find_one({"id": booking_id})
        
        return {
            "status": "success",
            "message": f"✅ Entrée autorisée ! Bienvenue {booking['first_name']} {booking['last_name']}",
            "booking": TicketBooking(**parse_from_mongo(updated_booking))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du scan: {str(e)}")

@api_router.get("/validate-qr/{booking_id}")
async def validate_qr_code(booking_id: str):
    """Endpoint public pour vérifier la validité d'un QR code (sans admin)"""
    try:
        booking = await db.bookings.find_one({"id": booking_id})
        if not booking:
            return {"status": "invalid", "message": "QR Code invalide"}
        
        # Get movie info if available
        movie_info = None
        try:
            schedule = await db.movie_schedules.find_one({
                "date": booking.get("booking_date"),
                "time_slot": booking.get("time_slot"),
                "is_active": True
            })
            if schedule:
                movie = await db.movies.find_one({"id": schedule["movie_id"]})
                if movie:
                    movie_info = {
                        "title": movie["title"],
                        "duration": movie["duration_minutes"]
                    }
        except:
            pass
        
        return {
            "status": "valid",
            "booking": {
                "id": booking["id"],
                "name": f"{booking['first_name']} {booking['last_name']}",
                "date": booking["booking_date"],
                "time_slot": booking["time_slot"],
                "payment_status": booking.get("payment_status", "pending"),
                "is_checked_in": booking.get("is_checked_in", False),
                "is_cancelled": booking.get("is_cancelled", False)
            },
            "movie": movie_info
        }
        
    except Exception as e:
        return {"status": "error", "message": "Erreur de validation"}

# Partner contact endpoints
@api_router.post("/partners/contact", response_model=PartnerContact)
async def create_partner_contact(contact_data: PartnerContactCreate):
    try:
        contact_obj = PartnerContact(**contact_data.dict())
        contact_mongo = prepare_for_mongo(contact_obj.dict())
        
        await db.partner_contacts.insert_one(contact_mongo)
        
        # Here you could send an email notification to semih.adresse@gmail.com
        # For now, we just store it in the database
        
        return contact_obj
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi du message: {str(e)}")

@api_router.get("/partners/contacts", response_model=List[PartnerContact])
async def get_partner_contacts(admin = Depends(get_admin_user)):
    try:
        contacts = await db.partner_contacts.find().to_list(1000)
        return [PartnerContact(**parse_from_mongo(contact)) for contact in contacts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des contacts: {str(e)}")

# Current featured content endpoint (intelligent logic - movies or events)
@api_router.get("/current-featured-movie")
async def get_current_featured_content():
    """
    Get the featured content (movie or event) based on intelligent logic:
    - Wednesday/Thursday → Show content scheduled for Friday
    - Friday/Saturday/Sunday → Show content scheduled for the same day
    - Monday/Tuesday → Show content scheduled for next Friday
    """
    try:
        today = datetime.now(timezone.utc)
        current_weekday = today.weekday()  # 0=Monday, 1=Tuesday, ..., 6=Sunday
        
        # Determine target date based on current day
        if current_weekday in [2, 3]:  # Wednesday (2) or Thursday (3)
            # Show Friday's content
            days_until_friday = 4 - current_weekday  # Friday is weekday 4
            target_date = today + timedelta(days=days_until_friday)
        elif current_weekday in [4, 5, 6]:  # Friday (4), Saturday (5), Sunday (6)
            # Show today's content
            target_date = today
        else:  # Monday (0) or Tuesday (1)
            # Show next Friday's content
            days_until_friday = 4 - current_weekday
            if days_until_friday <= 0:  # If it's past Friday, get next Friday
                days_until_friday += 7
            target_date = today + timedelta(days=days_until_friday)
        
        # Format target date for database query
        target_date_str = target_date.strftime('%Y-%m-%d')
        
        # Find scheduled content for the target date (check both new and legacy collections)
        content_schedules = await db.content_schedules.find({
            "date": target_date_str,
            "is_active": True
        }).to_list(10)
        
        movie_schedules = await db.movie_schedules.find({
            "date": target_date_str,
            "is_active": True
        }).to_list(10)
        
        # Combine both types of schedules
        all_schedules = []
        
        # Process content schedules
        for schedule in content_schedules:
            parsed_schedule = parse_from_mongo(schedule)
            if parsed_schedule["content_type"] == "movie":
                content = await db.movies.find_one({"id": parsed_schedule["content_id"]})
                if content:
                    all_schedules.append({
                        "type": "movie",
                        "schedule": ContentSchedule(**parsed_schedule),
                        "content": Movie(**parse_from_mongo(content)),
                        "time_slot": parsed_schedule["time_slot"]
                    })
            elif parsed_schedule["content_type"] == "event":
                content = await db.events.find_one({"id": parsed_schedule["content_id"]})
                if content:
                    all_schedules.append({
                        "type": "event",
                        "schedule": ContentSchedule(**parsed_schedule),
                        "content": Event(**parse_from_mongo(content)),
                        "time_slot": parsed_schedule["time_slot"]
                    })
        
        # Process legacy movie schedules
        for schedule in movie_schedules:
            parsed_schedule = parse_from_mongo(schedule)
            movie = await db.movies.find_one({"id": parsed_schedule["movie_id"]})
            if movie:
                all_schedules.append({
                    "type": "movie",
                    "schedule": MovieSchedule(**parsed_schedule),
                    "content": Movie(**parse_from_mongo(movie)),
                    "time_slot": parsed_schedule["time_slot"]
                })
        
        if not all_schedules:
            return {"status": "no_content", "message": "Aucun contenu programmé pour cette période"}
        
        # Get the first scheduled content (preference for earlier time slot)
        selected = sorted(all_schedules, key=lambda x: x["time_slot"])[0]
        
        # Return content with schedule information
        if selected["type"] == "movie":
            return {
                "status": "found",
                "content_type": "movie",
                "schedule": selected["schedule"],
                "movie": selected["content"],  # For backwards compatibility
                "content": selected["content"],
                "target_date": target_date_str,
                "is_today": current_weekday in [4, 5, 6] and target_date.date() == today.date()
            }
        else:  # event
            return {
                "status": "found",
                "content_type": "event",
                "schedule": selected["schedule"],
                "event": selected["content"],
                "content": selected["content"],
                "target_date": target_date_str,
                "is_today": current_weekday in [4, 5, 6] and target_date.date() == today.date()
            }
        
    except Exception as e:
        logging.error(f"Error getting featured content: {str(e)}")
        return {"status": "error", "message": "Erreur lors de la récupération du contenu"}

# Popular movies endpoint (using TMDb API)
@api_router.get("/popular-movies")
async def get_popular_movies(genre: Optional[str] = None, year: Optional[int] = None):
    """
    Get popular movies by genre from TMDb API
    Available genres: action, adventure, animation, comedy, crime, documentary, drama, family, fantasy, 
    history, horror, music, mystery, romance, science_fiction, tv_movie, thriller, war, western
    """
    try:
        # TMDb API key (free tier - 1000 requests per day)
        TMDB_API_KEY = "bce281d3a24cbab349df1405e23e210a"  # You would need to get this from TMDb
        
        # For demo purposes, return static popular movies data
        # In production, you would make actual API calls to TMDb
        
        popular_movies = {
            "action": [
                {
                    "id": "action_1",
                    "title": "Top Gun: Maverick",
                    "overview": "Après plus de trente ans de service en tant que l'un des meilleurs aviateurs de la Marine, Pete « Maverick » Mitchell est à sa place, repoussant les limites en tant que pilote d'essai courageux.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
                    "release_date": "2022-05-24",
                    "vote_average": 8.3,
                    "genre": "action",
                    "runtime": 130
                },
                {
                    "id": "action_2",
                    "title": "Avatar: La Voie de l'eau",
                    "overview": "Plus d'une décennie après les événements du premier film, Avatar : La Voie de l'eau commence à raconter l'histoire de la famille Sully.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
                    "release_date": "2022-12-14",
                    "vote_average": 7.6,
                    "genre": "action",
                    "runtime": 192
                },
                {
                    "id": "action_3",
                    "title": "Spider-Man: No Way Home",
                    "overview": "Peter Parker est démasqué et ne peut plus séparer sa vie normale des enjeux élevés d'être un super-héros.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
                    "release_date": "2021-12-15",
                    "vote_average": 8.1,
                    "genre": "action",
                    "runtime": 148
                }
            ],
            "comedy": [
                {
                    "id": "comedy_1",
                    "title": "Glass Onion: A Knives Out Mystery",
                    "overview": "Le célèbre détective Benoit Blanc se rend en Grèce pour éplucher un mystère qui implique un nouveau casting de suspects colorés.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/vDGr1YdrlfbU9wxTOdpf3zChmv9.jpg",
                    "release_date": "2022-11-23",
                    "vote_average": 7.2,
                    "genre": "comedy",
                    "runtime": 139
                },
                {
                    "id": "comedy_2",
                    "title": "Free Guy",
                    "overview": "Un employé de banque découvre qu'il est en fait un personnage non-joueur dans un jeu vidéo en monde ouvert brutal.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/xmbU4JTUm8rsdtn7Y3Fcm30GpeT.jpg",
                    "release_date": "2021-08-11",
                    "vote_average": 7.7,
                    "genre": "comedy",
                    "runtime": 115
                },
                {
                    "id": "comedy_3",
                    "title": "Encanto",
                    "overview": "Une jeune fille colombienne peut être le dernier espoir de sa famille lorsqu'elle découvre que la magie entourant l'Encanto est en danger.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/4j0PNHkMr5ax3IA8tjtxcmPU3QT.jpg",
                    "release_date": "2021-11-24",
                    "vote_average": 7.2,
                    "genre": "comedy",
                    "runtime": 102
                }
            ],
            "drama": [
                {
                    "id": "drama_1",
                    "title": "The Power of the Dog",
                    "overview": "Un éleveur charismatique terrorise psychologiquement la nouvelle épouse de son frère et son fils adolescent, jusqu'à ce que les secrets anciens se révèlent.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/oxz4z1P1xvIVhNNWBsI2SQhB4PQ.jpg",
                    "release_date": "2021-11-17",
                    "vote_average": 6.8,
                    "genre": "drama",
                    "runtime": 126
                },
                {
                    "id": "drama_2",
                    "title": "CODA",
                    "overview": "Ruby est une adolescente passionnée de musique. Malheureusement, elle vit avec des parents et un frère sourds qui ne comprennent pas sa passion.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/BzVjmm8l23rPsijLiNLUzuQtyd.jpg",
                    "release_date": "2021-07-30",
                    "vote_average": 8.1,
                    "genre": "drama",
                    "runtime": 111
                },
                {
                    "id": "drama_3",
                    "title": "Dune",
                    "overview": "Paul Atréides, jeune homme aussi doué que brillant, est voué à connaître un destin hors du commun qui le dépasse totalement.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
                    "release_date": "2021-09-15",
                    "vote_average": 7.8,
                    "genre": "drama",
                    "runtime": 155
                }
            ],
            "horror": [
                {
                    "id": "horror_1",
                    "title": "X",
                    "overview": "En 1979, un groupe de jeunes cinéastes entreprend de faire un film pour adultes dans la campagne texane rurale.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/woTQx9Q4b8aO13jR9dsj8C9JESy.jpg",
                    "release_date": "2022-03-18",
                    "vote_average": 6.7,
                    "genre": "horror",
                    "runtime": 105
                },
                {
                    "id": "horror_2",
                    "title": "Nope",
                    "overview": "Les habitants d'une vallée isolée découvrent un objet mystérieux et inquiétant dans le ciel.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/AcKVlWaNVVVFQwro3nLXqPljcYA.jpg",
                    "release_date": "2022-07-20",
                    "vote_average": 6.8,
                    "genre": "horror",
                    "runtime": 130
                },
                {
                    "id": "horror_3",
                    "title": "Scream",
                    "overview": "Vingt-cinq ans après que la paisible ville de Woodsboro ait été frappée par une série de meurtres violents.",
                    "poster_path": "https://image.tmdb.org/t/p/w500/1m3W6cpgwuIyjtg5nSnPx7yFkXW.jpg",
                    "release_date": "2022-01-12",
                    "vote_average": 6.7,
                    "genre": "horror",
                    "runtime": 114
                }
            ]
        }
        
        # Filter by genre if specified
        if genre and genre in popular_movies:
            movies = popular_movies[genre]
        else:
            # Return all movies from all genres
            movies = []
            for genre_movies in popular_movies.values():
                movies.extend(genre_movies)
        
        # Sort by vote average (highest rated first)
        movies.sort(key=lambda x: x["vote_average"], reverse=True)
        
        return {
            "status": "success",
            "genre": genre or "all",
            "movies": movies,
            "total": len(movies)
        }
        
    except Exception as e:
        logging.error(f"Error getting popular movies: {str(e)}")
        return {"status": "error", "message": "Erreur lors de la récupération des films populaires"}

# Data reset endpoint for admin
@api_router.post("/admin/reset-data")
async def reset_all_data(admin = Depends(get_admin_user)):
    """
    DANGER: Reset all bookings, contacts, and analytics data
    This will permanently delete all test data to start fresh
    Films, events, and schedules are preserved
    """
    try:
        reset_summary = {
            "bookings_deleted": 0,
            "contacts_deleted": 0,
            "total_operations": 0
        }
        
        # Delete all bookings
        bookings_result = await db.bookings.delete_many({})
        reset_summary["bookings_deleted"] = bookings_result.deleted_count
        reset_summary["total_operations"] += 1
        
        # Delete all partner contacts
        contacts_result = await db.partner_contacts.delete_many({})
        reset_summary["contacts_deleted"] = contacts_result.deleted_count
        reset_summary["total_operations"] += 1
        
        # Log the reset action
        logging.info(f"Data reset performed by admin - Deleted {reset_summary['bookings_deleted']} bookings and {reset_summary['contacts_deleted']} contacts")
        
        return {
            "status": "success",
            "message": "Toutes les données de test ont été supprimées avec succès",
            "summary": reset_summary,
            "preserved": [
                "Films et événements conservés",
                "Programmations conservées", 
                "Configuration admin conservée"
            ]
        }
        
    except Exception as e:
        logging.error(f"Error during data reset: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la réinitialisation: {str(e)}")

# Helper function to get booking details from related tables (JOIN)
async def get_booking_details_from_schedules(
    booking_date: date, 
    time_slot: Union[TimeSlot, str],
    content_id: Optional[str] = None,
    content_type: Optional[str] = None,
    movie_title: Optional[str] = None
) -> dict:
    """
    Récupère entry_time et movie_title depuis les tables liées via jointures
    Jointure: bookings -> movie_schedules/content_schedules -> movies
    Utilise booking_date et time_slot pour joindre avec movie_schedules/content_schedules
    Puis utilise movie_id pour joindre avec movies et récupérer le title
    
    Si content_id et content_type sont fournis, les utilise directement pour récupérer le titre
    """
    booking_date_str = booking_date.isoformat() if isinstance(booking_date, date) else str(booking_date)
    time_slot_str = time_slot.value if isinstance(time_slot, TimeSlot) else str(time_slot)
    normalized_time_slot_obj = normalize_time_slot_value(time_slot_str, allow_unknown=True) if time_slot_str else None
    # Convertir en string pour la recherche MongoDB
    normalized_time_slot = normalized_time_slot_obj.value if isinstance(normalized_time_slot_obj, TimeSlot) else (normalized_time_slot_obj if normalized_time_slot_obj else time_slot_str)
    
    logging.info(f"🔍 Recherche détails pour booking_date={booking_date_str}, time_slot={time_slot_str}, normalized={normalized_time_slot}, content_id={content_id}, content_type={content_type}")
    
    entry_time = None
    movie_title_result = None  # Variable locale pour éviter conflit avec le paramètre
    content_schedule = None  # Initialiser content_schedule
    
    # Si content_id et content_type sont disponibles, utiliser directement pour récupérer
    # le titre ET tenter une jointure plus précise avec content_schedules
    if content_id and content_type:
        if content_type == "movie":
            # Chercher d'abord avec is_active=True, puis sans cette condition
            movie = await db.movies.find_one({"id": content_id, "is_active": True})
            if not movie:
                movie = await db.movies.find_one({"id": content_id})
            if movie:
                movie_title_result = movie.get("title")
                logging.info(f"✅ Film trouvé directement via content_id: {movie_title_result}")
            else:
                logging.warning(f"⚠️ Film non trouvé avec content_id={content_id}")
        elif content_type == "event":
            # Chercher d'abord avec is_active=True, puis sans cette condition
            event = await db.events.find_one({"id": content_id, "is_active": True})
            if not event:
                event = await db.events.find_one({"id": content_id})
            if event:
                movie_title_result = event.get("title")
                logging.info(f"✅ Événement trouvé directement via content_id: {movie_title_result}")
            else:
                logging.warning(f"⚠️ Événement non trouvé avec content_id={content_id}")

        # Tentative 1 : récupérer d'abord le content_schedule correspondant exactement
        # au couple (date, content_id, content_type). Cela permet d'avoir un entry_time
        # spécifique par film même si plusieurs films partagent le même time_slot.
        precise_content_schedule = await db.content_schedules.find_one({
            "date": booking_date_str,
            "content_id": content_id,
            "content_type": content_type,
            "is_active": True,
        })
        if not precise_content_schedule:
            precise_content_schedule = await db.content_schedules.find_one({
                "date": booking_date_str,
                "content_id": content_id,
                "content_type": content_type,
            })

        if precise_content_schedule:
            logging.info(
                "✅ content_schedule précis trouvé pour content_id=%s, type=%s",
                content_id,
                content_type,
            )
            entry_time = precise_content_schedule.get("entry_time") or entry_time

    # Chercher dans content_schedules d'abord (nouveau système) si on n'a pas encore
    # trouvé d'entry_time via la jointure précise ci‑dessus.
    # Si on a movie_title en paramètre, chercher tous les schedules et trouver celui qui correspond
    # Utiliser le paramètre movie_title si fourni, sinon utiliser movie_title_result
    search_movie_title = movie_title if movie_title else movie_title_result
    # Rechercher par movie_title si entry_time n'est pas trouvé OU si c'est la valeur par défaut suspecte "17h45"
    if search_movie_title and (not entry_time or entry_time == "17h45"):
        # Chercher tous les schedules pour cette date + time_slot
        all_schedules = await db.content_schedules.find({
            "date": booking_date_str,
            "time_slot": {"$in": [normalized_time_slot, time_slot_str]},
            "is_active": True
        }).to_list(100)
        
        if not all_schedules:
            all_schedules = await db.content_schedules.find({
                "date": booking_date_str,
                "time_slot": {"$in": [normalized_time_slot, time_slot_str]}
            }).to_list(100)
        
        # Pour chaque schedule, vérifier si le titre correspond
        for schedule in all_schedules:
            schedule_content_id = schedule.get("content_id")
            schedule_content_type = schedule.get("content_type", "movie")
            
            if schedule_content_type == "movie" and schedule_content_id:
                movie = await db.movies.find_one({"id": schedule_content_id})
                if movie and movie.get("title") == search_movie_title:
                    content_schedule = schedule
                    entry_time = schedule.get("entry_time")
                    logging.info(f"✅ Schedule trouvé via movie_title '{search_movie_title}': entry_time={entry_time}")
                    break
            elif schedule_content_type == "event" and schedule_content_id:
                event = await db.events.find_one({"id": schedule_content_id})
                if event and event.get("title") == search_movie_title:
                    content_schedule = schedule
                    entry_time = schedule.get("entry_time")
                    logging.info(f"✅ Schedule trouvé via movie_title '{search_movie_title}': entry_time={entry_time}")
                    break
        
        if not content_schedule:
            logging.warning(f"⚠️ Aucun schedule trouvé pour movie_title '{search_movie_title}' à {booking_date_str} {time_slot_str}")
    
    # Si on n'a pas encore trouvé, chercher normalement
    if not content_schedule:
        content_schedule = await db.content_schedules.find_one({
            "date": booking_date_str,
            "time_slot": {"$in": [normalized_time_slot, time_slot_str]},
            "is_active": True
        })
        
        # Si pas trouvé avec is_active=True, chercher sans cette condition (pour les anciennes réservations)
        if not content_schedule:
            content_schedule = await db.content_schedules.find_one({
                "date": booking_date_str,
                "time_slot": {"$in": [normalized_time_slot, time_slot_str]}
            })
    
    if content_schedule:
        logging.info(f"✅ Trouvé content_schedule: {content_schedule.get('content_id')}, type: {content_schedule.get('content_type')}")
        # Récupérer entry_time depuis content_schedule
        entry_time = content_schedule.get("entry_time")
        
        # Récupérer le titre du film/événement via content_id
        schedule_content_type = content_schedule.get("content_type", "movie")
        schedule_content_id = content_schedule.get("content_id")
        
        if schedule_content_type == "movie" and schedule_content_id:
            # Jointure avec movies via content_id
            movie = await db.movies.find_one({"id": schedule_content_id, "is_active": True})
            if not movie:
                movie = await db.movies.find_one({"id": schedule_content_id})
            if movie:
                movie_title_result = movie.get("title")
                logging.info(f"✅ Film trouvé via content_schedule: {movie_title_result}")
            else:
                logging.warning(f"⚠️ Film non trouvé avec content_id={schedule_content_id} depuis content_schedule")
        elif schedule_content_type == "event" and schedule_content_id:
            # Jointure avec events via content_id
            event = await db.events.find_one({"id": schedule_content_id, "is_active": True})
            if not event:
                event = await db.events.find_one({"id": schedule_content_id})
            if event:
                movie_title_result = event.get("title")
                logging.info(f"✅ Événement trouvé via content_schedule: {movie_title_result}")
            else:
                logging.warning(f"⚠️ Événement non trouvé avec content_id={schedule_content_id} depuis content_schedule")
        
        # Si entry_time n'est pas dans content_schedule, chercher dans movie_schedules legacy
        if not entry_time:
            movie_schedule_temp = await db.movie_schedules.find_one({
                "date": booking_date_str,
                "time_slot": {"$in": [normalized_time_slot, time_slot_str]},
                "is_active": True
            })
            if not movie_schedule_temp:
                movie_schedule_temp = await db.movie_schedules.find_one({
                    "date": booking_date_str,
                    "time_slot": {"$in": [normalized_time_slot, time_slot_str]}
                })
            if movie_schedule_temp:
                entry_time = movie_schedule_temp.get("entry_time")
    else:
        logging.info(f"⚠️ Aucun content_schedule trouvé pour date={booking_date_str}, time_slot={normalized_time_slot or time_slot_str}")
    
    # Si pas trouvé dans content_schedules, chercher dans movie_schedules legacy
    # Si on a search_movie_title, chercher tous les movie_schedules et trouver celui qui correspond
    if search_movie_title and (not entry_time or entry_time == "17h45"):
        # Chercher tous les movie_schedules pour cette date + time_slot
        all_movie_schedules = await db.movie_schedules.find({
            "date": booking_date_str,
            "time_slot": {"$in": [normalized_time_slot, time_slot_str]},
            "is_active": True
        }).to_list(100)
        
        if not all_movie_schedules:
            all_movie_schedules = await db.movie_schedules.find({
                "date": booking_date_str,
                "time_slot": {"$in": [normalized_time_slot, time_slot_str]}
            }).to_list(100)
        
        # Pour chaque schedule, vérifier si le titre correspond
        for schedule in all_movie_schedules:
            movie_id = schedule.get("movie_id")
            if movie_id:
                movie = await db.movies.find_one({"id": movie_id})
                if movie and movie.get("title") == search_movie_title:
                    entry_time = schedule.get("entry_time")
                    movie_title_result = movie.get("title")
                    logging.info(f"✅ movie_schedule trouvé via movie_title '{search_movie_title}': entry_time={entry_time}")
                    break
    
    # Si toujours pas trouvé, chercher normalement (sans filtre par movie_title)
    if not entry_time or not movie_title_result:
        movie_schedule = await db.movie_schedules.find_one({
            "date": booking_date_str,
            "time_slot": {"$in": [normalized_time_slot, time_slot_str]},
            "is_active": True
        })
        
        # Si pas trouvé avec is_active=True, chercher sans cette condition
        if not movie_schedule:
            movie_schedule = await db.movie_schedules.find_one({
                "date": booking_date_str,
                "time_slot": {"$in": [normalized_time_slot, time_slot_str]}
            })
        
        if movie_schedule:
            logging.info(f"✅ Trouvé movie_schedule legacy: movie_id={movie_schedule.get('movie_id')}")
            # Récupérer entry_time depuis movie_schedule
            if not entry_time:
                entry_time = movie_schedule.get("entry_time")
            
            # Récupérer movie_title via movie_id (jointure avec movies)
            if not movie_title_result:
                movie_id = movie_schedule.get("movie_id")
                if movie_id:
                    movie = await db.movies.find_one({"id": movie_id, "is_active": True})
                    if not movie:
                        movie = await db.movies.find_one({"id": movie_id})
                    if movie:
                        movie_title_result = movie.get("title")
                        logging.info(f"✅ Film trouvé via movie_schedule: {movie_title_result}")
                    else:
                        logging.warning(f"⚠️ Film non trouvé avec movie_id={movie_id}")
                else:
                    logging.warning(f"⚠️ movie_schedule n'a pas de movie_id")
        else:
            logging.warning(f"⚠️ Aucun movie_schedule trouvé pour date={booking_date_str}, time_slot={normalized_time_slot or time_slot_str}")
    
    # Si entry_time n'est toujours pas trouvé, utiliser TimeSlotSettings
    if not entry_time:
        time_settings = await get_time_slot_settings()
        time_slot_str_lower = str(time_slot_str).lower()
        
        if time_slot_str_lower == "21h15" or time_slot_str_lower == time_settings.first_slot_value.lower():
            entry_time = time_settings.first_slot_entry_time
        elif time_slot_str_lower == "23h45" or time_slot_str_lower == time_settings.second_slot_value.lower():
            entry_time = time_settings.second_slot_entry_time
        elif time_slot_str_lower == "01h30" or time_slot_str_lower == time_settings.third_slot_value.lower():
            entry_time = time_settings.third_slot_entry_time
    
    # Utiliser le paramètre movie_title si fourni, sinon utiliser movie_title_result
    final_movie_title = movie_title if movie_title else movie_title_result
    
    if not final_movie_title:
        logging.warning(f"❌ Aucun titre de film trouvé pour booking_date={booking_date_str}, time_slot={time_slot_str}")
    
    # S'assurer qu'entry_time est toujours renvoyé (même si c'est une valeur par défaut)
    if not entry_time:
        logging.warning(f"⚠️ entry_time non trouvé, utilisation d'une valeur par défaut basée sur time_slot={time_slot_str}")
        # En dernier recours, utiliser le time_slot comme entry_time
        entry_time = time_slot_str
    
    return {
        "entry_time": entry_time,
        "movie_title": final_movie_title
    }

# Helper function to get entry time for a booking (kept for backward compatibility)
async def get_entry_time_for_booking(booking_date: str, time_slot: str) -> Optional[str]:
    """Récupère l'heure d'entrée pour une réservation donnée (legacy)"""
    try:
        booking_date_obj = date.fromisoformat(booking_date) if isinstance(booking_date, str) else booking_date
        details = await get_booking_details_from_schedules(booking_date_obj, time_slot)
        return details.get("entry_time")
    except Exception as e:
        logging.error(f"Erreur lors de la récupération de l'heure d'entrée: {str(e)}")
        return None

# Admin endpoints
@api_router.get("/admin/dashboard")
async def get_admin_dashboard(admin = Depends(get_admin_user)):
    try:
        # Basic statistics
        total_bookings = await db.bookings.count_documents({"is_cancelled": {"$ne": True}})
        paid_bookings = await db.bookings.count_documents({"payment_status": "paid", "is_cancelled": {"$ne": True}})
        pending_bookings = await db.bookings.count_documents({"payment_status": "pending", "is_cancelled": {"$ne": True}})
        total_revenue = paid_bookings * 17.0
        
        # Advanced analytics
        # Bookings by day of week
        bookings_by_day = {}
        for day in ["vendredi", "samedi", "dimanche"]:
            count = await db.bookings.count_documents({
                "day_of_week": day, 
                "is_cancelled": {"$ne": True}
            })
            bookings_by_day[day] = count
        
        # Bookings by time slot
        bookings_by_slot = {}
        for slot in ["21h15", "23h45"]:
            count = await db.bookings.count_documents({
                "time_slot": slot, 
                "is_cancelled": {"$ne": True}
            })
            bookings_by_slot[slot] = count
        
        # Recent bookings trends (last 7 days)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent_bookings_count = await db.bookings.count_documents({
            "created_at": {"$gte": seven_days_ago.isoformat()},
            "is_cancelled": {"$ne": True}
        })
        
        # Most popular movies (if any schedules exist)
        movie_popularity = []
        try:
            # Get all bookings with their corresponding movie schedules
            bookings = await db.bookings.find({
                "is_cancelled": {"$ne": True}
            }).to_list(1000)
            
            movie_stats = {}
            for booking in bookings:
                # Find the movie scheduled for this booking's date and time
                schedule = await db.movie_schedules.find_one({
                    "date": booking.get("booking_date"),
                    "time_slot": booking.get("time_slot"),
                    "is_active": True
                })
                
                if schedule:
                    movie_id = schedule["movie_id"]
                    if movie_id not in movie_stats:
                        movie = await db.movies.find_one({"id": movie_id})
                        if movie:
                            movie_stats[movie_id] = {
                                "title": movie["title"],
                                "bookings": 0,
                                "revenue": 0
                            }
                    
                    movie_stats[movie_id]["bookings"] += 1
                    if booking.get("payment_status") == "paid":
                        movie_stats[movie_id]["revenue"] += 17.0
            
            # Sort by bookings count
            movie_popularity = sorted(
                movie_stats.values(), 
                key=lambda x: x["bookings"], 
                reverse=True
            )[:5]  # Top 5
            
        except Exception as e:
            logging.error(f"Error calculating movie popularity: {str(e)}")
        
        # Occupancy rate calculation
        max_capacity_per_show = 21  # Updated capacity
        total_possible_spots = max_capacity_per_show * 2 * 3  # 2 shows, 3 days per week
        occupancy_rate = (total_bookings / max(total_possible_spots, 1)) * 100 if total_possible_spots > 0 else 0
        
        # Get recent bookings
        recent_bookings = await db.bookings.find(
            {"is_cancelled": {"$ne": True}},
            sort=[("created_at", -1)],
            limit=10
        ).to_list(10)
        
        # Enrichir les réservations récentes avec l'heure d'entrée et le titre du film
        enriched_recent_bookings = []
        for booking in recent_bookings:
            booking_parsed = parse_from_mongo(booking)
            booking_obj = TicketBooking(**booking_parsed)
            
            # Récupérer entry_time et movie_title via jointures avec movie_schedules/content_schedules et movies
            # Jointure: bookings (booking_date, time_slot) -> movie_schedules/content_schedules -> movies
            # Première passe : récupérer movie_title normalement
            booking_details = await get_booking_details_from_schedules(
                booking_obj.booking_date,
                booking_obj.time_slot,
                booking_obj.content_id,
                booking_obj.content_type
            )
            
            # Si on n'a pas entry_time stocké mais qu'on a movie_title, réessayer avec movie_title comme filtre
            # pour trouver le bon schedule (utile pour les anciennes réservations)
            # TOUJOURS réessayer si entry_time est 17h45 (valeur par défaut suspecte) ou manquant
            movie_title_from_details = booking_details.get("movie_title")
            if movie_title_from_details and (not booking_obj.entry_time or booking_details.get("entry_time") == "17h45"):
                logging.info(f"🔍 Tentative de correction entry_time pour réservation {booking_obj.id} avec movie_title: {movie_title_from_details}")
                booking_details_with_title = await get_booking_details_from_schedules(
                    booking_obj.booking_date,
                    booking_obj.time_slot,
                    booking_obj.content_id,
                    booking_obj.content_type,
                    movie_title_from_details
                )
                # Utiliser entry_time de la deuxième passe si différent de 17h45 ou meilleur
                new_entry_time = booking_details_with_title.get("entry_time")
                if new_entry_time and new_entry_time != "17h45":
                    booking_details["entry_time"] = new_entry_time
                    logging.info(f"✅ Réservation {booking_obj.id} - entry_time corrigé via movie_title: {new_entry_time} (était: {booking_details.get('entry_time')})")
                elif new_entry_time and booking_details.get("entry_time") == "17h45":
                    # Même si c'est toujours 17h45, on l'utilise car c'est le résultat de la recherche précise
                    booking_details["entry_time"] = new_entry_time
                    logging.info(f"⚠️ Réservation {booking_obj.id} - entry_time reste 17h45 après recherche précise")
            
            # Ajouter entry_time et movie_title au dictionnaire de réponse
            booking_dict = booking_obj.dict()
            # Convertir les dates en strings pour la sérialisation JSON
            if isinstance(booking_dict.get("booking_date"), date):
                booking_dict["booking_date"] = booking_dict["booking_date"].isoformat()
            if isinstance(booking_dict.get("created_at"), datetime):
                booking_dict["created_at"] = booking_dict["created_at"].isoformat()
            if isinstance(booking_dict.get("checked_in_at"), datetime):
                booking_dict["checked_in_at"] = booking_dict["checked_in_at"].isoformat()
            
            # entry_time stocké en base a priorité, sinon on utilise celui dérivé
            stored_entry_time = booking_obj.entry_time if booking_obj.entry_time else None
            if stored_entry_time:
                booking_dict["entry_time"] = stored_entry_time
            else:
                booking_dict["entry_time"] = booking_details.get("entry_time")
            
            booking_dict["movie_title"] = booking_details.get("movie_title")
            
            enriched_recent_bookings.append(booking_dict)
        
        return {
            "statistics": {
                "total_bookings": total_bookings,
                "paid_bookings": paid_bookings,
                "pending_bookings": pending_bookings,
                "total_revenue": total_revenue,
                "recent_bookings_7days": recent_bookings_count,
                "occupancy_rate": round(occupancy_rate, 1),
                "average_revenue_per_day": round(total_revenue / 7, 2) if total_revenue > 0 else 0
            },
            "analytics": {
                "bookings_by_day": bookings_by_day,
                "bookings_by_slot": bookings_by_slot,
                "movie_popularity": movie_popularity,
                "capacity_utilization": {
                    "used_spots": total_bookings,
                    "available_spots": total_possible_spots - total_bookings,
                    "utilization_percentage": round(occupancy_rate, 1)
                }
            },
            "recent_bookings": enriched_recent_bookings
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du dashboard: {str(e)}")

@api_router.get("/admin/bookings")
async def get_all_admin_bookings(admin = Depends(get_admin_user)):
    try:
        bookings = await db.bookings.find().to_list(1000)
        enriched_bookings = []
        
        for booking in bookings:
            booking_parsed = parse_from_mongo(booking)
            booking_obj = TicketBooking(**booking_parsed)
            
            # Récupérer entry_time et movie_title via jointures avec movie_schedules/content_schedules et movies
            # Jointure: bookings (booking_date, time_slot) -> movie_schedules/content_schedules -> movies
            # Première passe : récupérer movie_title normalement
            booking_details = await get_booking_details_from_schedules(
                booking_obj.booking_date,
                booking_obj.time_slot,
                booking_obj.content_id,
                booking_obj.content_type
            )
            
            # Si on n'a pas entry_time stocké mais qu'on a movie_title, réessayer avec movie_title comme filtre
            # pour trouver le bon schedule (utile pour les anciennes réservations)
            # TOUJOURS réessayer si entry_time est 17h45 (valeur par défaut suspecte) ou manquant
            movie_title_from_details = booking_details.get("movie_title")
            if movie_title_from_details and (not booking_obj.entry_time or booking_details.get("entry_time") == "17h45"):
                logging.info(f"🔍 Tentative de correction entry_time pour réservation {booking_obj.id} avec movie_title: {movie_title_from_details}")
                booking_details_with_title = await get_booking_details_from_schedules(
                    booking_obj.booking_date,
                    booking_obj.time_slot,
                    booking_obj.content_id,
                    booking_obj.content_type,
                    movie_title_from_details
                )
                # Utiliser entry_time de la deuxième passe si différent de 17h45 ou meilleur
                new_entry_time = booking_details_with_title.get("entry_time")
                if new_entry_time and new_entry_time != "17h45":
                    booking_details["entry_time"] = new_entry_time
                    logging.info(f"✅ Réservation {booking_obj.id} - entry_time corrigé via movie_title: {new_entry_time} (était: {booking_details.get('entry_time')})")
                elif new_entry_time and booking_details.get("entry_time") == "17h45":
                    # Même si c'est toujours 17h45, on l'utilise car c'est le résultat de la recherche précise
                    booking_details["entry_time"] = new_entry_time
                    logging.info(f"⚠️ Réservation {booking_obj.id} - entry_time reste 17h45 après recherche précise")
            
            # Ajouter entry_time et movie_title au dictionnaire de réponse
            booking_dict = booking_obj.dict()
            # Convertir les dates en strings pour la sérialisation JSON
            if isinstance(booking_dict.get("booking_date"), date):
                booking_dict["booking_date"] = booking_dict["booking_date"].isoformat()
            if isinstance(booking_dict.get("created_at"), datetime):
                booking_dict["created_at"] = booking_dict["created_at"].isoformat()
            if isinstance(booking_dict.get("checked_in_at"), datetime):
                booking_dict["checked_in_at"] = booking_dict["checked_in_at"].isoformat()
            
            # entry_time stocké en base a priorité, sinon on utilise celui dérivé
            # Vérifier explicitement si entry_time existe et n'est pas vide
            stored_entry_time = booking_obj.entry_time if booking_obj.entry_time else None
            if stored_entry_time:
                booking_dict["entry_time"] = stored_entry_time
                logging.info(f"✅ Réservation {booking_obj.id} - Utilisation entry_time stocké: {stored_entry_time}")
            else:
                derived_entry_time = booking_details.get("entry_time")
                booking_dict["entry_time"] = derived_entry_time
                logging.info(f"⚠️ Réservation {booking_obj.id} - Utilisation entry_time dérivé: {derived_entry_time}")
            
            booking_dict["movie_title"] = booking_details.get("movie_title")
            
            # Log pour déboguer
            logging.info(f"📋 Réservation {booking_obj.id} - entry_time final={booking_dict.get('entry_time')}, movie_title={booking_dict.get('movie_title')}, content_id={booking_obj.content_id}, content_type={booking_obj.content_type}, stored_entry_time={stored_entry_time}")
            if not booking_dict.get("movie_title"):
                logging.warning(f"⚠️ Réservation {booking_obj.id} ({booking_obj.first_name} {booking_obj.last_name}) - Pas de titre trouvé. content_id={booking_obj.content_id}, content_type={booking_obj.content_type}, date={booking_obj.booking_date}, time_slot={booking_obj.time_slot}")
            
            enriched_bookings.append(booking_dict)
        
        return enriched_bookings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des réservations: {str(e)}")

# CORS configuration - MUST be added BEFORE routes
cors_origins = os.environ.get('CORS_ORIGINS', '*')
logging.info(f"🌐 CORS_ORIGINS depuis env: {cors_origins}")

if cors_origins == '*':
    # Si '*' est utilisé, on ne peut pas utiliser allow_credentials=True
    allowed_origins = ['*']
    allow_creds = False
    logging.info("🌐 CORS configuré avec allow_origins=['*'] et allow_credentials=False")
else:
    # Parser les origines séparées par des virgules et nettoyer les URLs
    allowed_origins = []
    for origin in cors_origins.split(','):
        origin = origin.strip()
        if origin:
            # Retirer le slash final s'il existe
            origin = origin.rstrip('/')
            allowed_origins.append(origin)
    
    allow_creds = True
    logging.info(f"🌐 CORS configuré avec allow_origins={allowed_origins} et allow_credentials=True")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=allow_creds,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_db_tasks():
    # Vérifier la connexion MongoDB
    if await check_mongodb_connection():
        logging.info("✅ Connexion MongoDB établie")
        try:
            await migrate_legacy_time_slots()
        except Exception as exc:
            logging.error(
                "Échec de la migration automatique des créneaux legacy: %s",
                exc,
            )
    else:
        logging.warning("⚠️  MongoDB non disponible - certaines fonctionnalités seront limitées")
        logging.warning("   Pour utiliser l'application complètement :")
        logging.warning("   1. Installez MongoDB localement, OU")
        logging.warning("   2. Utilisez MongoDB Atlas (gratuit) : https://www.mongodb.com/cloud/atlas")
        logging.warning("   3. Configurez MONGO_URL dans votre fichier .env")


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()
        logging.info("✅ Connexion MongoDB fermée")
