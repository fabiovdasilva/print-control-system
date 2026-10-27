Option Explicit
Dim fso, shell, root, startupPath, shortcut, link
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
startupPath = shell.SpecialFolders("Startup")
Set shortcut = shell.CreateShortcut(fso.BuildPath(startupPath, "PrintFlow Central.lnk"))
shortcut.TargetPath = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\wscript.exe"
shortcut.Arguments = Chr(34) & fso.BuildPath(root, "Iniciar_Sistema.vbs") & Chr(34)
shortcut.WorkingDirectory = root
shortcut.Description = "Inicia a central PrintFlow em segundo plano após entrar no Windows."
shortcut.Save
MsgBox "A central PrintFlow será iniciada em segundo plano quando este usuário entrar no Windows.", vbInformation, "PrintFlow"
