# 📧 Guide de Configuration Email - Drivin And Chill

Ce guide vous explique comment configurer le système d'envoi d'emails pour Drivin And Chill.

## 🔍 État actuel

Le système d'email est déjà intégré dans le code. Il fonctionne en mode **simulation** si les identifiants ne sont pas configurés, ce qui permet au système de fonctionner même sans configuration email.

## 📋 Variables d'environnement nécessaires

Ajoutez ces variables dans votre fichier `backend/.env` :

```env
EMAIL_USERNAME=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

## 🔧 Configuration avec Gmail (Recommandé)

### Étape 1 : Créer un mot de passe d'application Gmail

1. **Aller sur votre compte Google** : https://myaccount.google.com/
2. **Sécurité** → **Validation en deux étapes** (doit être activée)
3. **Mots de passe des applications** :
   - Descendre jusqu'à "Mots de passe des applications"
   - Sélectionner "Application" : **Autre (nom personnalisé)**
   - Nommer : **Drivin And Chill**
   - Cliquer sur **Générer**
   - **Copier le mot de passe généré** (16 caractères) ⚠️ Vous ne le reverrez qu'une fois !

### Étape 2 : Configurer le fichier .env

Créez ou modifiez le fichier `backend/.env` :

```env
# Email Configuration
EMAIL_USERNAME=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-app-16-caracteres
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### Étape 3 : Redémarrer le serveur

Après modification du `.env`, redémarrez le serveur backend :

```bash
# Dans le dossier backend/
python server.py
# ou si vous utilisez uvicorn directement
uvicorn server:app --reload
```

## 🧪 Tester la configuration

### Méthode 1 : Endpoint de test (Recommandé)

Utilisez l'endpoint de test dans l'interface admin ou via une requête HTTP :

```bash
curl -X POST "https://votre-domaine.com/api/admin/test-email" \
  -H "Authorization: Bearer admin_token_2024" \
  -H "Content-Type: application/json"
```

Ou utilisez Postman/Insomnia avec :
- **URL** : `POST /api/admin/test-email`
- **Headers** : `Authorization: Bearer admin_token_2024`
- **Body** : (vide)

### Méthode 2 : Vérifier les logs

Regardez les logs du serveur au démarrage :

- ✅ **Configuration réussie** : `Email configuration loaded: votre-email@gmail.com`
- ❌ **Configuration manquante** : `Email credentials not found. Emails will be simulated.`

### Méthode 3 : Créer une réservation de test

Créez une réservation test via l'interface. Si l'email est configuré, vous recevrez un email de confirmation avec QR code.

## 🔍 Dépannage

### Problème : "Échec de l'envoi de l'email"

**Solutions :**

1. **Vérifier les identifiants** :
   - Le mot de passe d'application doit être correct (16 caractères)
   - L'email doit correspondre exactement à celui utilisé pour générer le mot de passe

2. **Vérifier que la validation en 2 étapes est activée** :
   - C'est obligatoire pour les mots de passe d'application Gmail

3. **Vérifier les logs du serveur** :
   - Les erreurs détaillées sont dans les logs
   - Recherchez : `❌ Échec envoi email`

4. **Vérifier le pare-feu/proxy** :
   - Le port 587 (SMTP) doit être accessible
   - Certains réseaux bloquent le SMTP

### Problème : "Email credentials not found"

**Solution :**
- Vérifiez que le fichier `.env` existe dans `backend/`
- Vérifiez que les variables `EMAIL_USERNAME` et `EMAIL_PASSWORD` sont présentes
- Redémarrez le serveur après modification

## 🔄 Configuration avec d'autres services SMTP

### Outlook / Hotmail

```env
EMAIL_USERNAME=votre-email@outlook.com
EMAIL_PASSWORD=votre-mot-de-passe
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
```

### Yahoo Mail

```env
EMAIL_USERNAME=votre-email@yahoo.com
EMAIL_PASSWORD=votre-mot-de-passe-app
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
```

### OVH / Autres fournisseurs

```env
EMAIL_USERNAME=noreply@votre-domaine.com
EMAIL_PASSWORD=votre-mot-de-passe
EMAIL_HOST=ssl0.ovh.net
EMAIL_PORT=587
```

## 📝 Structure des emails envoyés

Le système envoie automatiquement :

1. **Email de confirmation de réservation** :
   - Inclut les détails de la réservation
   - QR Code intégré pour l'entrée
   - Informations pratiques

2. **Fonctionnalités** :
   - Tentatives multiples en cas d'échec (3 tentatives)
   - Emails HTML avec mise en forme
   - QR Code généré automatiquement

## 🔐 Sécurité

- ✅ Ne commitez **JAMAIS** le fichier `.env` dans Git
- ✅ Utilisez des mots de passe d'application (pas votre mot de passe principal)
- ✅ Le fichier `.env` est déjà dans `.gitignore`

## 📊 Vérification de l'état

Pour vérifier si l'email est activé :

1. Regardez les logs au démarrage du serveur
2. Utilisez l'endpoint `/api/admin/test-email`
3. Vérifiez la réponse JSON : `"email_enabled": true`

## 🚀 Production

En production (Vercel, Railway, etc.) :

1. Ajoutez les variables d'environnement dans les paramètres de votre service
2. Redéployez l'application
3. Testez avec l'endpoint de test

---

**Besoin d'aide ?** Vérifiez les logs du serveur ou testez avec l'endpoint `/api/admin/test-email`.

















