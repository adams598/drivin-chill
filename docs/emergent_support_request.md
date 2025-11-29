# Support Request: Drivinnchill Halloween Scheduling Issue

**Job ID:** _Please insert the current deployment job identifier before sending._

```
🚨 RAPPORT DE PROBLÈME - SYSTÈME DE PROGRAMMATION DE FILMS
Domaine: drivinnchill.fr
Type d'application: Drive-in cinema (FastAPI + React + MongoDB)
Urgence: CRITIQUE - Événement Halloween dans 9 jours (29 oct - 1er nov 2025)

📋 PROBLÈME PRINCIPAL
Le système de programmation de films ne fonctionne pas dans l'interface admin. Lorsque l'administrateur tente de programmer un film, aucune action ne se produit et les films n'apparaissent pas sur le site public.

🔴 SYMPTÔMES
    1    Interface Admin:
    •    L'onglet "Films" s'affiche avec 12 films en base
    •    Le formulaire de programmation semble absent ou non fonctionnel
    •    Aucun film programmé n'apparaît dans la liste après tentative
    2    Site Public (drivinnchill.fr):
    •    Message "Aucun film programmé" s'affiche
    •    Les 12 films programmés en base de données ne sont pas visibles
    3    API Backend:
    •    /api/weekly-schedule retourne erreur 500
    •    Message d'erreur: "time_slot: Input should be '21h15', '23h45' or '01h30' [type=enum, input_value='19h00']"
    4    Déploiement:
    •    Multiple redéploiements effectués
    •    Les changements de code ne semblent pas se refléter sur drivinnchill.fr
    •    Le site charge toujours un ancien build JavaScript (main.7591f873.js)

🔍 DIAGNOSTICS EFFECTUÉS
1. Base de Données (MongoDB)
    •    ✅ 12 films créés et actifs
    •    ✅ 12 programmations créées dans content_schedules
    •    ✅ Tous les time_slot sont corrects: "21h15", "23h45", "01h30"
    •    ✅ Dates correctes: 2025-10-29, 2025-10-30, 2025-10-31, 2025-11-01
    •    ✅ Capacité: 25 places par film
2. Code Backend (server.py)
    •    ✅ API /api/movies fonctionne (retourne 12 films)
    •    ✅ API /api/content-schedules contient les 12 programmations
    •    ❌ API /api/weekly-schedule échoue avec erreur "19h00"
    •    Backend TimeSlot enum: "21h15", "23h45", "01h30"
3. Code Frontend (App.js)
    •    ✅ Code source corrigé pour utiliser les bonnes valeurs backend
    •    ✅ Modifications: value: '21h15' au lieu de value: '19h00'
    •    ❌ Le site en production utilise toujours l'ANCIEN build
    •    Le JavaScript déployé contient encore value: '19h00'
4. URLs et Configuration
    •    Site accessible via: https://drivinnchill.fr
    •    Ancienne URL preview: https://drivin-chill.emergent.host
    •    Certaines requêtes API appellent encore l'ancienne URL
    •    Variable d'environnement REACT_APP_BACKEND_URL modifiée plusieurs fois

🛠️ ACTIONS DÉJÀ TENTÉES
    1    Code:
    •    Corrigé les valeurs time_slot dans App.js (lignes 320, 345)
    •    Nettoyé les logs de debug dans server.py
    •    Vérifié tous les composants React liés à la programmation
    2    Base de Données:
    •    Supprimé et recréé les programmations (×8 fois)
    •    Nettoyé les collections movie_schedules et content_schedules
    •    Vérifié l'absence de données corrompues avec "19h00"
    3    Services:
    •    Redémarré backend (×10+ fois)
    •    Redémarré frontend (×10+ fois)
    •    Redémarré tous les services (×3 fois)
    •    Nettoyé les caches Python (__pycache__, *.pyc)
    •    Supprimé build/ et node_modules/.cache/
    4    Déploiement:
    •    Effectué plusieurs redéploiements complets
    •    Aucun changement visible sur drivinnchill.fr
    •    Le build JavaScript reste identique (main.7591f873.js)

🎯 CAUSE SUSPECTÉE
Problème de déploiement/cache : Le site drivinnchill.fr charge un ancien build JavaScript qui contient le code bugué avec value: '19h00'. Malgré les modifications du code source et les redéploiements, le nouveau build n'est pas déployé ou n'est pas servi par le serveur.
Hypothèses:
    1    Cache CDN/proxy qui n'est pas invalidé lors du déploiement
    2    Configuration du domaine personnalisé pointant vers un ancien build
    3    Build statique non régénéré lors du déploiement
    4    Conflit entre l'ancienne URL (drivin-chill.emergent.host) et la nouvelle (drivinnchill.fr)

❓ QUESTIONS POUR LE SUPPORT
    1    Déploiement: Pourquoi les changements de code ne se reflètent-ils pas sur drivinnchill.fr après redéploiement ?
    2    Cache: Y a-t-il un cache CDN/proxy qui doit être manuellement invalidé ?
    3    Build: Le build React est-il correctement régénéré et déployé à chaque déploiement ?
    4    Domaine: Y a-t-il un problème de configuration entre le domaine personnalisé et le déploiement ?
    5    Logs: Pouvez-vous vérifier les logs de déploiement pour identifier pourquoi le nouveau build n'est pas servi ?

📊 DONNÉES TECHNIQUES
Stack:
    •    Backend: FastAPI (Python)
    •    Frontend: React
    •    Base de données: MongoDB
    •    Hébergement: Emergent (Kubernetes)
Fichiers modifiés:
    •    /app/frontend/src/App.js (lignes 310-370)
    •    /app/backend/server.py (nettoyage de logs)
Collections MongoDB:
    •    movies: 12 documents
    •    content_schedules: 12 documents (dates 2025-10-29 à 2025-11-01)
    •    time_slot_settings: Configuration des horaires

⏰ URGENCE
Événement dans 9 jours - L'utilisateur doit absolument pouvoir programmer les films pour son événement Halloween (29 oct - 1er nov 2025). Le système de réservation fonctionne, mais sans films programmés, les clients ne peuvent rien réserver.

🙏 DEMANDE D'ASSISTANCE
Nous avons besoin d'aide pour :
    1    Identifier pourquoi le nouveau build ne se déploie pas
    2    Forcer un déploiement propre avec invalidation de cache
    3    Vérifier la configuration du domaine personnalisé
    4    Ou fournir une solution alternative pour programmer les films rapidement
Merci d'avance pour votre aide !

Copiez ce rapport et envoyez-le au support Emergent avec votre Job ID. Cela leur donnera toutes les informations nécessaires pour vous aider rapidement ! 🚀
```

_Remarque : ce fichier reprend intégralement le rapport de diagnostic pour transmission au support Emergent._
