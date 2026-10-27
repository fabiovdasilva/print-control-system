@echo off
setlocal
cd /d "%~dp0AdminPanelV2"
title PrintFlow - Painel administrativo
color 0E
echo Iniciando o painel em http://localhost:5173 ...
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js e npm precisam estar instalados para iniciar o painel.
  echo Consulte o README.md do projeto.
  pause
  exit /b 1
)
call npm run dev
pause
