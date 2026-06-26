@echo off
title Parando o Sistema
echo Encerrando serviços em segundo plano...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM dotnet.exe >nul 2>&1
taskkill /F /IM Agent.exe >nul 2>&1
echo Serviços encerrados!
timeout /t 2 >nul
