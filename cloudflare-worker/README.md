# Cloudflare Worker - Proxy d'images Canva

Ce worker permet de convertir automatiquement les URLs Canva en URLs d'images directes.

## 🚀 Déploiement rapide

### 1. Installer Wrangler (CLI Cloudflare)

```bash
npm install -g wrangler
```

### 2. Se connecter à Cloudflare

```bash
wrangler login
```

### 3. Déployer le worker

```bash
cd cloudflare-worker
wrangler deploy
```

### 4. Obtenir l'URL du worker

Après le déploiement, vous obtiendrez une URL comme :
`https://canva-image-proxy.votre-subdomain.workers.dev`

### 5. Configurer dans le frontend

Mettez à jour votre fichier `frontend/.env` :

```env
REACT_APP_CANVA_PROXY_URL=https://canva-image-proxy.votre-subdomain.workers.dev
```

## 📖 Usage

Une fois configuré, vous pouvez simplement coller une URL Canva dans le formulaire :

```
https://www.canva.com/design/DAG6HlIb8R4/FTCEBY6ddaQCBxO3dtw06Q/view?...
```

Le système la convertira automatiquement en image via le proxy !

## ✨ Fonctionnalités

- ✅ Conversion automatique des URLs Canva
- ✅ Pas besoin de télécharger manuellement
- ✅ Pas besoin de service d'hébergement externe
- ✅ Cache automatique par Cloudflare
- ✅ Gratuit jusqu'à 100 000 requêtes/jour

## ⚙️ Comment ça marche ?

1. L'utilisateur colle une URL Canva dans le formulaire
2. Le frontend détecte que c'est une URL Canva
3. Le frontend appelle le Cloudflare Worker avec l'URL Canva
4. Le Worker récupère la page Canva et extrait l'URL de l'image
5. Le Worker redirige vers l'image directe
6. L'image s'affiche dans React !

## 🔧 Test manuel

Vous pouvez tester le worker directement :

```bash
curl "https://votre-worker.workers.dev/?url=https://www.canva.com/design/DAG6HlIb8R4/..."
```

Cela devrait vous rediriger vers l'URL de l'image directe.

## 📝 Notes

- Le worker est gratuit jusqu'à 100 000 requêtes/jour
- Les images sont mises en cache par Cloudflare (améliore les performances)
- Fonctionne uniquement pour les designs Canva publics
- Si un design est privé, le worker ne pourra pas y accéder
