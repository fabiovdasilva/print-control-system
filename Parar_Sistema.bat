@echo off
setlocal
title Parando o Sistema
echo Encerrando apenas a central PrintFlow na porta 5000...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$pids = Get-NetTCPConnection -State Listen -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($processId in $pids) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }"
echo Central encerrada. O PrintControl na porta 5001 e os agentes continuam ativos.
timeout /t 2 >nul
endlocal
