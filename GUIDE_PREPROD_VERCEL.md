# 🚀 Guide Configuration Pré-Production sur Vercel

Ce guide explique comment configurer un environnement de pré-production (preprod) sur Vercel, avec promotion manuelle vers la production.

## 📋 Vue d'ensemble

Avec cette configuration :
- **Branche `develop`** → Déploiement automatique en **PREPROD**
- **Branche `main`** → Déploiement automatique en **PRODUCTION**
- **Promotion manuelle** : Promouvoir de preprod vers prod uniquement quand tout est validé

---

## 🔧 Configuration Backend

### Étape 1 : Configurer les branches dans Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet backend
3. Allez dans **Settings** > **Git**
4. Configurez les branches :
   - **Production Branch** : `main` (ou `master`)
   - **Preview Branches** : `develop` (ou autres branches de développement)

### Étape 2 : Configurer les environnements

Dans **Settings** > **Environment Variables**, configurez les variables pour chaque environnement :

#### Variables pour PREPROD (Preview/Development)

Ajoutez les variables avec **Environment** = `Preview` :

```env
MONGO_URL=mongodb+srv://... (peut être la même DB ou une DB de test)
DB_NAME=drivinnchill-preprod
ADMIN_TOKEN=votre_token_preprod
CORS_ORIGINS=https://drivin-chill-backend-git-develop-votre-compte.vercel.app,https://drivin-chill-frontend-git-develop-votre-compte.vercel.app
STRIPE_API_KEY=sk_test_... (clé de test Stripe)
STRIPE_WEBHOOK_SECRET=whsec_test_...
EMAIL_FROM=noreply-preprod@drivinnchill.fr
```

#### Variables pour PRODUCTION

Ajoutez les variables avec **Environment** = `Production` :

```env
MONGO_URL=mongodb+srv://... (DB de production)
DB_NAME=drivinnchill
ADMIN_TOKEN=votre_token_production_securise
CORS_ORIGINS=https://drivinnchill.fr,https://www.drivinnchill.fr
STRIPE_API_KEY=sk_live_... (clé live Stripe)
STRIPE_WEBHOOK_SECRET=whsec_live_...
EMAIL_FROM=noreply@drivinnchill.fr
```

> 💡 **Astuce** : Vous pouvez aussi utiliser `Development` pour les variables communes aux deux environnements.

### Étape 3 : Configurer les domaines

#### Pour PREPROD
- Dans **Settings** > **Domains**, ajoutez un domaine de preprod (optionnel) :
  - Exemple : `preprod-api.drivinnchill.fr` ou utilisez l'URL Vercel par défaut

#### Pour PRODUCTION
- Dans **Settings** > **Domains**, configurez :
  - `api.drivinnchill.fr` (ou votre domaine de production)

---

## 🎨 Configuration Frontend

### Étape 1 : Créer un projet séparé ou utiliser les branches

**Option A : Projet séparé (Recommandé)**

1. Créez un **nouveau projet** dans Vercel pour le frontend preprod
2. Nommez-le : `drivin-chill-frontend-preprod`
3. Configurez :
   - **Root Directory** : `frontend`
   - **Production Branch** : `main`
   - **Preview Branches** : `develop`

**Option B : Utiliser les branches du même projet**

1. Dans votre projet frontend existant
2. Configurez les branches comme pour le backend

### Étape 2 : Variables d'environnement Frontend

#### Pour PREPROD (Preview)

```env
REACT_APP_BACKEND_URL=https://drivin-chill-backend-git-develop-votre-compte.vercel.app
```

#### Pour PRODUCTION

```env
REACT_APP_BACKEND_URL=https://api.drivinnchill.fr
```

---

## 🔄 Workflow de développement

### 1. Développement sur la branche `develop`

```bash
# Créer/switch vers la branche develop
git checkout -b develop
git push origin develop
```

**Résultat** : Déploiement automatique en PREPROD sur Vercel

### 2. Tester en PREPROD

- Accédez à l'URL de preprod (fournie par Vercel)
- Testez toutes les fonctionnalités
- Vérifiez que tout fonctionne correctement

### 3. Promouvoir vers PRODUCTION

Une fois que tout est validé en preprod :

#### Option A : Via l'interface Vercel (Recommandé)

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Deployments**
4. Trouvez le déploiement de la branche `develop` que vous voulez promouvoir
5. Cliquez sur les **3 points** (⋯) à droite du déploiement
6. Sélectionnez **"Promote to Production"**
7. Vercel va créer un nouveau déploiement sur la branche `main`

#### Option B : Via Git (Merge)

```bash
# Merger develop dans main
git checkout main
git merge develop
git push origin main
```

**Résultat** : Déploiement automatique en PRODUCTION

---

## 🎯 Configuration avancée : Protection de la branche main

Pour éviter les déploiements accidentels en production :

### Sur GitHub

1. Allez dans votre repository GitHub
2. **Settings** > **Branches**
3. Ajoutez une règle pour `main` :
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

### Sur Vercel

1. Dans **Settings** > **Git**
2. Activez **"Protect Production Deployments"**
3. Configurez les approbations requises

---

## 📝 Checklist de déploiement

### Avant de promouvoir en PRODUCTION

- [ ] Tous les tests passent en preprod
- [ ] Les fonctionnalités sont validées
- [ ] Les variables d'environnement de production sont correctes
- [ ] Les domaines sont configurés
- [ ] Les emails fonctionnent (test en preprod)
- [ ] Les paiements fonctionnent (test avec Stripe test)
- [ ] La base de données de production est sauvegardée
- [ ] L'équipe est informée du déploiement

### Après promotion en PRODUCTION

- [ ] Vérifier que le site de production fonctionne
- [ ] Tester les fonctionnalités critiques
- [ ] Vérifier les logs Vercel pour les erreurs
- [ ] Surveiller les métriques (trafic, erreurs)

---

## 🔍 URLs typiques

### Backend
- **Preprod** : `https://drivin-chill-backend-git-develop-votre-compte.vercel.app`
- **Production** : `https://api.drivinnchill.fr`

### Frontend
- **Preprod** : `https://drivin-chill-frontend-git-develop-votre-compte.vercel.app`
- **Production** : `https://drivinnchill.fr`

---

## 🛠️ Commandes utiles

### Voir les déploiements

```bash
cd backend
vercel ls
```

### Promouvoir un déploiement via CLI

```bash
vercel promote <deployment-url>
```

### Voir les logs

```bash
vercel logs <deployment-url>
```

---

## ⚠️ Notes importantes

1. **Base de données** : Vous pouvez utiliser la même DB pour preprod et prod, ou créer une DB séparée pour preprod
2. **Stripe** : Utilisez toujours `sk_test_...` en preprod et `sk_live_...` en production
3. **CORS** : Assurez-vous que `CORS_ORIGINS` inclut les URLs de preprod ET de production
4. **Domaine** : Le domaine de production doit pointer vers Vercel (CNAME ou A record)

---

## 🆘 Dépannage

### Le déploiement preprod ne se déclenche pas

- Vérifiez que la branche `develop` est bien configurée dans Vercel
- Vérifiez que les commits sont bien poussés sur GitHub
- Vérifiez les logs dans Vercel > Deployments

### Les variables d'environnement ne sont pas prises en compte

- Vérifiez que les variables sont bien assignées au bon environnement (Preview/Production)
- Redéployez après avoir modifié les variables
- Vérifiez que vous n'avez pas de variables en conflit

### La promotion ne fonctionne pas

- Vérifiez que vous avez les droits administrateur sur le projet
- Vérifiez que la branche `main` est bien configurée comme branche de production




