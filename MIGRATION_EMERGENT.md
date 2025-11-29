# Migration d'Emergent vers Backend Autonome

## Résumé des changements

Ce document décrit les modifications effectuées pour supprimer toutes les dépendances à Emergent et reconstruire le backend avec l'API Stripe standard.

## Modifications effectuées

### 1. Backend (`backend/`)

#### `requirements.txt`
- ❌ Supprimé : `emergentintegrations>=0.1.0`
- ✅ Ajouté : `stripe>=7.0.0`

#### `server.py`
- ❌ Supprimé : Import `emergentintegrations.payments.stripe.checkout`
- ✅ Ajouté : Import `stripe` (API Stripe standard)
- ✅ Remplacé : `StripeCheckout` par l'API Stripe standard
- ✅ Modifié : Fonction `create_payment_checkout` pour utiliser `stripe.checkout.Session.create()`
- ✅ Modifié : Fonction `get_payment_status` pour utiliser `stripe.checkout.Session.retrieve()`
- ✅ Modifié : Fonction `stripe_webhook` pour utiliser `stripe.Webhook.construct_event()`

### 2. Frontend (`frontend/`)

#### `public/index.html`
- ❌ Supprimé : Badge Emergent (lignes 46-92)

#### `src/components/LegalPages.js`
- ✅ Modifié : Référence à l'hébergeur (remplacé "Emergent Agent Services" par "À définir")

#### `src/App.js`
- ✅ Modifié : URLs d'assets Emergent remplacées par des chemins locaux :
  - `LOGO_URL` : `/logo.png`
  - Logo Halloween Drivin N Chill : `/logo-halloween-drivinnchill.png`
  - Logo Limoges Ma Ville : `/logo-limogesmaville.png`

## Variables d'environnement requises

### Backend (`.env` dans `backend/`)

```env
# MongoDB
MONGO_URL=mongodb://...
DB_NAME=drivinnchill

# Stripe (remplace STRIPE_API_KEY d'Emergent)
STRIPE_SECRET_KEY=sk_test_...  # ou STRIPE_API_KEY pour compatibilité
STRIPE_WEBHOOK_SECRET=whsec_...  # Secret pour vérifier les webhooks Stripe

# Email (optionnel)
EMAIL_USERNAME=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Admin
ADMIN_TOKEN=admin_token_2024  # Token pour l'accès admin
```

### Frontend (`.env` dans `frontend/`)

```env
REACT_APP_BACKEND_URL=http://localhost:8000  # URL du backend
```

## Configuration Stripe

### 1. Obtenir les clés API Stripe

1. Créez un compte sur [Stripe](https://stripe.com)
2. Accédez au [Tableau de bord Stripe](https://dashboard.stripe.com)
3. Récupérez votre **Secret Key** (clé secrète) dans "Developers" > "API keys"
4. Pour les webhooks, configurez l'endpoint dans "Developers" > "Webhooks"

### 2. Configuration des webhooks

1. Dans le tableau de bord Stripe, allez dans "Developers" > "Webhooks"
2. Ajoutez un endpoint : `https://votre-domaine.com/api/webhook/stripe`
3. Sélectionnez l'événement : `checkout.session.completed`
4. Copiez le **Signing secret** et ajoutez-le à `STRIPE_WEBHOOK_SECRET`

### 3. Test en mode développement

- Utilisez les clés de test (commençant par `sk_test_`)
- Les webhooks locaux peuvent être testés avec [Stripe CLI](https://stripe.com/docs/stripe-cli)

## Assets à ajouter

Les images suivantes doivent être ajoutées dans le dossier `frontend/public/` :

- `logo.png` - Logo principal de Drivin And Chill
- `logo-halloween-drivinnchill.png` - Logo Halloween (optionnel)
- `logo-limogesmaville.png` - Logo partenaire (optionnel)

## Différences avec l'implémentation Emergent

### Avant (Emergent)
```python
from emergentintegrations.payments.stripe.checkout import StripeCheckout

stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
session = await stripe_checkout.create_checkout_session(checkout_request)
```

### Après (Stripe standard)
```python
import stripe

stripe.api_key = stripe_api_key
checkout_session = stripe.checkout.Session.create(
    payment_method_types=['card'],
    line_items=[{...}],
    mode='payment',
    success_url=success_url,
    cancel_url=cancel_url,
    metadata={...}
)
```

## Tests à effectuer

1. ✅ Création d'une réservation
2. ✅ Création d'une session de paiement Stripe
3. ✅ Vérification du statut de paiement
4. ✅ Réception et traitement des webhooks Stripe
5. ✅ Envoi d'emails de confirmation
6. ✅ Réservations gratuites (codes promo 100%)

## Notes importantes

- Le code gère toujours les réservations gratuites (0€) sans passer par Stripe
- Les webhooks Stripe sont optionnels mais recommandés pour une meilleure fiabilité
- Si `STRIPE_WEBHOOK_SECRET` n'est pas défini, la vérification de signature est désactivée (non recommandé en production)
- Les URLs d'assets doivent être mises à jour avec vos propres images

## Prochaines étapes

1. Ajouter les images dans `frontend/public/`
2. Configurer les variables d'environnement
3. Tester les paiements en mode test Stripe
4. Configurer les webhooks en production
5. Mettre à jour l'hébergeur dans les mentions légales

