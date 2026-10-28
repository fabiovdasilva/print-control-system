$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$commandDirectory = Join-Path $projectRoot ".operacao"
$requestFile = Join-Path $commandDirectory "restart.request"
$resultFile = Join-Path $commandDirectory "restart.result"
$logFile = Join-Path $commandDirectory "restart.worker.log"
$port = if ($env:PRINT_CONTROL_PORT) { [int]$env:PRINT_CONTROL_PORT } else { 5000 }

New-Item -ItemType Directory -Path $commandDirectory -Force | Out-Null

# A global mutex prevents duplicate watchers from racing after server logon.
$mutex = [System.Threading.Mutex]::new($false, "Global\PrintFlowRestartCommandWatcher")
try {
  if (!$mutex.WaitOne(0)) { exit 0 }
} catch [System.Threading.AbandonedMutexException] {
  # An abandoned mutex is acquired by this process; continue as the sole worker.
}

function Write-Result([string] $message) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $content = "[$timestamp] $message"
  Set-Content -LiteralPath $resultFile -Value $content -Encoding UTF8
  Add-Content -LiteralPath $logFile -Value $content -Encoding UTF8
}

function Stop-PrintFlowCentral {
  $listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $listeners) {
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
    if (!$owner -or $owner.CommandLine -notmatch "ServerMock") {
      throw "A porta $port está ocupada por outro aplicativo. Nada foi encerrado."
    }
    Stop-Process -Id $processId -Force
  }
}

try {
  while ($true) {
    if (Test-Path -LiteralPath $requestFile) {
      $claimFile = Join-Path $commandDirectory ("restart.processing." + [guid]::NewGuid().ToString("N"))
      try {
        Move-Item -LiteralPath $requestFile -Destination $claimFile -ErrorAction Stop
      } catch {
        Start-Sleep -Milliseconds 500
        continue
      }

      try {
        Write-Result "Comando recebido. Reiniciando a central PrintFlow na porta $port."
        Stop-PrintFlowCentral
        $startScript = Join-Path $projectRoot "scripts\Start-Central.ps1"
        $powerShell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
        Start-Process -FilePath $powerShell -ArgumentList ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $startScript + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden | Out-Null

        $deadline = (Get-Date).AddSeconds(45)
        $started = $false
        while ((Get-Date) -lt $deadline) {
          Start-Sleep -Seconds 1
          $health = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
          if ($health -and $health.StatusCode -eq 200) { $started = $true; break }
        }
        if (!$started) { throw "A central não confirmou saúde dentro de 45 segundos. Consulte central-error.log." }
        Write-Result "Reinício concluído. A central está respondendo na porta $port."
      } catch {
        Write-Result "Falha no reinício: $($_.Exception.Message)"
      } finally {
        Remove-Item -LiteralPath $claimFile -Force -ErrorAction SilentlyContinue
      }
    }
    Start-Sleep -Seconds 2
  }
} finally {
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
