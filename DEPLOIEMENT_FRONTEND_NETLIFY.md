# 🎨 Guide de Déploiement Frontend sur Netlify avec Domaine OVH

## 🎯 Pourquoi Netlify pour le Frontend React ?

- ✅ **Gratuit** pour usage personnel/professionnel
- ✅ **Optimisé pour React** - détection automatique
- ✅ **Déploiements automatiques** depuis GitHub
- ✅ **CDN global** - performances excellentes
- ✅ **SSL automatique** (HTTPS gratuit)
- ✅ **Configuration DNS simple** avec OVH
- ✅ **Interface intuitive**

## 📋 Prérequis

1. Compte Netlify (gratuit) : https://www.netlify.com
2. Compte GitHub avec votre code poussé
3. Domaine chez OVH (déjà configuré)

---

## 🚀 Étape 1 : Déployer sur Netlify

### 1.1 Créer un compte et importer le projet

1. Allez sur https://app.netlify.com
2. Cliquez sur **"Add new site"** > **"Import an existing project"**
3. Connectez votre compte GitHub
4. Sélectionnez le repository `drivin-chill`

### 1.2 Configurer les paramètres de build

Dans la section **"Build settings"**, configurez :

- **Base directory** : `frontend`
- **Build command** : `npm run build` (ou `yarn build` si vous utilisez Yarn)
- **Publish directory** : `frontend/build`

> ⚠️ **Important** : Netlify va automatiquement détecter React, mais assurez-vous que ces paramètres sont corrects.

### 1.3 Configurer les variables d'environnement

1. Allez dans **Site settings** > **Environment variables**
2. Ajoutez :

```env
REACT_APP_BACKEND_URL=https://votre-backend.vercel.app
```

> Remplacez `votre-backend.vercel.app` par l'URL réelle de votre backend Vercel (ex: `https://api.drivinnchill.fr` ou `https://votre-projet.vercel.app`)

### 1.4 Déployer

1. Cliquez sur **"Deploy site"**
2. Attendez que le déploiement se termine (2-5 minutes)
3. Votre site sera accessible sur `https://votre-site.netlify.app`

---

## 🌐 Étape 2 : Configurer le Domaine OVH

### 2.1 Dans Netlify

1. Allez dans **Site settings** > **Domain management**
2. Cliquez sur **"Add custom domain"**
3. Entrez votre domaine : `votre-domaine.fr`
4. Netlify va vous donner des instructions DNS

### 2.2 Dans OVH

Vous avez **deux options** :

#### Option A : Configuration DNS simple (Recommandé)

Dans votre espace OVH, allez dans **Domaines** > **Zone DNS** :

1. **Pour le domaine principal** (`votre-domaine.fr`) :
   ```
   Type: A
   Sous-domaine: @
   Cible: 75.2.60.5
   TTL: 3600
   ```

2. **Pour le sous-domaine www** (`www.votre-domaine.fr`) :
   ```
   Type: CNAME
   Sous-domaine: www
   Cible: votre-site.netlify.app
   TTL: 3600
   ```

> ⚠️ **Note** : L'IP `75.2.60.5` est l'IP de Netlify. Vérifiez dans Netlify si cette IP est toujours valide (elle peut changer).

#### Option B : Utiliser les serveurs DNS de Netlify (Plus simple)

1. Dans Netlify, allez dans **Site settings** > **Domain management**
2. Netlify vous donnera des serveurs DNS (ex: `dns1.p01.nsone.net`)
3. Dans OVH, allez dans **Domaines** > **Serveurs DNS**
4. Remplacez les serveurs DNS par ceux de Netlify
5. Netlify gérera automatiquement tous les enregistrements DNS

### 2.3 Activer HTTPS

1. Dans Netlify, allez dans **Site settings** > **Domain management**
2. Cliquez sur **"Verify DNS configuration"**
3. Une fois vérifié, Netlify activera automatiquement le SSL (HTTPS)
4. Attendez 5-10 minutes pour la propagation DNS

---

## ✅ Étape 3 : Vérification

### 3.1 Tester le site

1. Visitez `https://votre-domaine.fr`
2. Vérifiez que le site se charge correctement
3. Ouvrez la console du navigateur (F12) et vérifiez qu'il n'y a pas d'erreurs
4. Testez les appels API vers votre backend

### 3.2 Vérifier les variables d'environnement

Assurez-vous que `REACT_APP_BACKEND_URL` est correctement configuré et que votre frontend peut communiquer avec le backend.

---

## 🔄 Déploiements Automatiques

Netlify déploie automatiquement à chaque push sur la branche `main` (ou `master`) de votre repository GitHub.

Pour forcer un nouveau déploiement :
1. Allez dans **Deploys**
2. Cliquez sur **"Trigger deploy"** > **"Deploy site"**

---

## 🐛 Dépannage

### Le domaine ne fonctionne pas ?

1. Vérifiez les enregistrements DNS dans OVH
2. Attendez 24-48h pour la propagation DNS complète
3. Utilisez `nslookup votre-domaine.fr` pour vérifier les DNS
4. Dans Netlify, vérifiez que le domaine est bien vérifié

### Erreurs de build ?

1. Vérifiez les logs dans **Deploys** > Cliquez sur un déploiement
2. Assurez-vous que `package.json` contient le script `build`
3. Vérifiez que toutes les dépendances sont dans `package.json`

### Le frontend ne peut pas joindre le backend ?

1. Vérifiez `REACT_APP_BACKEND_URL` dans les variables d'environnement
2. Vérifiez que `CORS_ORIGINS` dans le backend inclut votre domaine Netlify
3. Vérifiez la console du navigateur pour les erreurs CORS

---

## 📝 Checklist Complète

- [ ] Compte Netlify créé
- [ ] Repository GitHub connecté
- [ ] Paramètres de build configurés (Base directory: `frontend`)
- [ ] Variable `REACT_APP_BACKEND_URL` ajoutée
- [ ] Déploiement initial réussi
- [ ] Domaine personnalisé ajouté dans Netlify
- [ ] Enregistrements DNS configurés dans OVH
- [ ] HTTPS activé automatiquement
- [ ] Site accessible sur `https://votre-domaine.fr`
- [ ] Tests fonctionnels effectués

---

## 🎉 C'est terminé !

Votre frontend React est maintenant déployé sur Netlify avec votre domaine OVH. Les déploiements se feront automatiquement à chaque push sur GitHub.



















