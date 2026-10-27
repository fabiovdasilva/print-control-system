@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 (
  echo Nao foi possivel acessar a pasta do projeto no servidor.
  pause
  exit /b 1
)
title PrintFlow - Central no servidor da rede
color 0B
set "PRINT_CONTROL_LISTEN_URL=http://0.0.0.0:5000"
set "PRINT_CONTROL_CORS_ORIGINS=http://192.168.0.225:5173;http://localhost:5173;http://127.0.0.1:5173"
if not defined LOCALAPPDATA set "LOCALAPPDATA=%USERPROFILE%\AppData\Local"
if not exist "%LOCALAPPDATA%\PrintFlow" mkdir "%LOCALAPPDATA%\PrintFlow"
set "PRINT_CONTROL_DB_PATH=%LOCALAPPDATA%\PrintFlow\printcontrol.db"
set "DOTNET_CMD=dotnet"
where dotnet >nul 2>nul
if errorlevel 1 if exist "%~dp0.dotnet\dotnet.exe" set "DOTNET_CMD=%~dp0.dotnet\dotnet.exe"
if not exist "ServerMock\ServerMock.csproj" (
  echo Nao encontrei ServerMock\ServerMock.csproj.
  pause
  popd
  exit /b 1
)
echo Central PrintFlow em http://192.168.0.225:5000
echo A porta 5001 do PrintControl existente nao sera usada.
echo Copie a chave administrativa exibida abaixo para entrar no painel.
"%DOTNET_CMD%" run --project ServerMock\ServerMock.csproj --no-launch-profile
set "EXIT_CODE=%ERRORLEVEL%"
popd
pause
exit /b %EXIT_CODE%