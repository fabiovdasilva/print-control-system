using System;
using System.Collections.Generic;

namespace Agent
{
    public class PrinterInfo
    {
        public string IP { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string Status { get; set; } = "online";
        public int PagesTotal { get; set; } = 0;
        public string Firmware { get; set; } = "Desconhecido";
        public string SerialNumber { get; set; } = "N/A";
        public int? TonerLevel { get; set; } = null;
        public int? DrumLevel { get; set; } = null;
    }

    public class NetworkScanResult
    {
        public List<string> ScannedIps { get; set; } = new();
        public List<PrinterInfo> Printers { get; set; } = new();

        public NetworkScanResult() { }

        public NetworkScanResult(List<string> scannedIps, List<PrinterInfo> printers)
        {
            ScannedIps = scannedIps;
            Printers = printers;
        }
    }

    public class AgentConfig
    {
        public int ClientId { get; set; } = 1;
        public string? ServerUrl { get; set; } = null;
    }

    public class UserQuota
    {
        public string UserName { get; set; } = string.Empty;
        public int MaxPages { get; set; } = 0;
        public int PagesUsed { get; set; } = 0;
        public bool IsBlocked { get; set; } = false;
    }
}
