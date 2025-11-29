# ⚡ Déploiement Rapide - Checklist

## 🎯 Objectif
Déployer le backend et le frontend en production en 30 minutes.

---

## 📦 BACKEND (Vercel)

### 1. Déployer sur Vercel
- [ ] Aller sur https://vercel.com
- [ ] Cliquer sur "Add New Project"
- [ ] Importer le repository GitHub/GitLab
- [ ] Configurer :
  - Root Directory : `backend`
  - Framework : Other
- [ ] Cliquer sur "Deploy"

### 2. Variables d'Environnement (Vercel > Settings > Environment Variables)
- [ ] `MONGO_URL` (avec mot de passe encodé : `@` → `%40`)
- [ ] `DB_NAME`
- [ ] `ADMIN_TOKEN`
- [ ] `CORS_ORIGINS` (URLs du frontend)
- [ ] `STRIPE_API_KEY` (si paiements activés)
- [ ] `STRIPE_WEBHOOK_SECRET` (si paiements activés)

### 3. Noter l'URL du backend
- [ ] URL Vercel : `https://votre-projet.vercel.app`
- [ ] Ou configurer `api.drivinnchill.fr` (voir section DNS)

---

## 🎨 FRONTEND (Netlify ou Vercel)

### Option A : Netlify

- [ ] Aller sur https://www.netlify.com
- [ ] Cliquer sur "Add new site" > "Import an existing project"
- [ ] Importer le repository
- [ ] Configurer :
  - Base directory : `frontend`
  - Build command : `npm run build`
  - Publish directory : `frontend/build`
- [ ] Ajouter variable d'environnement :
  - `REACT_APP_BACKEND_URL` = URL du backend Vercel

### Option B : Vercel

- [ ] Aller sur https://vercel.com
- [ ] Créer un nouveau projet
- [ ] Root Directory : `frontend`
- [ ] Framework : Create React App
- [ ] Ajouter variable d'environnement :
  - `REACT_APP_BACKEND_URL` = URL du backend Vercel

---

## 🌐 DNS (Hostinger)

### Pour le Backend (api.drivinnchill.fr)

- [ ] Aller dans Hostinger > Domaines > Gestion DNS
- [ ] Ajouter CNAME :
  ```
  Type: CNAME
  Name: api
  Value: cname.vercel-dns.com
  ```
- [ ] Dans Vercel (backend), ajouter le domaine `api.drivinnchill.fr`

### Pour le Frontend (drivinnchill.fr)

**Si Netlify :**
- [ ] Dans Netlify, ajouter `drivinnchill.fr` et `www.drivinnchill.fr`
- [ ] Ajouter les enregistrements DNS dans Hostinger (donnés par Netlify)

**Si Vercel :**
- [ ] Dans Vercel (frontend), ajouter `drivinnchill.fr` et `www.drivinnchill.fr`
- [ ] Ajouter les enregistrements DNS dans Hostinger (donnés par Vercel)

---

## ✅ Tests

- [ ] Backend accessible : `https://api.drivinnchill.fr/docs`
- [ ] Frontend accessible : `https://drivinnchill.fr`
- [ ] API fonctionne (tester une requête)
- [ ] Frontend peut appeler l'API (vérifier la console navigateur)
- [ ] Créer une réservation de test

---

## 🔧 Variables d'Environnement Finales

### Backend (Vercel)
```env
MONGO_URL=mongodb+srv://user:password%40@cluster.mongodb.net/
DB_NAME=db-drivin-chill
ADMIN_TOKEN=votre_token
CORS_ORIGINS=https://drivinnchill.fr,https://www.drivinnchill.fr
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend (Netlify/Vercel)
```env
REACT_APP_BACKEND_URL=https://api.drivinnchill.fr
```

---

## ⚠️ Points d'Attention

1. **Encodage du mot de passe MongoDB** : `@` doit être `%40` dans `MONGO_URL`
2. **CORS** : L'URL du frontend doit être dans `CORS_ORIGINS`
3. **DNS** : Les modifications DNS peuvent prendre jusqu'à 48h (généralement quelques minutes)
4. **Variables d'environnement** : Redéployez après chaque modification

---

## 🆘 Problèmes Courants

| Problème | Solution |
|----------|----------|
| Erreur CORS | Vérifier `CORS_ORIGINS` inclut l'URL du frontend |
| MongoDB timeout | Vérifier que l'IP de Vercel est autorisée dans MongoDB Atlas |
| 404 sur les routes | Vérifier `vercel.json` et `netlify.toml` |
| Variables non chargées | Redéployer après modification des variables |

---

**Temps estimé : 30-45 minutes**

