Option Explicit
Dim fso, shell, root
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
' A central exibe a chave administrativa e serve o painel web na mesma porta.
shell.Run Chr(34) & root & "\Iniciar_Sistema_Servidor.bat" & Chr(34), 1, False
