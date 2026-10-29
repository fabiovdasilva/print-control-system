Option Explicit
Dim fso, shell, root, powershell, command
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
command = Chr(34) & powershell & Chr(34) & " -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Chr(34) & root & "\scripts\Start-Central.ps1" & Chr(34)
shell.Run command, 0, False

' Start the shared-folder restart listener once for this server logon.
Dim watcherScript, watcherCommand
watcherScript = root & "\scripts\Watch-RestartCommand.ps1"
If fso.FileExists(watcherScript) Then
  watcherCommand = Chr(34) & powershell & Chr(34) & " -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Chr(34) & watcherScript & Chr(34)
  shell.Run watcherCommand, 0, False
End If
