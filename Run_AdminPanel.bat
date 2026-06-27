@echo off
title Painel Web Administrativo (Frontend)
color 0E
echo Iniciando o Painel de Administracao na porta 5173...
echo Acesse http://localhost:5173 no seu navegador.
cd /d "%~dp0AdminPanelV2"
call npm run dev
pause
