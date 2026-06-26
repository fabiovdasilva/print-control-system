using System;
using System.Management;

namespace Agent
{
    public class SpoolerMonitor
    {
        private static ManagementEventWatcher? _watcher;
        private static Action<string, string, string, int, string>? _onJobArrived;

        public static void StartBackground(Action<string, string, string, int, string> onJobArrived)
        {
            _onJobArrived = onJobArrived;
            try
            {
                string query = "SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_PrintJob'";
                _watcher = new ManagementEventWatcher(new WqlEventQuery(query));
                _watcher.EventArrived += HandleNewPrintJob;
                _watcher.Start();
                Console.WriteLine("[Agente] Spooler WMI ligado em Background.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Agente ERRO] Falha ao iniciar WMI: {ex.Message}");
            }
        }

        public static void Stop()
        {
            if (_watcher != null)
            {
                _watcher.Stop();
                _watcher.Dispose();
            }
        }

        private static void HandleNewPrintJob(object sender, EventArrivedEventArgs e)
        {
            try
            {
                ManagementBaseObject targetInstance = (ManagementBaseObject)e.NewEvent["TargetInstance"];
                string document = targetInstance["Document"]?.ToString() ?? "Desconhecido";
                string owner = targetInstance["Owner"]?.ToString() ?? "Desconhecido";
                string printerName = targetInstance["Name"]?.ToString() ?? "Desconhecida"; 
                
                int totalPages = 1; // Fallback
                if (int.TryParse(targetInstance["TotalPages"]?.ToString(), out int p) && p > 0) {
                    totalPages = p;
                }
                
                // Limpar o nome da impressora (Win32_PrintJob retorna 'NomeDaImpressora, JobId')
                if (printerName.Contains(",")) {
                    printerName = printerName.Split(',')[0].Trim();
                }

                // Verifica Bloqueios / Cotas
                var quota = AgentClient.CurrentQuotas.Find(q => q.UserName.Equals(owner, StringComparison.OrdinalIgnoreCase));
                if (quota != null)
                {
                    bool block = false;
                    if (quota.IsBlocked) block = true;
                    if (quota.MaxPages > 0 && (quota.PagesUsed + totalPages) > quota.MaxPages) block = true;

                    if (block)
                    {
                        Console.WriteLine($"[Spooler] Job bloqueado para usuário {owner} (Limite atingido/Bloqueado).");
                        try {
                            ((ManagementObject)targetInstance).Delete();
                        } catch { }
                        
                        // Notifica o tray (opcional)
                        _onJobArrived?.Invoke(printerName, owner, "[BLOQUEADO] " + document, 0, GetLocalIp());
                        return; // não reporta o job como concluído
                    }
                    
                    // Incrementa no cache local para não esperar o próximo polling
                    quota.PagesUsed += totalPages; 
                }

                _onJobArrived?.Invoke(printerName, owner, document, totalPages, GetLocalIp());
            }
            catch { }
        }

        private static string GetLocalIp()
        {
            try
            {
                return System.Net.Dns.GetHostEntry(System.Net.Dns.GetHostName())
                    .AddressList.FirstOrDefault(ip => ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)?.ToString() ?? "127.0.0.1";
            }
            catch { return "127.0.0.1"; }
        }
    }
}
