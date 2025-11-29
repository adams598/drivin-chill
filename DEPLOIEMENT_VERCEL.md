# Guide de Déploiement sur Vercel

Ce guide explique comment déployer le backend sur Vercel et configurer le domaine `drivinnchill.fr`.

## 📋 Prérequis

1. Compte Vercel (gratuit) : https://vercel.com
2. Compte MongoDB Atlas (ou MongoDB existant)
3. Compte Stripe
4. Domaine `drivinnchill.fr` (chez Hostinger ou autre)

## 🚀 Déploiement du Backend sur Vercel

### Étape 1 : Préparer le projet

Le fichier `vercel.json` a déjà été créé dans le dossier `backend/`.

### Étape 2 : Installer Vercel CLI (optionnel)

```bash
npm i -g vercel
```

### Étape 3 : Déployer depuis le dossier backend

```bash
cd backend
vercel
```

Ou via l'interface web Vercel :
1. Allez sur https://vercel.com
2. Cliquez sur "Add New Project"
3. Importez votre repository GitHub/GitLab
4. Configurez :
   - **Root Directory** : `backend`
   - **Framework Preset** : Other
   - **Build Command** : (laisser vide)
   - **Output Directory** : (laisser vide)

### Étape 4 : Configurer les Variables d'Environnement

Dans le dashboard Vercel, allez dans **Settings** > **Environment Variables** et ajoutez :

#### Variables Obligatoires

```env
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/
DB_NAME=drivinnchill
STRIPE_API_KEY=sk_live_... (ou sk_test_... pour les tests)
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_TOKEN=votre_token_secret_admin
CORS_ORIGINS=https://drivinnchill.fr,https://www.drivinnchill.fr
```

#### Variables Email (Option 1 : SMTP standard)

```env
EMAIL_USERNAME=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_FROM=noreply@drivinnchill.fr
```

#### Variables Email (Option 2 : SendGrid - Recommandé pour production)

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@drivinnchill.fr
```

> **Note** : Si vous utilisez SendGrid, vous devrez modifier `server.py` pour utiliser SendGrid au lieu de SMTP. Voir la section "Intégration SendGrid" ci-dessous.

### Étape 5 : Configurer le Domaine

#### 5.1 Dans Vercel

1. Allez dans **Settings** > **Domains**
2. Ajoutez `drivinnchill.fr` et `www.drivinnchill.fr`
3. Vercel vous donnera des enregistrements DNS à configurer

#### 5.2 Dans Hostinger (ou votre registrar)

Vous avez deux options :

##### Option A : Utiliser les DNS de Vercel (Recommandé)

1. Dans Hostinger, allez dans la gestion DNS de `drivinnchill.fr`
2. Remplacez les serveurs de noms par ceux de Vercel :
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
3. Vercel gérera automatiquement tous les enregistrements DNS

##### Option B : Utiliser des enregistrements DNS personnalisés

1. Dans Hostinger, gardez vos serveurs DNS actuels
2. Ajoutez les enregistrements suivants :

**Pour le domaine principal :**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**Pour le sous-domaine www :**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**Pour l'API (si vous voulez api.drivinnchill.fr) :**
```
Type: CNAME
Name: api
Value: cname.vercel-dns.com
TTL: 3600
```

### Étape 6 : Configurer les Webhooks Stripe

1. Dans le dashboard Stripe, allez dans **Developers** > **Webhooks**
2. Ajoutez un endpoint : `https://drivinnchill.fr/api/webhook/stripe`
3. Sélectionnez l'événement : `checkout.session.completed`
4. Copiez le **Signing secret** et ajoutez-le à `STRIPE_WEBHOOK_SECRET` dans Vercel

### Étape 7 : Redéployer

Après avoir configuré les variables d'environnement et le domaine :

```bash
vercel --prod
```

Ou via l'interface : cliquez sur **Deployments** > **Redeploy**

## 🌐 Configuration du Frontend

### Option 1 : Vercel (Recommandé)

1. Créez un nouveau projet Vercel pour le frontend
2. Root Directory : `frontend`
3. Framework Preset : Create React App
4. Variables d'environnement :
   ```env
   REACT_APP_BACKEND_URL=https://drivinnchill.fr
   ```

### Option 2 : Netlify

1. Créez un compte sur Netlify
2. Importez votre repository
3. Configurez :
   - **Base directory** : `frontend`
   - **Build command** : `npm run build`
   - **Publish directory** : `frontend/build`
4. Variables d'environnement :
   ```env
   REACT_APP_BACKEND_URL=https://drivinnchill.fr
   ```

### Option 3 : Hostinger (Hébergement traditionnel)

1. Uploadez le build du frontend dans votre espace Hostinger
2. Configurez le domaine pour pointer vers le dossier du frontend
3. Créez un fichier `.htaccess` pour le routing React :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 📧 Intégration SendGrid (Optionnel mais Recommandé)

Si vous voulez utiliser SendGrid au lieu de SMTP, modifiez `server.py` :

1. Ajoutez dans `requirements.txt` :
   ```
   sendgrid>=6.10.0
   ```

2. Modifiez la configuration email dans `server.py` :

```python
# Email configuration avec SendGrid
import sendgrid
from sendgrid.helpers.mail import Mail

sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
email_from = os.environ.get('EMAIL_FROM', 'noreply@drivinnchill.fr')
email_enabled = bool(sendgrid_api_key)

if sendgrid_api_key:
    sg = sendgrid.SendGridAPIClient(api_key=sendgrid_api_key)
    logging.info("SendGrid configuration loaded")
else:
    logging.warning("SendGrid API key not found. Emails will be simulated.")
```

3. Modifiez la fonction `send_confirmation_email` pour utiliser SendGrid.

## 🔒 Sécurité

### Variables Sensibles

- Ne commitez **JAMAIS** vos variables d'environnement dans Git
- Utilisez toujours les variables d'environnement de Vercel
- Pour le développement local, utilisez un fichier `.env` (dans `.gitignore`)

### HTTPS

Vercel fournit automatiquement HTTPS pour tous les domaines. Assurez-vous que :
- `CORS_ORIGINS` utilise `https://` et non `http://`
- Les webhooks Stripe utilisent `https://`

## 🧪 Tests

Après le déploiement, testez :

1. ✅ Accès à l'API : `https://drivinnchill.fr/api/movies`
2. ✅ Création d'une réservation
3. ✅ Paiement Stripe (mode test)
4. ✅ Réception des webhooks Stripe
5. ✅ Envoi d'emails de confirmation

## 📝 Checklist de Déploiement

- [ ] Backend déployé sur Vercel
- [ ] Variables d'environnement configurées
- [ ] Domaine `drivinnchill.fr` configuré dans Vercel
- [ ] DNS configuré chez Hostinger
- [ ] Webhooks Stripe configurés
- [ ] Frontend déployé (Vercel/Netlify/Hostinger)
- [ ] `REACT_APP_BACKEND_URL` configuré dans le frontend
- [ ] Tests de paiement effectués
- [ ] Tests d'envoi d'email effectués
- [ ] HTTPS vérifié (automatique avec Vercel)

## 🆘 Dépannage

### Erreur : "Module not found"
- Vérifiez que `requirements.txt` contient toutes les dépendances
- Vérifiez que le build utilise Python 3.11

### Erreur : "MONGO_URL not found"
- Vérifiez que les variables d'environnement sont bien configurées dans Vercel
- Vérifiez que vous avez sélectionné les bonnes environnements (Production, Preview, Development)

### Erreur CORS
- Vérifiez que `CORS_ORIGINS` contient l'URL exacte de votre frontend
- Vérifiez que vous utilisez `https://` et non `http://`

### Le domaine ne fonctionne pas
- Attendez 24-48h pour la propagation DNS
- Vérifiez les enregistrements DNS avec `dig drivinnchill.fr` ou `nslookup drivinnchill.fr`
- Vérifiez que le domaine est bien ajouté dans Vercel

## 📞 Support

Pour plus d'aide :
- Documentation Vercel : https://vercel.com/docs
- Documentation Stripe : https://stripe.com/docs
- Documentation MongoDB Atlas : https://docs.atlas.mongodb.com

