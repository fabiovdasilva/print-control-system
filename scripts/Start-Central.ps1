$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$projectFile = Join-Path $projectRoot "ServerMock\ServerMock.csproj"
$dataDirectory = if ($env:PRINT_CONTROL_DATA_DIRECTORY) { $env:PRINT_CONTROL_DATA_DIRECTORY } else { Join-Path $env:LOCALAPPDATA "PrintFlow" }
New-Item -ItemType Directory -Path $dataDirectory -Force | Out-Null
$credentialFile = if ($env:PRINT_CONTROL_ADMIN_AUTH_FILE) { $env:PRINT_CONTROL_ADMIN_AUTH_FILE } else { Join-Path $dataDirectory "admin-auth.json" }
$logDirectory = if ($env:PRINT_CONTROL_LOG_DIRECTORY) { $env:PRINT_CONTROL_LOG_DIRECTORY } else { $dataDirectory }
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$stdoutLog = Join-Path $logDirectory "central.log"
$stderrLog = Join-Path $logDirectory "central-error.log"

function Show-Notice([string] $message) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show($message, "PrintFlow", "OK", "Information") | Out-Null
}

if (!(Test-Path -LiteralPath $credentialFile)) {
  Show-Notice "Configure a senha administrativa antes de iniciar. Abra Configurar_Senha_Admin.vbs."
  exit 1
}
if (!(Test-Path -LiteralPath $projectFile)) {
  Show-Notice "Não encontrei a central na pasta do projeto."
  exit 1
}

$port = if ($env:PRINT_CONTROL_PORT) { [int]$env:PRINT_CONTROL_PORT } else { 5000 }
$listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
  if ($owner -and $owner.CommandLine -match "ServerMock") { exit 0 }
  Show-Notice "A porta $port já está sendo usada por outro programa. A central não foi iniciada."
  exit 1
}

$dotnetCommand = Get-Command dotnet.exe -ErrorAction SilentlyContinue
$dotnetPath = if ($dotnetCommand) { $dotnetCommand.Source } else { Join-Path $projectRoot ".dotnet\dotnet.exe" }
if (!(Test-Path -LiteralPath $dotnetPath)) {
  Show-Notice "Instale o .NET 8 SDK neste computador para iniciar a central."
  exit 1
}

$env:PRINT_CONTROL_LISTEN_URL = if ($env:PRINT_CONTROL_LISTEN_URL) { $env:PRINT_CONTROL_LISTEN_URL } else { "http://0.0.0.0:$port" }
$env:PRINT_CONTROL_DB_PATH = if ($env:PRINT_CONTROL_DB_PATH) { $env:PRINT_CONTROL_DB_PATH } else { Join-Path $dataDirectory "printcontrol.db" }
$env:PRINT_CONTROL_ADMIN_AUTH_FILE = $credentialFile
$env:PRINT_CONTROL_CORS_ORIGINS = if ($env:PRINT_CONTROL_CORS_ORIGINS) { $env:PRINT_CONTROL_CORS_ORIGINS } else { "http://localhost:5173;http://127.0.0.1:5173;http://192.168.0.225:5173" }
$arguments = 'run --project "' + $projectFile + '" --no-launch-profile'
Start-Process -FilePath $dotnetPath -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog | Out-Null
