# 🔍 Guide de débogage pour le proxy Canva

## Problème : L'image ne s'affiche pas ou affiche la mauvaise image

### Étape 1 : Vérifier la configuration

1. **Vérifiez votre fichier `frontend/.env`** :
   ```env
   REACT_APP_CANVA_PROXY_URL=https://canva-image-proxy.drivin-chill-canva.workers.dev
   ```
   ⚠️ **IMPORTANT** : Pas de `?url=...` à la fin !

2. **Redémarrez votre serveur React** après modification du `.env`

### Étape 2 : Tester le Worker directement

Ouvrez dans votre navigateur :
```
https://canva-image-proxy.drivin-chill-canva.workers.dev/?url=VOTRE_URL_CANVA
```

**Résultats possibles :**
- ✅ **Vous voyez l'image** → Le Worker fonctionne, le problème est côté frontend
- ❌ **Erreur 404** → Le Worker ne trouve pas l'image dans la page Canva
- ❌ **Erreur 400** → L'URL Canva n'est pas valide
- ❌ **Erreur 500** → Problème avec le Worker

### Étape 3 : Vérifier que le design Canva est public

1. Ouvrez votre URL Canva dans un navigateur en navigation privée
2. Si vous voyez le design → ✅ Public
3. Si vous voyez une page de connexion → ❌ Privé (il faut le rendre public)

**Pour rendre un design Canva public :**
1. Ouvrez votre design sur Canva
2. Cliquez sur "Partager" (en haut à droite)
3. Cliquez sur "Modifier le lien"
4. Choisissez "Tout le monde avec le lien"
5. Copiez le nouveau lien

### Étape 4 : Vérifier la console du navigateur

Ouvrez la console (F12) et cherchez :
- ❌ `Erreur de chargement de l'image` → Voir les détails de l'erreur
- ⚠️ `REACT_APP_CANVA_PROXY_URL n'est pas configuré` → Vérifiez le `.env`
- ✅ Aucune erreur → Le problème est peut-être avec l'extraction de l'image

### Étape 5 : Tester avec une autre URL Canva

Essayez avec un autre design Canva public pour voir si le problème est spécifique à un design.

### Étape 6 : Solution alternative (temporaire)

Si le Worker ne fonctionne toujours pas, vous pouvez :

1. **Télécharger l'image depuis Canva**
   - Ouvrez votre design
   - Cliquez sur "Partager" → "Télécharger"
   - Choisissez JPG ou PNG

2. **Uploader sur Imgur**
   - Allez sur [imgur.com](https://imgur.com)
   - Cliquez sur "New post"
   - Glissez votre image
   - Copiez l'URL directe (se termine par .jpg ou .png)

3. **Utiliser l'URL Imgur dans votre application**

## Améliorations apportées au Worker

Le Worker a été amélioré pour :
- ✅ Servir l'image directement au lieu de rediriger (meilleur pour les balises `<img>`)
- ✅ Décoder les entités HTML dans les URLs
- ✅ Chercher l'image avec 7 méthodes différentes
- ✅ Prioriser les images Canva CDN
- ✅ Ajouter des headers CORS corrects

## Redéployer le Worker

Si vous avez modifié le Worker, redéployez-le :

```bash
cd cloudflare-worker
wrangler deploy
```











