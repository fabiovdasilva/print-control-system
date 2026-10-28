@echo off
setlocal
title Reiniciar PrintFlow no servidor

set "COMMAND_DIR=%~dp0.operacao"
set "REQUEST_FILE=%COMMAND_DIR%\restart.request"
set "RESULT_FILE=%COMMAND_DIR%\restart.result"

if not exist "%COMMAND_DIR%" mkdir "%COMMAND_DIR%" 2>nul
if not exist "%COMMAND_DIR%" (
  echo Nao foi possivel acessar a pasta compartilhada do servidor.
  pause
  exit /b 1
)

>"%REQUEST_FILE%" echo %DATE% %TIME% - %COMPUTERNAME%
echo Pedido enviado ao servidor. A central deve reiniciar em instantes.
echo O resultado sera salvo em: %RESULT_FILE%
timeout /t 4 >nul
if exist "%RESULT_FILE%" type "%RESULT_FILE%"
endlocal
