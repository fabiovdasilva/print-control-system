$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if ($dotnet) { $dotnetPath = $dotnet.Source }
elseif (Test-Path (Join-Path $projectRoot ".dotnet\dotnet.exe")) { $dotnetPath = Join-Path $projectRoot ".dotnet\dotnet.exe" }
else { throw "Instale o .NET 8 SDK ou use .dotnet\dotnet.exe na raiz do projeto." }
$output = Join-Path $projectRoot "ServerMock\AgentPublish"
& $dotnetPath publish (Join-Path $projectRoot "Agent\Agent.csproj") -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $output
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Agente publicado em $output"
