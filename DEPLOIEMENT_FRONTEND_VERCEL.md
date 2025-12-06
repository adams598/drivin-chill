# 🎨 Guide de Déploiement Frontend sur Vercel avec Domaine OVH

## 🎯 Pourquoi Vercel pour le Frontend ?

- ✅ **Même plateforme que le backend** - tout au même endroit
- ✅ **Gratuit** pour usage personnel/professionnel
- ✅ **Optimisé pour React** - détection automatique
- ✅ **Déploiements automatiques** depuis GitHub
- ✅ **CDN global Edge Network** - performances exceptionnelles
- ✅ **SSL automatique** (HTTPS gratuit)
- ✅ **Configuration DNS simple** avec OVH
- ✅ **Interface unifiée** avec votre backend

## 📋 Prérequis

1. Compte Vercel (gratuit) : https://vercel.com
2. Compte GitHub avec votre code poussé
3. Domaine chez OVH (déjà configuré)
4. Backend déjà déployé sur Vercel

---

## 🚀 Étape 1 : Déployer le Frontend sur Vercel

### 1.1 Créer un nouveau projet

1. Allez sur https://vercel.com/dashboard
2. Cliquez sur **"Add New Project"**
3. Importez votre repository GitHub `drivin-chill`
4. Si vous avez déjà un projet backend, créez un **nouveau projet** pour le frontend

### 1.2 Configurer les paramètres de build

Dans la section **"Configure Project"**, configurez :

- **Project Name** : `drivin-chill-frontend` (ou le nom de votre choix)
- **Root Directory** : `frontend` ⚠️ **IMPORTANT**
- **Framework Preset** : `Create React App` (ou `Other` si non détecté)
- **Build Command** : `npm run build` (Override activé)
- **Output Directory** : `build` (Override activé)
- **Install Command** : `npm install` (ou `yarn install` si vous utilisez Yarn)

> ⚠️ **Important** : Assurez-vous que **Root Directory** est bien `frontend` et non la racine du projet.

### 1.3 Configurer les variables d'environnement

Avant de déployer, allez dans **Environment Variables** et ajoutez :

```env
REACT_APP_BACKEND_URL=https://votre-backend.vercel.app
```

> Remplacez `votre-backend.vercel.app` par :
> - L'URL de votre backend Vercel (ex: `https://drivin-chill-backend.vercel.app`)
> - Ou votre domaine API personnalisé (ex: `https://api.drivinnchill.fr`)

### 1.4 Déployer

1. Cliquez sur **"Deploy"**
2. Attendez que le déploiement se termine (2-5 minutes)
3. Votre site sera accessible sur `https://votre-projet.vercel.app`

---

## 🌐 Étape 2 : Configurer le Domaine OVH

### 2.1 Dans Vercel

1. Allez dans votre projet frontend > **Settings** > **Domains**
2. Cliquez sur **"Add"**
3. Entrez votre domaine : `votre-domaine.fr`
4. Cliquez sur **"Add"**
5. Vercel va vous donner des instructions DNS

### 2.2 Dans OVH

Vous avez **deux options** :

#### Option A : Configuration DNS simple (Recommandé)

Dans votre espace OVH, allez dans **Domaines** > **Zone DNS** :

1. **Pour le domaine principal** (`votre-domaine.fr`) :
   ```
   Type: A
   Sous-domaine: @
   Cible: 76.76.21.21
   TTL: 3600
   ```

2. **Pour le sous-domaine www** (`www.votre-domaine.fr`) :
   ```
   Type: CNAME
   Sous-domaine: www
   Cible: cname.vercel-dns.com
   TTL: 3600
   ```

> ⚠️ **Note** : L'IP `76.76.21.21` est l'IP de Vercel. Vérifiez dans Vercel si cette IP est toujours valide (elle peut changer).

#### Option B : Utiliser les serveurs DNS de Vercel (Plus simple)

1. Dans Vercel, allez dans **Settings** > **Domains**
2. Vercel vous donnera des serveurs DNS (ex: `ns1.vercel-dns.com`)
3. Dans OVH, allez dans **Domaines** > **Serveurs DNS**
4. Remplacez les serveurs DNS par ceux de Vercel
5. Vercel gérera automatiquement tous les enregistrements DNS

### 2.3 Vérifier la configuration DNS

1. Dans Vercel, attendez que le domaine soit vérifié (icône verte)
2. Si ce n'est pas le cas, vérifiez les enregistrements DNS dans OVH
3. Attendez 5-10 minutes pour la propagation DNS

### 2.4 Activer HTTPS

Vercel active automatiquement le SSL (HTTPS) une fois le domaine vérifié. Aucune action supplémentaire n'est nécessaire.

---

## ⚙️ Étape 3 : Configuration Avancée (Optionnel)

### 3.1 Mettre à jour les variables d'environnement

Après avoir configuré le domaine, mettez à jour `REACT_APP_BACKEND_URL` si nécessaire :

```env
REACT_APP_BACKEND_URL=https://api.votre-domaine.fr
```

Ou gardez l'URL Vercel du backend si vous n'avez pas de sous-domaine API.

### 3.2 Redéployer

Après avoir modifié les variables d'environnement :

1. Allez dans **Deployments**
2. Cliquez sur **"Redeploy"** sur le dernier déploiement
3. Ou faites un nouveau push sur GitHub

---

## ✅ Étape 4 : Vérification

### 4.1 Tester le site

1. Visitez `https://votre-domaine.fr`
2. Vérifiez que le site se charge correctement
3. Ouvrez la console du navigateur (F12) et vérifiez qu'il n'y a pas d'erreurs
4. Testez les appels API vers votre backend

### 4.2 Vérifier les variables d'environnement

Assurez-vous que `REACT_APP_BACKEND_URL` est correctement configuré et que votre frontend peut communiquer avec le backend.

### 4.3 Vérifier CORS

Dans votre backend Vercel, assurez-vous que `CORS_ORIGINS` inclut votre domaine frontend :

```env
CORS_ORIGINS=https://votre-domaine.fr,https://www.votre-domaine.fr
```

---

## 🔄 Déploiements Automatiques

Vercel déploie automatiquement à chaque push sur la branche `main` (ou `dev` si configuré) de votre repository GitHub.

### Configuration des branches

1. Allez dans **Settings** > **Git**
2. Configurez les branches de production (ex: `main`, `dev`)
3. Les autres branches créeront des **preview deployments**

### Forcer un nouveau déploiement

1. Allez dans **Deployments**
2. Cliquez sur **"..."** sur un déploiement
3. Sélectionnez **"Redeploy"**

---

## 🐛 Dépannage

### Le domaine ne fonctionne pas ?

1. Vérifiez les enregistrements DNS dans OVH
2. Attendez 24-48h pour la propagation DNS complète
3. Utilisez `nslookup votre-domaine.fr` pour vérifier les DNS
4. Dans Vercel, vérifiez que le domaine est bien vérifié (icône verte)

### Erreurs de build ?

1. Vérifiez les logs dans **Deployments** > Cliquez sur un déploiement > **Build Logs**
2. Assurez-vous que `package.json` contient le script `build`
3. Vérifiez que toutes les dépendances sont dans `package.json`
4. Vérifiez que **Root Directory** est bien `frontend`

### Le frontend ne peut pas joindre le backend ?

1. Vérifiez `REACT_APP_BACKEND_URL` dans les variables d'environnement
2. Vérifiez que `CORS_ORIGINS` dans le backend inclut votre domaine frontend
3. Vérifiez la console du navigateur pour les erreurs CORS
4. Redéployez le frontend après avoir modifié les variables d'environnement

### Le site affiche une page blanche ?

1. Vérifiez les logs de build dans Vercel
2. Vérifiez la console du navigateur pour les erreurs JavaScript
3. Assurez-vous que `REACT_APP_BACKEND_URL` est correctement défini
4. Vérifiez que le build s'est terminé sans erreur

---

## 📝 Checklist Complète

- [ ] Compte Vercel créé
- [ ] Nouveau projet créé pour le frontend
- [ ] Repository GitHub connecté
- [ ] Root Directory configuré : `frontend`
- [ ] Framework Preset : `Create React App`
- [ ] Build Command : `npm run build`
- [ ] Output Directory : `build`
- [ ] Variable `REACT_APP_BACKEND_URL` ajoutée
- [ ] Déploiement initial réussi
- [ ] Domaine personnalisé ajouté dans Vercel
- [ ] Enregistrements DNS configurés dans OVH
- [ ] Domaine vérifié dans Vercel (icône verte)
- [ ] HTTPS activé automatiquement
- [ ] Site accessible sur `https://votre-domaine.fr`
- [ ] `CORS_ORIGINS` mis à jour dans le backend
- [ ] Tests fonctionnels effectués

---

## 🎉 C'est terminé !

Votre frontend React est maintenant déployé sur Vercel avec votre domaine OVH. Les déploiements se feront automatiquement à chaque push sur GitHub.

### Architecture Finale

```
Frontend (Vercel) → https://votre-domaine.fr
Backend (Vercel)  → https://api.votre-domaine.fr (ou URL Vercel)
Base de données   → MongoDB Atlas
```

Tout est maintenant au même endroit (Vercel) pour une gestion simplifiée ! 🚀














