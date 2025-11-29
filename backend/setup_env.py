#!/usr/bin/env python3
"""
Script pour créer le fichier .env depuis env.example
"""
from pathlib import Path
import shutil

if __name__ == "__main__":
    backend_dir = Path(__file__).parent
    env_example = backend_dir / "env.example"
    env_file = backend_dir / ".env"
    
    if env_file.exists():
        print(f"✅ Le fichier .env existe déjà à {env_file}")
        response = input("Voulez-vous le remplacer ? (o/N) : ")
        if response.lower() != 'o':
            print("❌ Opération annulée")
            exit(0)
    
    if not env_example.exists():
        print(f"❌ Le fichier env.example n'existe pas à {env_example}")
        exit(1)
    
    # Copier env.example vers .env
    shutil.copy(env_example, env_file)
    print(f"✅ Fichier .env créé depuis {env_example}")
    print(f"📝 Éditez maintenant {env_file} et configurez au minimum :")
    print("   - MONGO_URL (mongodb://localhost:27017 ou MongoDB Atlas)")
    print("   - DB_NAME (drivinnchill)")
    print("   - ADMIN_TOKEN (admin_token_2024)")
    print("   - CORS_ORIGINS (http://localhost:3000)")

