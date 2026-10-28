Option Explicit
Dim fso, shell, root, command
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
command = """" & shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & root & "\scripts\Start-Central.ps1"""
shell.Run command, 0, False

' Start the shared-folder restart listener once for this server logon.
Dim watcherScript, watcherCommand
watcherScript = root & "\scripts\Watch-RestartCommand.ps1"
If fso.FileExists(watcherScript) Then
  watcherCommand = """" & shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & watcherScript & """
  shell.Run watcherCommand, 0, False
End If
