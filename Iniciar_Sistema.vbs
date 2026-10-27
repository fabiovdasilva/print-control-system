Option Explicit
Dim fso, shell, root
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
' A central fica visível para mostrar a chave administrativa no primeiro início.
shell.Run Chr(34) & root & "\Run_Server.bat" & Chr(34), 1, False
' O painel roda em segundo plano; abra http://localhost:5173 no navegador.
shell.Run Chr(34) & root & "\Run_AdminPanel.bat" & Chr(34), 0, False
