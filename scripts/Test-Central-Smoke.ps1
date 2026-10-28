[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$dotnetPath = Join-Path $projectRoot ".dotnet\dotnet.exe"
$projectFile = Join-Path $projectRoot "ServerMock\ServerMock.csproj"
if (!(Test-Path -LiteralPath $dotnetPath)) { throw "Não encontrei o .NET incluído no projeto." }

$testRoot = Join-Path ([IO.Path]::GetTempPath()) ("PrintFlow-Smoke-" + [Guid]::NewGuid().ToString("N"))
$buildDirectory = Join-Path $testRoot "server"
$dataDirectory = Join-Path $testRoot "data"
$databasePath = Join-Path $dataDirectory "printcontrol.db"
$credentialPath = Join-Path $dataDirectory "admin-auth.json"
$agentPath = Join-Path $testRoot "Agent.exe"
$downloadPath = Join-Path $testRoot "Agent_Setup.exe"
$stdoutPath = Join-Path $testRoot "server.log"
$stderrPath = Join-Path $testRoot "server-error.log"
$process = $null

function Assert-Equal([object] $actual, [object] $expected, [string] $label) {
    if ($actual -ne $expected) { throw "${label}: esperado $expected; recebido $actual." }
}

function Get-FreePort {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = ([Net.IPEndPoint]$listener.LocalEndpoint).Port
    $listener.Stop()
    return $port
}

function Invoke-Central([string] $method, [string] $path, [object] $body = $null, [hashtable] $headers = @{}) {
    $params = @{ Uri = "$serverUrl$path"; Method = $method; WebSession = $session; UseBasicParsing = $true; ErrorAction = "Stop"; Headers = $headers; SkipHttpErrorCheck = $true }
    if ($null -ne $body) {
        $params.ContentType = "application/json"
        $params.Body = if ($body -is [string]) { $body } else { $body | ConvertTo-Json -Compress -Depth 8 }
    }
    $response = Invoke-WebRequest @params
    return [pscustomobject]@{ StatusCode = [int]$response.StatusCode; Content = $response.Content; Headers = $response.Headers }
}

try {
    New-Item -ItemType Directory -Path $testRoot, $dataDirectory -Force | Out-Null
    [IO.File]::WriteAllBytes($agentPath, [Text.Encoding]::ASCII.GetBytes("PrintFlow smoke agent"))

    $password = "Smoke-" + [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(18))
    $salt = [Security.Cryptography.RandomNumberGenerator]::GetBytes(16)
    $iterations = 310000
    $hash = [Security.Cryptography.Rfc2898DeriveBytes]::Pbkdf2($password, $salt, $iterations, [Security.Cryptography.HashAlgorithmName]::SHA256, 32)
    @{ salt = [Convert]::ToBase64String($salt); passwordHash = [Convert]::ToBase64String($hash); iterations = $iterations } |
        ConvertTo-Json -Compress | Set-Content -LiteralPath $credentialPath -Encoding utf8NoBOM

    & $dotnetPath build $projectFile --no-restore -o $buildDirectory | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "A compilação da central de teste falhou." }
    Copy-Item -LiteralPath (Join-Path $projectRoot "ServerMock\wwwroot") -Destination (Join-Path $buildDirectory "wwwroot") -Recurse -Force

    $port = Get-FreePort
    $serverUrl = "http://127.0.0.1:$port"
    $oldEnvironment = @{}
    foreach ($name in "PRINT_CONTROL_DB_PATH", "PRINT_CONTROL_ADMIN_AUTH_FILE", "PRINT_CONTROL_AGENT_EXE", "PRINT_CONTROL_LISTEN_URL") {
        $oldEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
    }
    $env:PRINT_CONTROL_DB_PATH = $databasePath
    $env:PRINT_CONTROL_ADMIN_AUTH_FILE = $credentialPath
    $env:PRINT_CONTROL_AGENT_EXE = $agentPath
    $env:PRINT_CONTROL_LISTEN_URL = $serverUrl
    $process = Start-Process -FilePath $dotnetPath -ArgumentList ('"' + (Join-Path $buildDirectory "ServerMock.dll") + '"') -WorkingDirectory $buildDirectory -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
    foreach ($name in $oldEnvironment.Keys) { [Environment]::SetEnvironmentVariable($name, $oldEnvironment[$name], "Process") }

    $session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try {
            $health = Invoke-WebRequest -UseBasicParsing "$serverUrl/api/health" -TimeoutSec 1
            if ($health.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if (!$ready) { throw "A central temporária não iniciou. Consulte $stderrPath" }

    $index = Invoke-WebRequest -UseBasicParsing "$serverUrl/"
    if ($index.Headers["Cache-Control"] -notmatch "no-store") {
        $observedHeaders = ($index.Headers.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value -join ',')" }) -join "; "
        throw "A entrada HTML não recebeu Cache-Control: no-store. Cabeçalhos: $observedHeaders"
    }

    Assert-Equal (Invoke-Central GET "/api/clients").StatusCode 401 "Clientes sem sessão"
    $login = Invoke-Central POST "/api/auth/login" @{ password = $password }
    Assert-Equal $login.StatusCode 200 "Login administrativo"

    $invalidClient = Invoke-Central POST "/api/clients" @{ name = "" }
    Assert-Equal $invalidClient.StatusCode 400 "Validação de cliente"
    $created = Invoke-Central POST "/api/clients" @{ name = "Cliente Smoke"; doc = "SMOKE"; networkSubnets = "10.10.0.0/24"; snmpCommunity = "public"; pollInterval = 15 }
    Assert-Equal $created.StatusCode 201 "Cadastro de cliente"
    $clientId = ($created.Content | ConvertFrom-Json).id
    if ($clientId -le 0) { throw "O cadastro não retornou um ID de cliente válido." }

    $updated = Invoke-Central PUT "/api/clients/$clientId" @{ name = "Cliente Smoke Atualizado"; pollInterval = 30 }
    Assert-Equal $updated.StatusCode 200 "Atualização de cliente"
    $clients = Invoke-Central GET "/api/clients"
    Assert-Equal $clients.StatusCode 200 "Listagem de clientes"
    if ((($clients.Content | ConvertFrom-Json) | Where-Object id -eq $clientId).name -ne "Cliente Smoke Atualizado") { throw "A atualização do cliente não foi refletida na lista." }

    $download = Invoke-WebRequest -UseBasicParsing -Uri "$serverUrl/api/clients/$clientId/download-agent" -WebSession $session -OutFile $downloadPath -PassThru
    Assert-Equal $download.StatusCode 200 "Geração do instalador do agente"
    $payloadText = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($downloadPath))
    $marker = "___PRINT_AGENT_CONFIG:"
    $start = $payloadText.LastIndexOf($marker, [StringComparison]::Ordinal)
    $end = if ($start -ge 0) { $payloadText.IndexOf("___", $start + $marker.Length, [StringComparison]::Ordinal) } else { -1 }
    if ($start -lt 0 -or $end -le $start) { throw "O instalador não contém a configuração do agente." }
    $configBase64 = $payloadText.Substring($start + $marker.Length, $end - ($start + $marker.Length))
    $agentConfig = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($configBase64)) | ConvertFrom-Json
    Assert-Equal $agentConfig.ClientId $clientId "Vínculo do agente ao cliente"
    Assert-Equal $agentConfig.ServerUrl $serverUrl "Servidor do agente"
    if ([string]::IsNullOrWhiteSpace($agentConfig.AgentToken)) { throw "O instalador não recebeu um token de agente." }

    $agentHeaders = @{ "X-Agent-Client" = "$clientId"; "X-Agent-Token" = "$($agentConfig.AgentToken)" }
    Assert-Equal (Invoke-Central POST "/api/agent/heartbeat" @{ ClientId = $clientId; Hostname = "smoke-host" } $agentHeaders).StatusCode 200 "Heartbeat do agente"
    $commands = Invoke-Central GET "/api/agent/$clientId/commands?hostname=smoke-host" $null $agentHeaders
    Assert-Equal $commands.StatusCode 200 "Consulta de comandos do agente"
    $scan = Invoke-Central POST "/api/admin/force-scan/$clientId" @{ ip = "10.10.0.20" }
    Assert-Equal $scan.StatusCode 202 "Fila de varredura"
    $queuedCommand = Invoke-Central GET "/api/agent/$clientId/commands?hostname=smoke-host" $null $agentHeaders
    if (($queuedCommand.Content | ConvertFrom-Json).Command -ne "SCAN_IP:10.10.0.20") { throw "A varredura não chegou à fila do agente correto." }
    $commandId = ($queuedCommand.Content | ConvertFrom-Json).CommandId
    Assert-Equal (Invoke-Central POST "/api/agent/$clientId/commands/$commandId/ack" @{ Succeeded = $true } $agentHeaders).StatusCode 200 "Confirmação do comando do agente"
    Assert-Equal (Invoke-Central POST "/api/agent/heartbeat" @{ ClientId = $clientId; Hostname = "smoke-host" } @{ "X-Agent-Client" = "$clientId"; "X-Agent-Token" = "invalid" }).StatusCode 401 "Rejeição de token inválido"

    $report = Invoke-Central POST "/api/agent/report-printers" @{ ClientId = $clientId; ScannedIps = @("10.10.0.20"); Printers = @(@{ IP = "10.10.0.20"; Model = "Smoke Laser"; Status = "online"; PagesTotal = 12; SerialNumber = "SMOKE-001"; Firmware = "1.0"; TonerLevel = 85; DrumLevel = 92 }) } $agentHeaders
    Assert-Equal $report.StatusCode 200 "Relatório de impressora"
    Assert-Equal (Invoke-Central POST "/api/quotas" @{ clientId = $clientId; userName = "smoke-user"; maxPages = 100; isBlocked = $false }).StatusCode 200 "Cadastro de cota"
    Assert-Equal (Invoke-Central POST "/api/agent/report-job" @{ ClientId = $clientId; PrinterModel = "Smoke Laser"; DocumentName = "smoke.pdf"; UserName = "smoke-user"; UserIp = "10.10.0.10"; TotalPages = 3 } $agentHeaders).StatusCode 200 "Relatório de trabalho"
    $quotas = Invoke-Central GET "/api/agent/$clientId/quotas" $null $agentHeaders
    Assert-Equal $quotas.StatusCode 200 "Cotas visíveis ao agente"
    if ((($quotas.Content | ConvertFrom-Json) | Where-Object UserName -eq "smoke-user").PagesUsed -ne 3) { throw "A contagem de páginas da cota não foi atualizada." }

    Assert-Equal (Invoke-Central DELETE "/api/clients/$clientId").StatusCode 200 "Limpeza do cliente temporário"
    Write-Output "Smoke test concluído: login, cadastro, agente, impressoras, trabalhos e cotas foram validados em banco isolado."
}
finally {
    if ($null -ne $process -and !$process.HasExited) { Stop-Process -Id $process.Id -Force }
    if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
}
