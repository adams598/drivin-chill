# 🚀 Guide de Déploiement Complet - Drivinnchill

Ce guide explique comment déployer le backend et le frontend en production.

## 📋 Vue d'ensemble

- **Backend** : Déployé sur Vercel (FastAPI)
- **Frontend** : Déployé sur Netlify ou Vercel (React)
- **Base de données** : MongoDB Atlas (déjà configurée)
- **Domaine** : `drivinnchill.fr` (Hostinger)

---

## 🔧 PARTIE 1 : Déploiement du Backend sur Vercel

### Étape 1 : Préparer le projet

Le fichier `backend/vercel.json` est déjà configuré.

### Étape 2 : Créer un compte Vercel

1. Allez sur https://vercel.com
2. Créez un compte (gratuit) ou connectez-vous
3. Installez Vercel CLI (optionnel) :
   ```bash
   npm i -g vercel
   ```

### Étape 3 : Déployer le backend

#### Option A : Via l'interface web Vercel (Recommandé)

1. Allez sur https://vercel.com/dashboard
2. Cliquez sur **"Add New Project"**
3. Si votre code est sur GitHub/GitLab :
   - Importez votre repository
   - Configurez le projet :
     - **Root Directory** : `backend`
     - **Framework Preset** : Other
     - **Build Command** : (laisser vide)
     - **Output Directory** : (laisser vide)
     - **Install Command** : `pip install -r requirements.txt`
4. Cliquez sur **"Deploy"**

#### Option B : Via CLI

```bash
cd backend
vercel login
vercel
```

### Étape 4 : Configurer les Variables d'Environnement

Dans le dashboard Vercel, allez dans votre projet > **Settings** > **Environment Variables** et ajoutez :

#### Variables Obligatoires

```env
MONGO_URL=mongodb+srv://db-drivin-chill:Adams01%40@drivincluster.qaco1at.mongodb.net/?appName=drivincluster
DB_NAME=db-drivin-chill
ADMIN_TOKEN=votre_token_secret_admin
CORS_ORIGINS=https://drivinnchill.fr,https://www.drivinnchill.fr,https://votre-frontend.netlify.app
```

> ⚠️ **Important** : Dans `MONGO_URL`, encodez les caractères spéciaux :
> - `@` devient `%40`
> - `:` devient `%3A`
> - `/` devient `%2F`

#### Variables Stripe (Obligatoires pour les paiements)

```env
STRIPE_API_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

> 💡 Pour les tests, utilisez les clés de test (`sk_test_...`)

#### Variables Email (Optionnel - choisissez UNE option)

**Option 1 : SMTP Gmail**
```env
EMAIL_USERNAME=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_FROM=noreply@drivinnchill.fr
```

**Option 2 : SendGrid (Recommandé pour production)**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@drivinnchill.fr
```

### Étape 5 : Obtenir l'URL du backend

Après le déploiement, Vercel vous donnera une URL comme :
```
https://votre-projet.vercel.app
```

**Notez cette URL** - vous en aurez besoin pour le frontend.

---

## 🎨 PARTIE 2 : Déploiement du Frontend

### Option A : Déploiement sur Netlify (Recommandé)

#### Étape 1 : Créer un compte Netlify

1. Allez sur https://www.netlify.com
2. Créez un compte (gratuit) ou connectez-vous

#### Étape 2 : Créer le fichier de configuration

Créez `netlify.toml` à la racine du projet (voir section suivante).

#### Étape 3 : Déployer

1. Allez sur https://app.netlify.com
2. Cliquez sur **"Add new site"** > **"Import an existing project"**
3. Si votre code est sur GitHub/GitLab :
   - Importez votre repository
   - Configurez :
     - **Base directory** : `frontend`
     - **Build command** : `npm run build`
     - **Publish directory** : `frontend/build`
4. Cliquez sur **"Deploy site"**

#### Étape 4 : Configurer les Variables d'Environnement

Dans Netlify, allez dans **Site settings** > **Environment variables** :

```env
REACT_APP_BACKEND_URL=https://votre-backend.vercel.app
```

> Remplacez `votre-backend.vercel.app` par l'URL réelle de votre backend Vercel.

### Option B : Déploiement sur Vercel

#### Étape 1 : Créer un nouveau projet Vercel

1. Allez sur https://vercel.com/dashboard
2. Cliquez sur **"Add New Project"**
3. Importez votre repository
4. Configurez :
   - **Root Directory** : `frontend`
   - **Framework Preset** : Create React App
   - **Build Command** : `npm run build`
   - **Output Directory** : `build`

#### Étape 2 : Configurer les Variables d'Environnement

Dans Vercel, allez dans **Settings** > **Environment Variables** :

```env
REACT_APP_BACKEND_URL=https://votre-backend.vercel.app
```

---

## 🌐 PARTIE 3 : Configuration du Domaine drivinnchill.fr

### Configuration DNS dans Hostinger

> ⚠️ **IMPORTANT** : Ces modifications n'affecteront QUE le domaine `drivinnchill.fr`. Vos autres domaines ne seront pas touchés.

#### Pour le Backend (API)

Dans Hostinger, ajoutez un sous-domaine pour l'API :

1. Allez dans **Domaines** > **Gestion DNS**
2. Sélectionnez `drivinnchill.fr`
3. Ajoutez un enregistrement CNAME :
   ```
   Type: CNAME
   Name: api
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

   Cela créera `api.drivinnchill.fr` qui pointera vers votre backend Vercel.

4. Dans Vercel (backend), allez dans **Settings** > **Domains**
5. Ajoutez `api.drivinnchill.fr`
6. Vercel vous donnera un enregistrement CNAME à ajouter dans Hostinger (si nécessaire)

#### Pour le Frontend

**Si vous utilisez Netlify :**

1. Dans Netlify, allez dans **Domain settings** > **Custom domains**
2. Ajoutez `drivinnchill.fr` et `www.drivinnchill.fr`
3. Netlify vous donnera des enregistrements DNS à ajouter dans Hostinger :
   ```
   Type: A
   Name: @
   Value: 75.2.60.5
   TTL: 3600
   
   Type: CNAME
   Name: www
   Value: votre-site.netlify.app
   TTL: 3600
   ```

**Si vous utilisez Vercel :**

1. Dans Vercel (frontend), allez dans **Settings** > **Domains**
2. Ajoutez `drivinnchill.fr` et `www.drivinnchill.fr`
3. Vercel vous donnera des enregistrements DNS à ajouter dans Hostinger :
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 3600
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

### Mise à jour des Variables d'Environnement

Après avoir configuré les domaines, mettez à jour :

**Backend (Vercel) :**
```env
CORS_ORIGINS=https://drivinnchill.fr,https://www.drivinnchill.fr,https://api.drivinnchill.fr
```

**Frontend (Netlify/Vercel) :**
```env
REACT_APP_BACKEND_URL=https://api.drivinnchill.fr
```

---

## ✅ Vérification du Déploiement

### Backend

1. Testez l'API : `https://api.drivinnchill.fr/api/time-slots`
2. Documentation : `https://api.drivinnchill.fr/docs`
3. Vérifiez les logs dans Vercel pour voir si MongoDB se connecte correctement

### Frontend

1. Testez le site : `https://drivinnchill.fr`
2. Vérifiez que les appels API fonctionnent (ouvrez la console du navigateur)
3. Testez la création de réservation

---

## 🔄 Déploiements Automatiques

### Avec GitHub/GitLab

Si votre code est sur GitHub/GitLab :
- **Vercel** : Déploie automatiquement à chaque push sur `main`/`master`
- **Netlify** : Déploie automatiquement à chaque push sur `main`/`master`

### Déploiement Manuel

Pour forcer un nouveau déploiement :
- **Vercel** : Allez dans le dashboard > **Deployments** > **Redeploy**
- **Netlify** : Allez dans le dashboard > **Deploys** > **Trigger deploy**

---

## 🐛 Dépannage

### Backend ne se connecte pas à MongoDB

1. Vérifiez que `MONGO_URL` est correctement encodé dans Vercel
2. Vérifiez que votre IP est autorisée dans MongoDB Atlas (Network Access)
3. Vérifiez les logs Vercel : **Deployments** > Cliquez sur un déploiement > **Logs**

### Frontend ne peut pas joindre le backend

1. Vérifiez `REACT_APP_BACKEND_URL` dans Netlify/Vercel
2. Vérifiez `CORS_ORIGINS` dans le backend (doit inclure l'URL du frontend)
3. Ouvrez la console du navigateur pour voir les erreurs CORS

### Erreurs 404 sur les routes

1. Vérifiez que `vercel.json` est correctement configuré
2. Pour Netlify, vérifiez que `netlify.toml` est présent
3. Vérifiez que les routes sont bien configurées

---

## 📝 Checklist de Déploiement

- [ ] Backend déployé sur Vercel
- [ ] Variables d'environnement backend configurées
- [ ] Frontend déployé sur Netlify/Vercel
- [ ] Variables d'environnement frontend configurées
- [ ] Domaines configurés dans Hostinger
- [ ] Domaines ajoutés dans Vercel/Netlify
- [ ] CORS configuré correctement
- [ ] MongoDB accessible depuis Vercel
- [ ] Tests de l'API réussis
- [ ] Tests du frontend réussis
- [ ] Réservations fonctionnelles

---

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans Vercel/Netlify
2. Vérifiez la console du navigateur (F12)
3. Vérifiez que toutes les variables d'environnement sont correctement configurées

