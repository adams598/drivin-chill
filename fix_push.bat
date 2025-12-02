@echo off
echo Creation d'une nouvelle branche propre...
git checkout --orphan dev-clean
git add .
git commit -m "Initial commit - code propre sans secrets"
echo.
echo Suppression de l'ancienne branche dev...
git branch -D dev
echo.
echo Renommage de la branche...
git branch -m dev
echo.
echo Force push vers GitHub...
git push -f origin dev
echo.
echo Termine!








