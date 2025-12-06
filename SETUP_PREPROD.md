# ⚡ Configuration Rapide Pré-Production Vercel

## 🎯 Objectif
Configurer deux environnements :
- **PREPROD** : Déploiement automatique depuis la branche `develop`
- **PRODUCTION** : Déploiement automatique depuis la branche `main` + promotion manuelle

---

## 📋 Étapes de Configuration

### 1. Créer la branche `develop`

```bash
# Depuis votre repository local
git checkout -b develop
git push origin develop
```

### 2. Configurer Vercel Backend

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet backend
3. **Settings** > **Git** :
   - **Production Branch** : `main` (ou `master`)
   - Les autres branches créent automatiquement des **Preview Deployments**

### 3. Configurer les Variables d'Environnement

Dans **Settings** > **Environment Variables**, ajoutez les variables avec les environnements appropriés :

#### Variables PREPROD (Preview)
Sélectionnez **Environment** = `Preview` :

```
MONGO_URL=mongodb+srv://... (même DB ou DB de test)
DB_NAME=drivinnchill
ADMIN_TOKEN=votre_token_preprod
CORS_ORIGINS=https://votre-backend-preprod.vercel.app,https://votre-frontend-preprod.vercel.app
STRIPE_API_KEY=sk_test_... (clé de TEST)
```

#### Variables PRODUCTION
Sélectionnez **Environment** = `Production` :

```
MONGO_URL=mongodb+srv://... (DB de production)
DB_NAME=drivinnchill
ADMIN_TOKEN=votre_token_production
CORS_ORIGINS=https://drivinnchill.fr,https://www.drivinnchill.fr,https://api.drivinnchill.fr
STRIPE_API_KEY=sk_live_... (clé LIVE)
```

### 4. Configurer Vercel Frontend

Même processus pour le frontend :
1. **Settings** > **Git** : Production Branch = `main`
2. **Environment Variables** :
   - **Preview** : `REACT_APP_BACKEND_URL=https://votre-backend-preprod.vercel.app`
   - **Production** : `REACT_APP_BACKEND_URL=https://api.drivinnchill.fr`

---

## 🔄 Workflow de Déploiement

### Développement → Preprod (Automatique)

```bash
# Travailler sur develop
git checkout develop
git add .
git commit -m "Nouvelle fonctionnalité"
git push origin develop
```

✅ **Résultat** : Déploiement automatique en PREPROD sur Vercel

### Preprod → Production (Manuel)

#### Méthode 1 : Promotion via Interface Vercel (Recommandé)

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. **Deployments** > Trouvez le déploiement de `develop` à promouvoir
4. Cliquez sur **⋯** (3 points) > **"Promote to Production"**
5. Confirmez la promotion

✅ **Résultat** : Le déploiement est promu en production sur la branche `main`

#### Méthode 2 : Merge vers main

```bash
# Merger develop dans main
git checkout main
git merge develop
git push origin main
```

✅ **Résultat** : Déploiement automatique en PRODUCTION

---

## 🎯 URLs des Environnements

### Backend
- **Preprod** : `https://votre-projet-backend-git-develop-votre-compte.vercel.app`
- **Production** : `https://api.drivinnchill.fr` (ou votre domaine)

### Frontend
- **Preprod** : `https://votre-projet-frontend-git-develop-votre-compte.vercel.app`
- **Production** : `https://drivinnchill.fr` (ou votre domaine)

---

## ✅ Checklist Avant Promotion Production

- [ ] Tests passés en preprod
- [ ] Fonctionnalités validées
- [ ] Variables d'environnement production vérifiées
- [ ] Stripe clé LIVE configurée (pas de test)
- [ ] CORS inclut les domaines de production
- [ ] Base de données de production sauvegardée
- [ ] Équipe informée

---

## 🆘 Dépannage

**Le déploiement preprod ne se déclenche pas ?**
- Vérifiez que la branche `develop` existe sur GitHub
- Vérifiez **Settings** > **Git** dans Vercel
- Vérifiez les logs dans **Deployments**

**Les variables ne sont pas prises en compte ?**
- Vérifiez que les variables sont assignées au bon environnement (Preview/Production)
- Redéployez après modification des variables

**La promotion ne fonctionne pas ?**
- Vérifiez vos droits administrateur sur le projet
- Vérifiez que `main` est bien la branche de production

