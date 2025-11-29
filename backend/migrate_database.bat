@echo off
echo ========================================
echo Migration de la base de donnees MongoDB
echo ========================================
echo.

cd /d %~dp0

python migrate_database.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERREUR: La migration a echoue
    pause
    exit /b 1
)

echo.
echo Migration terminee avec succes !
pause

