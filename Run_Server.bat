@echo off
setlocal
cd /d "%~dp0"
title PrintFlow - Central de monitoramento
color 0B
set "DOTNET_CMD=dotnet"
where dotnet >nul 2>nul
if errorlevel 1 if exist ".dotnet\dotnet.exe" set "DOTNET_CMD=%~dp0.dotnet\dotnet.exe"
if not exist "ServerMock\ServerMock.csproj" (
  echo Nao encontrei ServerMock\ServerMock.csproj na pasta do projeto.
  pause
  exit /b 1
)
echo Iniciando a central PrintFlow na porta 5000...
echo Copie a chave administrativa exibida no console para acessar o painel.
"%DOTNET_CMD%" run --project ServerMock\ServerMock.csproj
pause
