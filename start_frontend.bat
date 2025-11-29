@echo off
echo ========================================
echo   Demarrage du Frontend Drivinnchill
echo ========================================
echo.

cd frontend

REM Verifier si .env existe
if not exist .env (
    echo [INFO] Fichier .env non trouve
    echo [INFO] Copie de env.example vers .env...
    copy env.example .env
    echo.
    echo [INFO] REACT_APP_BACKEND_URL configure sur http://localhost:8000
    echo.
)

REM Installer les dependances si node_modules n'existe pas
if not exist node_modules (
    echo [INFO] Installation des dependances...
    call npm install
    echo.
)

echo.
echo [INFO] Demarrage du serveur de developpement...
echo [INFO] Frontend disponible sur http://localhost:3000
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

call npm start

pause

