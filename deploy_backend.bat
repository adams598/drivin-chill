@echo off
echo ========================================
echo Deploiement du Backend sur Vercel
echo ========================================
echo.

cd /d %~dp0backend

echo Verification de l'installation de Vercel CLI...
where vercel >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Vercel CLI n'est pas installe.
    echo Installation en cours...
    npm install -g vercel
    if %ERRORLEVEL% NEQ 0 (
        echo ERREUR: Impossible d'installer Vercel CLI
        echo Installez-le manuellement: npm install -g vercel
        pause
        exit /b 1
    )
)

echo.
echo Connexion a Vercel...
vercel login

if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: Echec de la connexion
    pause
    exit /b 1
)

echo.
echo Deploiement en cours...
vercel --prod

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERREUR: Le deploiement a echoue
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deploiement termine avec succes !
echo ========================================
echo.
echo N'oubliez pas de configurer les variables d'environnement dans Vercel:
echo - MONGO_URL
echo - DB_NAME
echo - ADMIN_TOKEN
echo - CORS_ORIGINS
echo.
pause

