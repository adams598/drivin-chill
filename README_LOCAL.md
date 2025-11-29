# 🚀 Démarrage Local du Projet

## Prérequis

- Python 3.11+
- Node.js 18+ et npm/yarn
- MongoDB (local ou MongoDB Atlas)

## Installation

### 1. Backend

```bash
cd backend

# Créer un environnement virtuel (recommandé)
python -m venv venv

# Activer l'environnement virtuel
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Copier le fichier .env.example vers .env
copy .env.example .env  # Windows
# ou
cp .env.example .env    # Linux/Mac

# Éditer .env et remplir les variables (au minimum MONGO_URL et DB_NAME)
```

### 2. Frontend

```bash
cd frontend

# Installer les dépendances
npm install
# ou
yarn install

# Copier le fichier .env.example vers .env
copy .env.example .env  # Windows
# ou
cp .env.example .env    # Linux/Mac

# Éditer .env et définir REACT_APP_BACKEND_URL=http://localhost:8000
```

## Démarrage

### Terminal 1 - Backend

```bash
cd backend

# Activer l'environnement virtuel si nécessaire
venv\Scripts\activate  # Windows
# ou
source venv/bin/activate  # Linux/Mac

# Démarrer le serveur
python start_local.py
# ou directement:
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Le backend sera accessible sur : http://localhost:8000
Documentation API : http://localhost:8000/docs

### Terminal 2 - Frontend

```bash
cd frontend

# Démarrer le serveur de développement
npm start
# ou
yarn start
```

Le frontend sera accessible sur : http://localhost:3000

## Configuration Minimale

### Backend (.env)

Au minimum, vous devez configurer :

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=drivinnchill
ADMIN_TOKEN=admin_token_2024
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

## Accès

- **Site client** : http://localhost:3000
- **API Backend** : http://localhost:8000/api
- **Documentation API** : http://localhost:8000/docs
- **Admin** : http://localhost:3000 → Cliquez sur "Administration" dans le footer et entrez le mot de passe (défini dans ADMIN_TOKEN)

## Tests

### Tester l'API

```bash
# Vérifier que le backend fonctionne
curl http://localhost:8000/api/

# Vérifier les films
curl http://localhost:8000/api/movies

# Vérifier les films populaires
curl http://localhost:8000/api/popular-movies
```

### Tester le Frontend

1. Ouvrez http://localhost:3000
2. Testez la réservation
3. Testez l'interface admin (mot de passe dans ADMIN_TOKEN)

## Problèmes Courants

### Erreur "MONGO_URL not found"
- Vérifiez que le fichier `.env` existe dans `backend/`
- Vérifiez que les variables sont bien définies

### Erreur CORS
- Vérifiez que `CORS_ORIGINS` dans le backend contient `http://localhost:3000`
- Vérifiez que `REACT_APP_BACKEND_URL` dans le frontend est `http://localhost:8000`

### Le frontend ne se connecte pas au backend
- Vérifiez que le backend est bien démarré sur le port 8000
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que `REACT_APP_BACKEND_URL` est bien défini dans `.env`

### MongoDB ne fonctionne pas
- Si vous utilisez MongoDB local, assurez-vous qu'il est démarré
- Si vous utilisez MongoDB Atlas, vérifiez votre URL de connexion
- Vérifiez que le nom de la base de données est correct

