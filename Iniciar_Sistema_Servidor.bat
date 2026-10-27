@echo off
setlocal
title PrintFlow - Inicializador do servidor
if not exist "%~dp0Run_Server_Rede.bat" (
  echo Nao encontrei Run_Server_Rede.bat na pasta do projeto.
  pause
  exit /b 1
)
echo Iniciando a central PrintFlow em um unico servico.
echo URL: http://192.168.0.225:5000
echo O PrintControl existente na porta 5001 nao sera alterado.
call "%~dp0Run_Server_Rede.bat"
exit /b %ERRORLEVEL%