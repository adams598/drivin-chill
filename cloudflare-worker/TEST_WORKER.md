# 🧪 Tester le Worker Canva Proxy

## Test rapide dans le navigateur

1. **Remplacez `VOTRE_URL_CANVA` par votre URL Canva** dans cette URL :
   ```
   https://canva-image-proxy.drivin-chill-canva.workers.dev/?url=VOTRE_URL_CANVA
   ```

2. **Ouvrez cette URL dans votre navigateur**

3. **Résultats attendus :**
   - ✅ **Vous voyez l'image** → Le Worker fonctionne parfaitement !
   - ❌ **Erreur 404** → Le Worker ne trouve pas l'image (design privé ou structure de page changée)
   - ❌ **Erreur 400** → L'URL Canva n'est pas valide
   - ❌ **Erreur 500** → Problème avec le Worker

## Test avec curl (ligne de commande)

```bash
curl -I "https://canva-image-proxy.drivin-chill-canva.workers.dev/?url=VOTRE_URL_CANVA"
```

Cela affichera les headers de la réponse. Vous devriez voir :
- `Content-Type: image/jpeg` ou `image/png`
- `Access-Control-Allow-Origin: *`

## Test dans la console du navigateur

Ouvrez la console (F12) et exécutez :

```javascript
const canvaUrl = 'VOTRE_URL_CANVA';
const proxyUrl = 'https://canva-image-proxy.drivin-chill-canva.workers.dev';
const testUrl = `${proxyUrl}/?url=${encodeURIComponent(canvaUrl)}`;

// Tester le chargement
const img = new Image();
img.onload = () => console.log('✅ Image chargée avec succès !', img.width, 'x', img.height);
img.onerror = (e) => console.error('❌ Erreur de chargement:', e);
img.src = testUrl;
```

## Vérifier que le design est public

1. Ouvrez votre URL Canva dans un **onglet de navigation privée**
2. Si vous voyez le design → ✅ Public
3. Si vous voyez une page de connexion → ❌ Privé

**Pour rendre public :**
- Canva → Partager → Modifier le lien → "Tout le monde avec le lien"



