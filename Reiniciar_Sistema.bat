@echo off
title Reiniciando o Sistema
echo Reiniciando todos os modulos de forma limpa...
call "%~dp0Parar_Sistema.bat"
start wscript.exe "%~dp0Iniciar_Sistema.vbs"
echo.
echo Sistema reiniciado com sucesso! A janela fechara sozinha.
timeout /t 3 >nul
