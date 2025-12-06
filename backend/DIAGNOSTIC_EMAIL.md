# 🔍 Diagnostic Email - Guide de Dépannage

## 🚨 Problème : Les emails ne sont pas envoyés après réservation

### Étape 1 : Vérifier l'état de la configuration

Utilisez l'endpoint pour vérifier l'état :
```bash
GET /api/admin/email-status
Headers: Authorization: Bearer admin_token_2024
```

**Réponse attendue si configuré :**
```json
{
  "email_enabled": true,
  "email_configured": true,
  "email_host": "smtp.gmail.com",
  "email_port": 587,
  "email_from": "votre-email@gmail.com",
  "message": "Email activé"
}
```

**Si `email_enabled: false` :** Les emails sont en mode simulation (affichés dans les logs uniquement)

### Étape 2 : Vérifier les logs du serveur

Après une réservation, cherchez dans les logs :

#### ✅ Succès attendu :
```
📧 send_confirmation_email appelé pour user@example.com
📧 email_enabled = True
📧 Tentative 1/3 d'envoi d'email à user@example.com
✅ Email envoyé avec succès à user@example.com (tentative 1)
```

#### ❌ Mode simulation (pas de configuration) :
```
📧 send_confirmation_email appelé pour user@example.com
📧 email_enabled = False
📧 [SIMULATION] Email envoyé à user@example.com
⚠️ EMAIL EN MODE SIMULATION - Configurez EMAIL_USERNAME et EMAIL_PASSWORD dans .env
```

#### ❌ Erreur d'authentification :
```
❌ Échec envoi email à user@example.com (tentative 1/3)
❌ Erreur d'authentification SMTP - Vérifiez EMAIL_USERNAME et EMAIL_PASSWORD
❌ Le mot de passe d'application Gmail doit être utilisé, pas le mot de passe principal
```

### Étape 3 : Tester l'envoi d'email

Utilisez l'endpoint de test :
```bash
POST /api/admin/test-email?recipient=votre-email@example.com
Headers: Authorization: Bearer admin_token_2024
```

Cela enverra un email de test et retournera le résultat.

### Étape 4 : Configuration Gmail

Si vous utilisez Gmail, suivez ces étapes :

1. **Aller sur** : https://myaccount.google.com/security
2. **Activer la validation en 2 étapes** (obligatoire)
3. **Créer un mot de passe d'application** :
   - Aller dans "Mots de passe des applications"
   - Sélectionner "Application" → "Autre" → Nom : "Drivin And Chill"
   - Copier le mot de passe généré (16 caractères)

4. **Configurer dans `.env`** :
```env
EMAIL_USERNAME=votre-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # Le mot de passe d'application (16 caractères)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

5. **Redémarrer le serveur** après modification du `.env`

### Étape 5 : Vérifier que le fichier .env est bien chargé

Regardez les logs au démarrage du serveur :

**✅ Bon :**
```
✅ Fichier .env chargé depuis /chemin/vers/backend/.env
Email configuration loaded: votre-email@gmail.com
```

**❌ Problème :**
```
⚠️  Fichier .env non trouvé
Email credentials not found. Emails will be simulated.
```

### Erreurs courantes

#### Erreur 535 (Authentification invalide)
- **Cause** : Mauvais mot de passe ou utilisation du mot de passe principal au lieu du mot de passe d'application
- **Solution** : Créer un nouveau mot de passe d'application Gmail

#### Erreur de connexion/timeout
- **Cause** : Problème réseau ou mauvais host/port
- **Solution** : Vérifier `EMAIL_HOST` et `EMAIL_PORT`, vérifier le pare-feu

#### Emails en mode simulation
- **Cause** : Variables d'environnement non définies
- **Solution** : Vérifier que `EMAIL_USERNAME` et `EMAIL_PASSWORD` sont dans le fichier `.env`

### En production (Vercel, Railway, etc.)

1. **Ajouter les variables d'environnement** dans les paramètres de votre service
2. **Redéployer** l'application
3. **Tester** avec l'endpoint `/api/admin/test-email`

### Logs à surveiller

Après chaque réservation, vérifiez les logs pour :
- ✅ `📧 send_confirmation_email appelé` → L'email est tenté
- ✅ `email_enabled = True` → La configuration est activée
- ✅ `✅ Email envoyé avec succès` → L'email a été envoyé
- ❌ Toute erreur indiquera le problème spécifique

---

**Besoin d'aide ?** Consultez `EMAIL_CONFIGURATION.md` pour le guide complet de configuration.

















