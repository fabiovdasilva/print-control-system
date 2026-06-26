@echo off
title Encerrar Todos os Servidores
color 0C
echo Encerrando o Servidor Backend, o Painel Web e o Agente...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM dotnet.exe >nul 2>&1
taskkill /F /IM Agent.exe >nul 2>&1
echo Feito! Todos os servicos foram desligados.
pause
