# Sets up Proposal Generator: deps, .env, db, build, desktop shortcut.
# ponytail: single script instead of an installer framework — this is the whole job.
$ErrorActionPreference = "Stop"
$AppDir = Split-Path -Parent $PSScriptRoot

function Fail($msg) {
    Write-Host $msg -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Start-Process "https://nodejs.org/en/download"
    Fail "Node.js is required. Opened the download page — install it, then run this installer again."
}

Set-Location $AppDir

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }

if (-not (Test-Path "$AppDir\.env")) {
    Copy-Item "$AppDir\.env.example" "$AppDir\.env"
    $key = Read-Host "Enter your Gemini API key (leave blank to set it later in .env)"
    if ($key) {
        (Get-Content "$AppDir\.env") -replace 'your-gemini-api-key', $key | Set-Content "$AppDir\.env"
    }
}

Write-Host "Setting up database..." -ForegroundColor Cyan
npx prisma generate
npx prisma db push
if ($LASTEXITCODE -ne 0) { Fail "Database setup failed." }

Write-Host "Building app..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Fail "Build failed." }

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Proposal Generator.lnk")
$Shortcut.TargetPath = "$AppDir\installer\start.bat"
$Shortcut.WorkingDirectory = $AppDir
$Shortcut.IconLocation = "shell32.dll,220"
$Shortcut.Save()

Write-Host "`nDone. Launch via the 'Proposal Generator' shortcut on your Desktop." -ForegroundColor Green
Read-Host "Press Enter to exit"
