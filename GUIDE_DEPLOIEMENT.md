# 🚀 Guide de Déploiement - Drivinnchill

## 📚 Documentation Disponible

1. **`DEPLOIEMENT_COMPLET.md`** - Guide détaillé complet (recommandé pour la première fois)
2. **`DEPLOIEMENT_RAPIDE.md`** - Checklist rapide pour déploiement express
3. **`CONFIGURATION_DNS_HOSTINGER.md`** - Configuration DNS spécifique

## 🎯 Résumé Rapide

### Backend → Vercel
1. Créer un projet Vercel
2. Root Directory : `backend`
3. Configurer les variables d'environnement
4. Déployer

### Frontend → Netlify ou Vercel
1. Créer un projet Netlify/Vercel
2. Root Directory : `frontend`
3. Configurer `REACT_APP_BACKEND_URL`
4. Déployer

### DNS → Hostinger
1. Ajouter les enregistrements DNS pour `api.drivinnchill.fr` (backend)
2. Ajouter les enregistrements DNS pour `drivinnchill.fr` (frontend)

## ⚡ Démarrage Rapide

### 1. Backend (5 minutes)

```bash
# Via CLI
cd backend
vercel login
vercel
```

Ou via l'interface web : https://vercel.com

**Variables d'environnement à configurer :**
- `MONGO_URL` (avec `@` encodé en `%40`)
- `DB_NAME`
- `ADMIN_TOKEN`
- `CORS_ORIGINS`
- `STRIPE_API_KEY` (optionnel)
- `STRIPE_WEBHOOK_SECRET` (optionnel)

### 2. Frontend (5 minutes)

**Sur Netlify :**
1. Aller sur https://www.netlify.com
2. Importer le repository
3. Base directory : `frontend`
4. Build command : `npm run build`
5. Variable : `REACT_APP_BACKEND_URL`

**Sur Vercel :**
1. Créer un nouveau projet
2. Root Directory : `frontend`
3. Framework : Create React App
4. Variable : `REACT_APP_BACKEND_URL`

### 3. DNS (10 minutes)

Dans Hostinger, ajouter :
- CNAME `api` → `cname.vercel-dns.com` (pour le backend)
- A `@` → IP fournie par Netlify/Vercel (pour le frontend)
- CNAME `www` → valeur fournie par Netlify/Vercel

## 📝 Checklist Complète

Voir `DEPLOIEMENT_RAPIDE.md` pour la checklist détaillée.

## 🆘 Besoin d'Aide ?

1. Consultez `DEPLOIEMENT_COMPLET.md` pour les détails
2. Vérifiez les logs dans Vercel/Netlify
3. Vérifiez la console du navigateur (F12)

