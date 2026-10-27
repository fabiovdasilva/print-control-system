Option Explicit
Dim fso, shell, root, command
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
command = """" & shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"" -NoProfile -STA -ExecutionPolicy Bypass -File """ & root & "\scripts\Setup-Admin-Password.ps1"""
' Mostra a janela temporária para que erros do configurador fiquem visíveis.
shell.Run command, 1, True
