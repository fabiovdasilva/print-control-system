using System;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json;
using System.IO;

namespace Agent
{
    public class AgentClient
    {
        private static readonly HttpClient _http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        private static string _serverUrl = "http://127.0.0.1:5000";
        private static int _clientId = 0;
        private static string _agentToken = string.Empty;
        private static string _snmpCommunity = "public";
        private static string _networkSubnets = string.Empty;
        private static bool _serverReachable = false;
        private static int _scanInProgress;
        public static List<UserQuota> CurrentQuotas { get; private set; } = new List<UserQuota>();

        public static string GetServerUrl() => _serverUrl;
        public static int GetClientId() => _clientId;
        public static bool IsServerReachable() => _serverReachable;

        public static async Task ForceScan()
        {
            LoadConfig();
            ConfigureAgentHeaders();
            if (_clientId <= 0 || string.IsNullOrWhiteSpace(_agentToken)) return;

            try
            {
                var scan = await Task.Run(() => NetworkScanner.RunScannerDetailed(snmpCommunity: _snmpCommunity, networkSubnets: _networkSubnets));
                await ReportPrinters(scan);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Agente] Falha na varredura manual: {ex.Message}");
            }
        }

        public static async Task StartPolling(CancellationToken ct = default, TrayApp? tray = null)
        {
            LoadConfig();
            ConfigureAgentHeaders();
            if (_clientId <= 0 || string.IsNullOrWhiteSpace(_agentToken))
            {
                Console.WriteLine("[Agente] Configuração ou credencial ausente. Baixe novamente o instalador pela central.");
                return;
            }

            int heartbeatTick = 0;
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    // Heartbeat a cada 30s (6 ticks de 5s)
                    if (heartbeatTick % 6 == 0)
                        await SendHeartbeat();

                    // Atualiza Cotas a cada 60s (12 ticks) ou no primeiro tick
                    if (heartbeatTick % 12 == 0)
                        await FetchQuotas();

                    // Verifica comandos pendentes
                    var response = await _http.GetStringAsync($"{_serverUrl}/api/agent/{_clientId}/commands?hostname={Uri.EscapeDataString(Environment.MachineName)}");
                    _serverReachable = true;

                    using JsonDocument doc = JsonDocument.Parse(response);
                    string command = "";
                    if (doc.RootElement.TryGetProperty("Command", out JsonElement cmdEl))
                        command = cmdEl.GetString() ?? "";
                    else if (doc.RootElement.TryGetProperty("command", out JsonElement cmdElLower))
                        command = cmdElLower.GetString() ?? "";

                    bool isScanner = false;
                    bool isSpooler = true;
                    if (doc.RootElement.TryGetProperty("IsScannerEnabled", out JsonElement scanEl)) isScanner = scanEl.GetBoolean();
                    if (doc.RootElement.TryGetProperty("IsSpoolerEnabled", out JsonElement spoolEl)) isSpooler = spoolEl.GetBoolean();
                    if (doc.RootElement.TryGetProperty("SnmpCommunity", out JsonElement communityEl))
                        _snmpCommunity = communityEl.GetString() ?? "public";
                    if (doc.RootElement.TryGetProperty("NetworkSubnets", out JsonElement subnetsEl))
                        _networkSubnets = subnetsEl.GetString() ?? string.Empty;

                    if (isSpooler && !SpoolerMonitor.IsRunning)
                        SpoolerMonitor.StartBackground(OnPrintJobArrived);
                    else if (!isSpooler && SpoolerMonitor.IsRunning)
                        SpoolerMonitor.Stop();

                    if (command == "SCAN_NETWORK" || command.StartsWith("SCAN_IP:"))
                    {
                        if (isScanner)
                        {
                        string? customIp = command.StartsWith("SCAN_IP:") ? command.Substring("SCAN_IP:".Length).Trim() : null;
                        Console.WriteLine($"[Agente] Recebido {command} — iniciando varredura...");
                        if (Interlocked.CompareExchange(ref _scanInProgress, 1, 0) == 0)
                        {
                            _ = Task.Run(async () =>
                            {
                                try
                                {
                                    var scan = NetworkScanner.RunScannerDetailed(customIp, _snmpCommunity, _networkSubnets);
                                    Console.WriteLine($"[Agente] {scan.Printers.Count} impressoras encontradas em {scan.ScannedIps.Count} endereços consultados.");
                                    await ReportPrinters(scan);
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine($"[Agente] Falha na varredura: {ex.Message}");
                                }
                                finally
                                {
                                    Volatile.Write(ref _scanInProgress, 0);
                                }
                            });
                        }
                        else
                        {
                            Console.WriteLine("[Agente] Varredura ignorada: outra varredura ainda está em execução.");
                        }
                        }
                        else
                        {
                            Console.WriteLine($"[Agente] Comando {command} ignorado (Scanner desativado neste nó).");
                        }
                    }
                    else if (command == "UNINSTALL")
                    {
                        Console.WriteLine("[Agente] Comando de desinstalação recebido. Removendo...");
                        // Executa a própria desinstalação via linha de comando e encerra
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = System.Diagnostics.Process.GetCurrentProcess().MainModule?.FileName ?? "",
                            Arguments = "-uninstall",
                            UseShellExecute = true
                        });
                        System.Windows.Forms.Application.Exit();
                        return;
                    }
                }
                catch
                {
                    _serverReachable = false;
                }

                heartbeatTick++;
                await Task.Delay(5000, ct);
            }
        }

        private static async Task SendHeartbeat()
        {
            try
            {
                string json = JsonSerializer.Serialize(new {
                    ClientId = _clientId,
                    Hostname = Environment.MachineName,
                    Version = "v1.0"
                });
                using var response = await _http.PostAsync($"{_serverUrl}/api/agent/heartbeat",
                    new StringContent(json, Encoding.UTF8, "application/json"));
                response.EnsureSuccessStatusCode();
                _serverReachable = true;
            }
            catch
            {
                _serverReachable = false;
            }
        }

        private static async Task FetchQuotas()
        {
            try
            {
                var response = await _http.GetStringAsync($"{_serverUrl}/api/agent/{_clientId}/quotas");
                var list = JsonSerializer.Deserialize<List<UserQuota>>(response, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (list != null)
                {
                    CurrentQuotas = list;
                }
            }
            catch { }
        }

        private static void OnPrintJobArrived(string printerName, string owner, string document, int pages, string userIp)
        {
            Task.Run(async () =>
            {
                try
                {
                    var payload = new
                    {
                        ClientId = _clientId,
                        PrinterModel = printerName,
                        DocumentName = document,
                        UserName = owner,
                        TotalPages = pages,
                        UserIp = userIp
                    };
                    string json = JsonSerializer.Serialize(payload);
                    await _http.PostAsync($"{_serverUrl}/api/agent/report-job",
                        new StringContent(json, Encoding.UTF8, "application/json"));
                }
                catch { }
            });
        }

        private static void ConfigureAgentHeaders()
        {
            _http.DefaultRequestHeaders.Remove("X-Agent-Client");
            _http.DefaultRequestHeaders.Remove("X-Agent-Token");
            if (_clientId > 0) _http.DefaultRequestHeaders.Add("X-Agent-Client", _clientId.ToString());
            if (!string.IsNullOrWhiteSpace(_agentToken)) _http.DefaultRequestHeaders.Add("X-Agent-Token", _agentToken);
        }

        private static async Task ReportPrinters(NetworkScanResult scan)
        {
            string json = JsonSerializer.Serialize(new { ClientId = _clientId, Printers = scan.Printers, ScannedIps = scan.ScannedIps });
            using var response = await _http.PostAsync($"{_serverUrl}/api/agent/report-printers",
                new StringContent(json, Encoding.UTF8, "application/json"));
            response.EnsureSuccessStatusCode();
        }

        private static void LoadConfig()
        {
            // 1. Tenta ler a configuração segura injetada no instalador.
            try
            {
                string exePath = System.Diagnostics.Process.GetCurrentProcess().MainModule?.FileName ?? "";
                if (File.Exists(exePath))
                {
                    using var fs = new FileStream(exePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    long startRead = Math.Max(0, fs.Length - 4096);
                    fs.Seek(startRead, SeekOrigin.Begin);
                    byte[] tail = new byte[(int)(fs.Length - startRead)];
                    fs.ReadExactly(tail);
                    string text = Encoding.UTF8.GetString(tail);
                    const string marker = "___PRINT_AGENT_CONFIG:";
                    int idx = text.LastIndexOf(marker, StringComparison.Ordinal);
                    if (idx >= 0)
                    {
                        int start = idx + marker.Length;
                        int end = text.IndexOf("___", start, StringComparison.Ordinal);
                        if (end > start)
                        {
                            string payload = text.Substring(start, end - start);
                            var cfg = JsonSerializer.Deserialize<AgentConfig>(Convert.FromBase64String(payload));
                            if (cfg != null && cfg.ClientId > 0 && !string.IsNullOrWhiteSpace(cfg.AgentToken))
                            {
                                _clientId = cfg.ClientId;
                                _serverUrl = string.IsNullOrWhiteSpace(cfg.ServerUrl) ? _serverUrl : cfg.ServerUrl.TrimEnd('/');
                                _agentToken = cfg.AgentToken;
                                Console.WriteLine($"[Agente] Configuração carregada para o cliente {_clientId}.");
                                return;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Agente] Não foi possível ler configuração do instalador: {ex.Message}");
            }

            // 2. Fallback: arquivo config.json local (dev/debug)
            string path = Path.Combine(
                Path.GetDirectoryName(System.Diagnostics.Process.GetCurrentProcess().MainModule?.FileName ?? "") ?? "",
                "config.json");

            if (File.Exists(path))
            {
                try
                {
                    var cfg = JsonSerializer.Deserialize<AgentConfig>(File.ReadAllText(path));
                    if (cfg != null)
                    {
                        _clientId  = cfg.ClientId;
                        _serverUrl = cfg.ServerUrl ?? _serverUrl;
                        _agentToken = cfg.AgentToken ?? string.Empty;
                    }
                }
                catch { }
            }
        }
    }
}
