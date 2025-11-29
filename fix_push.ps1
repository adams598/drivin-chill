Write-Host "Creation d'une nouvelle branche propre..." -ForegroundColor Green
git checkout --orphan dev-clean
git add .
git commit -m "Initial commit - code propre sans secrets"
Write-Host ""
Write-Host "Suppression de l'ancienne branche dev..." -ForegroundColor Yellow
git branch -D dev
Write-Host ""
Write-Host "Renommage de la branche..." -ForegroundColor Yellow
git branch -m dev
Write-Host ""
Write-Host "Force push vers GitHub..." -ForegroundColor Green
git push -f origin dev
Write-Host ""
Write-Host "Termine!" -ForegroundColor Green

