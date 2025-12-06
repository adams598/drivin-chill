# Guide de configuration du proxy Canva

## Problème actuel

L'image ne s'affiche pas car l'URL Canva ne peut pas être utilisée directement. Il faut configurer le Cloudflare Worker.

## Solution : Configuration du Cloudflare Worker

### Étape 1 : Vérifier que le Worker est déployé

Si vous avez déjà déployé le Worker, vous devriez avoir une URL comme :
`https://canva-proxy.votre-subdomain.workers.dev`

### Étape 2 : Configurer la variable d'environnement

1. Ouvrez le fichier `frontend/.env` (créez-le s'il n'existe pas)
2. Ajoutez la ligne suivante :

```env
REACT_APP_CANVA_PROXY_URL=https://canva-proxy.votre-subdomain.workers.dev
```

**Important** : Remplacez `canva-proxy.votre-subdomain.workers.dev` par l'URL réelle de votre Worker.

### Étape 3 : Redémarrer le serveur de développement

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis redémarrez-le
npm start
```

Les variables d'environnement ne sont chargées qu'au démarrage !

### Étape 4 : Vérifier dans la console

Ouvrez la console du navigateur (F12) et regardez les messages. Vous devriez voir :
- Si le proxy est configuré : "Image chargée avec succès"
- Si le proxy n'est pas configuré : "⚠️ URL Canva détectée mais REACT_APP_CANVA_PROXY_URL n'est pas configuré"

## Si vous n'avez pas encore déployé le Worker

Suivez les instructions dans `cloudflare-worker/README.md` pour déployer le Worker.

## Test rapide

Pour tester si le Worker fonctionne, ouvrez cette URL dans votre navigateur (remplacez par votre URL Canva) :

```
https://votre-worker.workers.dev/?url=https://www.canva.com/design/DAG6HlIb8R4/...
```

Si ça fonctionne, vous serez redirigé vers l'image directe.

## Alternative temporaire

En attendant de configurer le Worker, vous pouvez :
1. Télécharger l'image depuis Canva
2. L'uploader sur Imgur (imgur.com)
3. Utiliser l'URL Imgur dans le formulaire













