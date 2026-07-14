@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "installer\install.ps1"
