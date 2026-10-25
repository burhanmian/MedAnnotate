@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js 22 LTS, then run this launcher again.
 pause
 exit /b 1
)
start "" "http://127.0.0.1:8787"
node serve.cjs
pause
