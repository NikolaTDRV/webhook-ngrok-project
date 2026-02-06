$ErrorActionPreference = "Stop"
if (-not $env:REPO_URL) { throw "Missing REPO_URL" }
if (-not $env:DEPLOY_DIR) { throw "Missing DEPLOY_DIR" }
if (-not $env:TARGET_BRANCH) { $env:TARGET_BRANCH = "main" }
Write-Host "== Deploy started =="
Write-Host "Repo: $env:REPO_URL"
Write-Host "Dir: $env:DEPLOY_DIR"
Write-Host "Branch: $env:TARGET_BRANCH"
$deployDir = $env:DEPLOY_DIR
if (-not (Test-Path "$deployDir\.git")) {
	Write-Host "Cloning..."
	git clone --branch $env:TARGET_BRANCH $env:REPO_URL $deployDir
} else {
	Write-Host "Pulling latest..."
	git -C $deployDir fetch --all
	git -C $deployDir checkout $env:TARGET_BRANCH
	git -C $deployDir pull --ff-only
}
Write-Host "Installing dependencies..."
Set-Location $deployDir
npm install
Write-Host "Starting app..."
# Démarrer en arrière-plan et écrire les logs
$npmScripts = (npm run) | Out-String
# si l'app React a été créée avec create-react-app
if ($npmScripts -match "\sstart\s") {
	Start-Process -FilePath "npm" -ArgumentList "run","start" -RedirectStandardOutput "app.log" -RedirectStandardError "app.err.log"
	Write-Host "Started with: npm run start"
}
# si l'app React a été créée avec vite
elseif ($npmScripts -match "\sdev\s") {
	Start-Process -FilePath "npm" -ArgumentList "run","dev","--","--host","0.0.0.0" -RedirectStandardOutput "app.log" -RedirectStandardError "app.err.log"
	Write-Host "Started with: npm run dev"
}
else {
	throw "No start/dev script found in package.json"
}
Write-Host "== Deploy done =="
