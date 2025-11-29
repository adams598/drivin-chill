# 🚀 Déploiement Rapide sur Vercel

## Configuration du Domaine drivinnchill.fr

> ⚠️ **IMPORTANT** : Si vous avez d'autres domaines déjà configurés dans Hostinger, utilisez **Option 2** pour ne pas les affecter. Chaque domaine a sa propre configuration DNS indépendante.

### Option 1 : Utiliser les DNS de Vercel (⚠️ Ne PAS utiliser si vous avez d'autres sites)

> ❌ **Ne pas utiliser cette option** si vous avez d'autres domaines actifs dans Hostinger, car cela modifierait les serveurs DNS globaux.

### Option 2 : Garder les DNS Hostinger (✅ Recommandé si vous avez d'autres sites)

1. **Dans Hostinger**, ajoutez ces enregistrements DNS :
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 3600
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

2. **Dans Vercel** :
   - Ajoutez `drivinnchill.fr` et `www.drivinnchill.fr` dans Settings > Domains
   - Vercel détectera automatiquement les enregistrements DNS

## Variables d'Environnement à Configurer dans Vercel

### Obligatoires

```
MONGO_URL=mongodb+srv://...
DB_NAME=drivinnchill
STRIPE_API_KEY=sk_live_... (ou sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_TOKEN=votre_token_secret
CORS_ORIGINS=https://drivinnchill.fr,https://www.drivinnchill.fr
```

### Email (Choisissez UNE option)

**Option A : SMTP Gmail**
```
EMAIL_USERNAME=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_FROM=noreply@drivinnchill.fr
```

**Option B : SendGrid** (Recommandé pour production)
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@drivinnchill.fr
```

> ⚠️ **Note** : Si vous utilisez SendGrid, vous devrez modifier `server.py` pour supporter SendGrid. Voir `DEPLOIEMENT_VERCEL.md` pour les instructions.

## Déploiement

### Via l'interface web Vercel

1. Allez sur https://vercel.com
2. Cliquez sur "Add New Project"
3. Importez votre repository
4. Configurez :
   - **Root Directory** : `backend`
   - **Framework Preset** : Other
5. Ajoutez toutes les variables d'environnement
6. Cliquez sur "Deploy"

### Via CLI

```bash
cd backend
vercel
vercel --prod
```

## Frontend

### Configuration

Dans votre frontend, configurez :
```env
REACT_APP_BACKEND_URL=https://drivinnchill.fr
```

### Options de déploiement

- **Vercel** : Créez un nouveau projet, root directory = `frontend`
- **Netlify** : Importez le repo, base directory = `frontend`
- **Hostinger** : Uploadez le build dans votre espace web

## Checklist

- [ ] Backend déployé sur Vercel
- [ ] Variables d'environnement configurées
- [ ] Domaine `drivinnchill.fr` ajouté dans Vercel
- [ ] DNS configuré (Option 1 ou 2)
- [ ] Webhooks Stripe configurés
- [ ] Frontend déployé avec `REACT_APP_BACKEND_URL`
- [ ] Tests effectués

## ⚡ Problèmes Courants

**Le domaine ne fonctionne pas ?**
- Attendez 24-48h pour la propagation DNS
- Vérifiez les enregistrements DNS avec `nslookup drivinnchill.fr`

**Erreur CORS ?**
- Vérifiez que `CORS_ORIGINS` contient exactement l'URL de votre frontend
- Utilisez `https://` et non `http://`

**Emails ne partent pas ?**
- Vérifiez les credentials email dans les variables d'environnement
- Pour Gmail, utilisez un "Mot de passe d'application" (pas votre mot de passe normal)

