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
        private static bool _serverReachable = false;
        public static List<UserQuota> CurrentQuotas { get; private set; } = new List<UserQuota>();

        public static string GetServerUrl() => _serverUrl;
        public static int GetClientId() => _clientId;
        public static bool IsServerReachable() => _serverReachable;

        public static async Task ForceScan()
        {
            try
            {
                await _http.PostAsync($"{_serverUrl}/api/admin/force-scan/{_clientId}", null);
            }
            catch { }
        }

        public static async Task StartPolling(CancellationToken ct = default, TrayApp? tray = null)
        {
            LoadConfig();

            // Inicia spooler monitor em background
            SpoolerMonitor.StartBackground(OnPrintJobArrived);

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
                    var response = await _http.GetStringAsync($"{_serverUrl}/api/agent/{_clientId}/commands");
                    _serverReachable = true;

                    using JsonDocument doc = JsonDocument.Parse(response);
                    string command = "";
                    if (doc.RootElement.TryGetProperty("Command", out JsonElement cmdEl))
                        command = cmdEl.GetString() ?? "";
                    else if (doc.RootElement.TryGetProperty("command", out JsonElement cmdElLower))
                        command = cmdElLower.GetString() ?? "";

                    if (command == "SCAN_NETWORK" || command.StartsWith("SCAN_IP:"))
                    {
                        string? customIp = command.StartsWith("SCAN_IP:") ? command.Substring("SCAN_IP:".Length).Trim() : null;
                        Console.WriteLine($"[Agente] Recebido {command} — iniciando varredura...");
                        var printers = NetworkScanner.RunScanner(customIp);
                        Console.WriteLine($"[Agente] {printers.Count} impressoras encontradas.");
                        string json = JsonSerializer.Serialize(new { ClientId = _clientId, Printers = printers });
                        await _http.PostAsync($"{_serverUrl}/api/agent/report-printers",
                            new StringContent(json, Encoding.UTF8, "application/json"));
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
                string json = JsonSerializer.Serialize(new { ClientId = _clientId });
                await _http.PostAsync($"{_serverUrl}/api/agent/heartbeat",
                    new StringContent(json, Encoding.UTF8, "application/json"));
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

        private static void LoadConfig()
        {
            // 1. Tenta ler configuração injetada no próprio binário (tail bytes)
            try
            {
                string exePath = System.Diagnostics.Process.GetCurrentProcess().MainModule?.FileName ?? "";
                if (File.Exists(exePath))
                {
                    using var fs = new FileStream(exePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    long startRead = Math.Max(0, fs.Length - 1024);
                    fs.Seek(startRead, SeekOrigin.Begin);
                    byte[] tail = new byte[(int)(fs.Length - startRead)];
                    fs.Read(tail, 0, tail.Length);
                    string text = Encoding.UTF8.GetString(tail);

                    const string magic = "___PRINT_AGENT_CLIENT_ID:";
                    int idx = text.LastIndexOf(magic);
                    if (idx >= 0)
                    {
                        int start = idx + magic.Length;
                        int end   = text.IndexOf("___", start);
                        if (end > start)
                        {
                            string payload = text.Substring(start, end - start);
                            string[] parts = payload.Split('|');
                            if (parts.Length > 0 && int.TryParse(parts[0], out int id))
                            {
                                _clientId = id;
                                if (parts.Length > 1 && !string.IsNullOrWhiteSpace(parts[1]))
                                    _serverUrl = parts[1];
                                Console.WriteLine($"[Agente] Config injetada: ClientId={_clientId}, Server={_serverUrl}");
                                return;
                            }
                        }
                    }
                }
            }
            catch { }

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
                    }
                }
                catch { }
            }
        }
    }
}
