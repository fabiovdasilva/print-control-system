@echo off
setlocal
title PrintFlow - Inicializador do servidor
if not exist "%~dp0Run_Server_Rede.bat" (
  echo Nao encontrei Run_Server_Rede.bat na pasta do projeto.
  pause
  exit /b 1
)
if not exist "%~dp0Run_Painel_Rede.bat" (
  echo Nao encontrei Run_Painel_Rede.bat na pasta do projeto.
  pause
  exit /b 1
)
echo Iniciando central e painel em janelas separadas...
start "PrintFlow Central - 5000" "%ComSpec%" /k call "%~dp0Run_Server_Rede.bat"
start "PrintFlow Painel - 5173" "%ComSpec%" /k call "%~dp0Run_Painel_Rede.bat"
echo Central: http://192.168.0.225:5000
echo Painel:   http://192.168.0.225:5173
echo PrintControl na porta 5001 permanece intacto.
pause