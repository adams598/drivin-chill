@echo off
echo ========================================
echo   Demarrage du Backend Drivinnchill
echo ========================================
echo.

cd backend

REM Verifier si .env existe
if not exist .env (
    echo [INFO] Fichier .env non trouve
    echo [INFO] Copie de env.example vers .env...
    copy env.example .env
    echo.
    echo [ATTENTION] Veuillez editer le fichier .env et configurer au minimum:
    echo   - MONGO_URL
    echo   - DB_NAME
    echo.
    pause
)

REM Activer l'environnement virtuel s'il existe
if exist venv\Scripts\activate.bat (
    echo [INFO] Activation de l'environnement virtuel...
    call venv\Scripts\activate.bat
)

REM Installer les dependances si requirements.txt existe
if exist requirements.txt (
    echo [INFO] Verification des dependances...
    pip install -r requirements.txt --quiet
)

echo.
echo [INFO] Demarrage du serveur FastAPI...
echo [INFO] API disponible sur http://localhost:8000
echo [INFO] Documentation sur http://localhost:8000/docs
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

python start_local.py

pause

