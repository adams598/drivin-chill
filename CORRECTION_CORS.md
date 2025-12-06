# 🔧 Correction du Problème CORS

## 🐛 Problème Actuel

Votre frontend (`https://drivin-chill-front.vercel.app`) ne peut pas accéder au backend (`https://drivin-chill.vercel.app`) à cause d'une erreur CORS.

**Erreur** :
```
Access to XMLHttpRequest at 'https://drivin-chill.vercel.app//api/weekly-schedule' 
from origin 'https://drivin-chill-front.vercel.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## ✅ Solution : Mettre à jour CORS_ORIGINS dans Vercel

### Étape 1 : Aller dans les paramètres du backend Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet **backend** (`drivin-chill`)
3. Allez dans **Settings** > **Environment Variables**

### Étape 2 : Mettre à jour la variable CORS_ORIGINS

1. Cherchez la variable `CORS_ORIGINS`
2. Si elle existe, **modifiez-la**
3. Si elle n'existe pas, **ajoutez-la**

**Valeur à mettre** :
```
https://drivin-chill-front.vercel.app,https://drivin-chill-frontend.vercel.app
```

> ⚠️ **Important** : 
> - Remplacez `drivin-chill-front.vercel.app` par l'URL exacte de votre frontend Vercel
> - Si vous avez un domaine personnalisé, ajoutez-le aussi : `https://votre-domaine.fr,https://www.votre-domaine.fr`
> - Séparez les URLs par des **virgules** (sans espaces ou avec espaces, les deux fonctionnent)

**Exemple complet** (si vous avez un domaine personnalisé) :
```
https://drivin-chill-front.vercel.app,https://drivin-chill-frontend.vercel.app,https://votre-domaine.fr,https://www.votre-domaine.fr
```

### Étape 3 : Redéployer le backend

Après avoir modifié la variable d'environnement :

1. Allez dans **Deployments**
2. Cliquez sur **"..."** sur le dernier déploiement
3. Sélectionnez **"Redeploy"**
4. Attendez que le déploiement se termine (2-3 minutes)

### Étape 4 : Vérifier

1. Rechargez votre frontend
2. Vérifiez la console du navigateur (F12)
3. Les erreurs CORS devraient avoir disparu

---

## 🔍 Vérification de la Configuration

### Dans le Backend (Vercel)

Vérifiez que `CORS_ORIGINS` contient bien l'URL de votre frontend :
- ✅ `https://drivin-chill-front.vercel.app` (ou votre URL frontend)
- ✅ `https://votre-domaine.fr` (si vous avez un domaine personnalisé)

### Dans le Frontend (Vercel)

Vérifiez que `REACT_APP_BACKEND_URL` est correctement configuré :
- ✅ `https://drivin-chill.vercel.app` (sans slash à la fin)
- ✅ Ou `https://api.votre-domaine.fr` (si vous avez un sous-domaine API)

---

## 🐛 Problème du Double Slash

J'ai corrigé le problème du double slash (`//api/`) dans `frontend/src/App.js`. 

Si vous avez d'autres fichiers qui utilisent le même pattern, assurez-vous que `REACT_APP_BACKEND_URL` n'a **pas de slash à la fin** dans les variables d'environnement Vercel.

**Dans Vercel (Frontend)** :
- ✅ Correct : `https://drivin-chill.vercel.app`
- ❌ Incorrect : `https://drivin-chill.vercel.app/`

---

## 📝 Checklist

- [ ] Variable `CORS_ORIGINS` ajoutée/modifiée dans le backend Vercel
- [ ] URL du frontend incluse dans `CORS_ORIGINS`
- [ ] Backend redéployé après modification
- [ ] `REACT_APP_BACKEND_URL` vérifié dans le frontend (sans slash final)
- [ ] Frontend redéployé si nécessaire
- [ ] Erreurs CORS disparues dans la console

---

## 🆘 Si ça ne fonctionne toujours pas

1. **Vérifiez les logs du backend** dans Vercel > Deployments > Logs
2. **Vérifiez que le backend répond** : `https://drivin-chill.vercel.app/api/time-slots`
3. **Vérifiez la console du navigateur** pour d'autres erreurs
4. **Attendez 2-3 minutes** après le redéploiement pour que les changements prennent effet

---

## 💡 Astuce

Pour le développement local, vous pouvez aussi ajouter `http://localhost:3000` dans `CORS_ORIGINS` :

```
https://drivin-chill-front.vercel.app,https://votre-domaine.fr,http://localhost:3000
```


















