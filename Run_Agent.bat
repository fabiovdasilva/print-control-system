@echo off
setlocal
cd /d "%~dp0"
title PrintFlow - Agente local
color 0A
echo Iniciando o agente em modo de desenvolvimento.
echo Em clientes, use o instalador baixado pela tela do cliente.
set "DOTNET_CMD=dotnet"
where dotnet >nul 2>nul
if errorlevel 1 if exist ".dotnet\dotnet.exe" set "DOTNET_CMD=%~dp0.dotnet\dotnet.exe"
"%DOTNET_CMD%" run --project Agent\Agent.csproj
pause
