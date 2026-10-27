@echo off
setlocal
title PrintFlow - Configurar senha administrativa
set "SCRIPT=%~dp0scripts\Setup-Admin-Password.ps1"
if not exist "%SCRIPT%" (
  echo Nao encontrei o configurador em:
  echo %SCRIPT%
  pause
  exit /b 1
)
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%SCRIPT%"
if errorlevel 1 (
  echo.
  echo O configurador encontrou um erro. Leia a mensagem acima e confirme se o .NET Framework do Windows esta disponivel.
  pause
  exit /b 1
)
endlocal
