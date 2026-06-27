Set WshShell = CreateObject("WScript.Shell")
' Inicia o Backend (Servidor C#) de forma oculta (0 = janela escondida)
WshShell.Run "cmd /c cd /d C:\print_agent\ServerMock\bin\Debug\net8.0 && ServerMock.exe", 0, False
' Inicia o Frontend (Painel React/Vite) de forma oculta
WshShell.Run "cmd /c cd /d C:\print_agent\AdminPanelV2 && npm run dev", 0, False
