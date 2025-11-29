#!/usr/bin/env python3
"""
Script pour démarrer le serveur FastAPI en local
"""
import uvicorn
import os
from pathlib import Path
from dotenv import load_dotenv

if __name__ == "__main__":
    # Charger le .env s'il existe
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Fichier .env chargé depuis {env_path}")
    else:
        print(f"⚠️  Fichier .env non trouvé à {env_path}")
        print("   Créez un fichier .env ou copiez env.example vers .env")
        print("   Le serveur démarrera avec des valeurs par défaut")
    
    # Vérifier que les variables d'environnement sont définies
    if not os.environ.get('MONGO_URL'):
        print("⚠️  MONGO_URL non défini dans .env")
        print("   Utilisation de la valeur par défaut : mongodb://localhost:27017")
        print("   Pour utiliser MongoDB Atlas, ajoutez MONGO_URL dans .env")
    
    if not os.environ.get('DB_NAME'):
        print("⚠️  DB_NAME non défini dans .env")
        print("   Utilisation de la valeur par défaut : drivinnchill")
    
    print("\n🚀 Démarrage du serveur FastAPI...")
    print("📡 API disponible sur http://localhost:8000")
    print("📚 Documentation sur http://localhost:8000/docs")
    print("🔧 Interface alternative sur http://localhost:8000/redoc")
    print("\n💡 Note : Si MongoDB n'est pas démarré, certaines fonctionnalités seront limitées")
    print("   Le serveur démarrera quand même pour vous permettre de tester l'API")
    print("\n⚠️  Appuyez sur Ctrl+C pour arrêter le serveur\n")
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Recharge automatiquement lors des modifications
        log_level="info"
    )

