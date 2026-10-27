$port = if ($env:PRINT_CONTROL_PORT) { [int]$env:PRINT_CONTROL_PORT } else { 5000 }
$listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique

if (!$listeners) {
  Write-Output "A central PrintFlow não está em execução."
  exit 0
}

foreach ($processId in $listeners) {
  $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
  if (!$owner -or $owner.CommandLine -notmatch "ServerMock") {
    Write-Error "A porta $port pertence a outro programa; ele não será encerrado."
    exit 1
  }
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}
Write-Output "Central PrintFlow encerrada."
