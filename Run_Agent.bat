@echo off
title Agente de Bilhetagem (Worker)
color 0A
echo Iniciando o Agente de Bilhetagem...
cd /d "C:\print_agent\Agent\bin\Debug\net8.0"
Agent.exe
pause
