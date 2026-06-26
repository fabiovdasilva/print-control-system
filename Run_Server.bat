@echo off
title Servidor Falso (Mock Cloud)
color 0B
echo Iniciando o Servidor Web na porta 5000...
cd /d "C:\print_agent\ServerMock"
"C:\Users\Admin\AppData\Local\Microsoft\dotnet\dotnet.exe" run
pause
