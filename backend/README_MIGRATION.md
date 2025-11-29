# Migration de la Base de Données MongoDB

Ce script initialise complètement votre base de données MongoDB avec toutes les collections, index, contraintes et données par défaut nécessaires pour l'application Drivinnchill.

## 📋 Prérequis

1. **Fichier `.env` configuré** dans le dossier `backend/` avec :
   ```env
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?appName=...
   DB_NAME=nom_de_votre_base
   ```

2. **Python 3.8+** installé

3. **Dépendances Python** installées :
   ```bash
   pip install -r requirements.txt
   ```

## 🚀 Utilisation

### Sur Windows :
```bash
cd backend
migrate_database.bat
```

### Sur Linux/Mac ou manuellement :
```bash
cd backend
python migrate_database.py
```

## 📊 Ce que fait le script

Le script de migration crée **10 collections** avec leurs index et contraintes :

### 1. **movies** (Films)
- Index unique sur `id`
- Index sur `is_active`, `genre`, `age_rating`
- Index de recherche textuelle sur `title`
- Index sur `created_at` pour le tri

### 2. **events** (Événements)
- Index unique sur `id`
- Index sur `is_active`, `event_type`
- Index de recherche textuelle sur `title`
- Index sur `created_at`

### 3. **bookings** (Réservations)
- Index unique sur `id`
- Index sur `email`, `booking_date`, `time_slot`, `status`, `payment_status`
- Index sur `is_cancelled`, `payment_session_id`
- Index composés pour optimiser les requêtes fréquentes

### 4. **content_schedules** (Programmation de contenu)
- Index unique sur `id`
- Index sur `content_id`, `content_type`, `date`, `time_slot`
- **Index unique** pour éviter les conflits de programmation
- Index composés pour les recherches par date et type

### 5. **movie_schedules** (Programmation de films - Legacy)
- Index unique sur `id`
- Index sur `movie_id`, `date`, `time_slot`, `is_active`
- Index composé pour les recherches

### 6. **promo_codes** (Codes promo)
- Index unique sur `id` et `code`
- Index sur `is_active`, `type`, `expiration_date`
- Index sur `created_at`

### 7. **payment_transactions** (Transactions de paiement)
- Index unique sur `id` et `session_id`
- Index sur `booking_id`, `status`, `payment_status`
- Index sur `created_at`

### 8. **partner_contacts** (Contacts partenaires)
- Index unique sur `id`
- Index sur `email`, `company_name`
- Index sur `created_at`

### 9. **movie_suggestions** (Suggestions de films)
- Index unique sur `id`
- Index sur `status`, `email`
- Index de recherche textuelle sur `movie_title`
- Index sur `created_at`

### 10. **time_slot_settings** (Paramètres des créneaux)
- Index unique sur `id`
- Index sur `is_active`
- **Données par défaut** créées automatiquement si elles n'existent pas

## 🔒 Contraintes et Relations

### Contraintes d'unicité :
- `movies.id` : unique
- `events.id` : unique
- `bookings.id` : unique
- `promo_codes.code` : unique (un code promo ne peut pas être dupliqué)
- `payment_transactions.session_id` : unique
- `content_schedules` : index unique sur `(date, time_slot, is_active)` pour éviter les conflits de programmation

### Relations (références) :
- `bookings` → référence `content_schedules` ou `movie_schedules` via `booking_date` et `time_slot`
- `content_schedules` → référence `movies` ou `events` via `content_id` et `content_type`
- `movie_schedules` → référence `movies` via `movie_id`
- `payment_transactions` → référence `bookings` via `booking_id`

## ⚠️ Notes importantes

1. **Le script est idempotent** : vous pouvez l'exécuter plusieurs fois sans problème. Il ne supprime pas les données existantes.

2. **Les données par défaut** (`time_slot_settings`) ne sont créées que si elles n'existent pas déjà.

3. **Les index uniques** empêchent la création de doublons (ex: deux films avec le même ID, deux codes promo identiques).

4. **Les index composés** optimisent les requêtes fréquentes comme "trouver toutes les réservations pour une date et un créneau".

## 🔍 Vérification

Après l'exécution, le script affiche un résumé avec le nombre de documents dans chaque collection. Vous pouvez également vérifier dans MongoDB Atlas ou Compass.

## 🐛 Dépannage

### Erreur de connexion
- Vérifiez que `MONGO_URL` et `DB_NAME` sont correctement définis dans `.env`
- Vérifiez que votre IP est autorisée dans MongoDB Atlas (Network Access)
- Vérifiez que le mot de passe dans l'URL est correctement encodé (ex: `@` devient `%40`)

### Erreur "collection already exists"
- C'est normal, MongoDB crée les collections automatiquement. Le script continue.

### Erreur "index already exists"
- C'est normal si vous exécutez le script plusieurs fois. Les index existants sont ignorés.

## 📝 Logs

Le script affiche des logs détaillés pour chaque étape :
- ✅ Succès
- ⚠️  Avertissement
- ❌ Erreur

Consultez les logs pour diagnostiquer tout problème.

