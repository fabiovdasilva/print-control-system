@echo off
setlocal
pushd "%~dp0AdminPanelV2"
if errorlevel 1 (
  echo Nao foi possivel acessar AdminPanelV2.
  pause
  exit /b 1
)
title PrintFlow - Painel no servidor da rede
color 0E
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js e npm precisam estar instalados no servidor.
  pause
  popd
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencias do painel ausentes. Execute npm install nesta pasta.
  pause
  popd
  exit /b 1
)
echo Painel PrintFlow em http://192.168.0.225:5173
call npm run dev -- --host 0.0.0.0 --port 5173
set "EXIT_CODE=%ERRORLEVEL%"
popd
pause
exit /b %EXIT_CODE%