using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Threading.Tasks;
using Lextm.SharpSnmpLib;
using Lextm.SharpSnmpLib.Messaging;

namespace Agent
{
    public class NetworkScanner
    {
        /// <summary>
        /// Escaneia a rede. Se customIp for informado, escaneia apenas aquele IP ou faixa /24.
        /// Exemplos: "192.168.1.105" (IP único) ou "192.168.1" (faixa .1 a .254).
        /// </summary>
        public static List<PrinterInfo> RunScanner(string? customIp = null)
        {
            return RunScannerDetailed(customIp).Printers;
        }

        public static NetworkScanResult RunScannerDetailed(string? customIp = null, string snmpCommunity = "public", string networkSubnets = "")
        {
            var ipsToScan = new List<string>();

            if (!string.IsNullOrWhiteSpace(customIp))
            {
                ipsToScan.AddRange(ExpandTarget(customIp.Trim()));
            }
            else if (!string.IsNullOrWhiteSpace(networkSubnets))
            {
                foreach (var target in networkSubnets.Split(new[] { ',', ';', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    ipsToScan.AddRange(ExpandTarget(target));
            }
            else
            {
                // Sem sub-redes configuradas, detecta as redes locais elegíveis.
                foreach (var networkInterface in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (networkInterface.OperationalStatus != OperationalStatus.Up || networkInterface.NetworkInterfaceType == NetworkInterfaceType.Loopback)
                        continue;

                    foreach (var address in networkInterface.GetIPProperties().UnicastAddresses)
                    {
                        if (address.Address.AddressFamily != AddressFamily.InterNetwork) continue;
                        var ip = address.Address;
                        var mask = address.IPv4Mask;
                        if (mask == null || mask.ToString() is "0.0.0.0" or "255.255.255.255" || ip.ToString().StartsWith("169.254") || ip.ToString().StartsWith("127."))
                            continue;

                        string interfaceName = networkInterface.Name.ToLowerInvariant();
                        string description = networkInterface.Description.ToLowerInvariant();
                        if (interfaceName.Contains("loopback") || description.Contains("loopback") || interfaceName.Contains("virtual") || description.Contains("virtual"))
                            continue;

                        if (GetNetworkSize(ip, mask) <= 4096)
                            ipsToScan.AddRange(GetIpsInNetwork(ip, mask));
                    }
                }
            }

            ipsToScan = ipsToScan.Distinct(StringComparer.Ordinal).Take(4096).ToList();
            if (ipsToScan.Count == 0) return new NetworkScanResult(ipsToScan, new List<PrinterInfo>());

            var printerList = new ConcurrentBag<PrinterInfo>();

            // Consulta SNMP diretamente os endereços candidatos; impressoras podem bloquear ICMP.
            // Interrogar via SNMP
            Parallel.ForEach(ipsToScan, new ParallelOptions { MaxDegreeOfParallelism = 20 }, ip =>
            {
                try
                {
                    var printerIp = IPAddress.Parse(ip);
                    var endPoint = new IPEndPoint(printerIp, 161);
                    var community = new OctetString(string.IsNullOrWhiteSpace(snmpCommunity) ? "public" : snmpCommunity);
                    
                    // OIDs básicos para identificação
                    string sysDescrOid = "1.3.6.1.2.1.1.1.0"; 
                    string hrDeviceDescrOid = "1.3.6.1.2.1.25.3.2.1.3.1"; 

                    var result = Messenger.Get(VersionCode.V1, endPoint, community,
                        new List<Variable> { 
                            new Variable(new ObjectIdentifier(sysDescrOid)),
                            new Variable(new ObjectIdentifier(hrDeviceDescrOid))
                        }, 1500); 

                    if (result.Count > 0)
                    {
                        string sysDescription = result[0].Data.ToString().ToLower();
                        string modelName = result.Count > 1 && result[1].Data.ToString() != "NoSuchObject" && result[1].Data.ToString() != "NoSuchInstance"
                                           ? result[1].Data.ToString() 
                                           : result[0].Data.ToString();
                        
                        if (sysDescription.Contains("printer") || sysDescription.Contains("laser") || 
                            sysDescription.Contains("epson") || sysDescription.Contains("hp") || 
                            sysDescription.Contains("lexmark") || sysDescription.Contains("brother") ||
                            sysDescription.Contains("ricoh") || sysDescription.Contains("canon") ||
                            modelName.ToLower().Contains("laser") || modelName.ToLower().Contains("brother"))
                        {
                            var info = new PrinterInfo { IP = ip, Model = modelName };
                            
                            // Função auxiliar para buscar OID individual sem quebrar a execução
                            string? GetOidSafe(string oid)
                            {
                                try {
                                    var r = Messenger.Get(VersionCode.V1, endPoint, community, new List<Variable> { new Variable(new ObjectIdentifier(oid)) }, 1000);
                                    if (r.Count > 0 && r[0].Data.ToString() != "NoSuchObject" && r[0].Data.ToString() != "NoSuchInstance")
                                        return r[0].Data.ToString();
                                } catch { }
                                return null;
                            }

                            // Contador de páginas (prtMarkerLifeCount)
                            var pages = GetOidSafe("1.3.6.1.2.1.43.10.2.1.4.1.1");
                            if (int.TryParse(pages, out int p)) info.PagesTotal = p;

                            // Número de Série (prtGeneralSerialNumber)
                            var serial = GetOidSafe("1.3.6.1.2.1.43.5.1.1.17.1");
                            if (!string.IsNullOrEmpty(serial)) info.SerialNumber = serial;

                            // Firmware / Versão (tenta sysDescr formatado ou prtGeneralCurrentLocalization)
                            var fw = GetOidSafe("1.3.6.1.2.1.43.5.1.1.2.1");
                            if (!string.IsNullOrEmpty(fw)) info.Firmware = fw;
                            else info.Firmware = "Genérico/Misto"; 

                            // Nível de Toner (prtMarkerSuppliesLevel e prtMarkerSuppliesMaxCapacity)
                            var tonerCurrent = GetOidSafe("1.3.6.1.2.1.43.11.1.1.9.1.1");
                            var tonerMax = GetOidSafe("1.3.6.1.2.1.43.11.1.1.8.1.1");
                            
                            if (int.TryParse(tonerCurrent, out int current) && int.TryParse(tonerMax, out int max) && max > 0)
                            {
                                // Calcula a porcentagem, mas se for negativo (-3 OK, -2 unknown), trata diferente
                                if (current >= 0) {
                                    info.TonerLevel = (int)((current / (double)max) * 100);
                                    if (info.TonerLevel > 100) info.TonerLevel = 100;
                                }
                            }

                            printerList.Add(info);
                        }
                    }
                }
                catch { }
            });

            return new NetworkScanResult(ipsToScan, new List<PrinterInfo>(printerList));
        }

        private static List<string> ExpandTarget(string target)
        {
            if (IPAddress.TryParse(target, out var single) && single.AddressFamily == AddressFamily.InterNetwork)
                return new List<string> { single.ToString() };

            var parts = target.Split('/', 2);
            if (parts.Length == 2 && IPAddress.TryParse(parts[0], out var network) && network.AddressFamily == AddressFamily.InterNetwork &&
                int.TryParse(parts[1], out var prefixLength) && prefixLength >= 0 && prefixLength <= 32)
            {
                int hostBits = 32 - prefixLength;
                long addressCount = 1L << hostBits;
                if (addressCount > 4096) return new List<string>();
                uint address = BitConverter.ToUInt32(ReverseIfLittleEndian(network.GetAddressBytes()), 0);
                uint mask = prefixLength == 0 ? 0 : uint.MaxValue << hostBits;
                uint first = address & mask;
                uint last = first | ~mask;
                var result = new List<string>();
                if (prefixLength == 32) return new List<string> { network.ToString() };
                for (uint value = first + 1; value < last; value++)
                    result.Add(new IPAddress(ReverseIfLittleEndian(BitConverter.GetBytes(value))).ToString());
                return result;
            }

            // Compatibilidade com o formato antigo 192.168.1
            if (System.Text.RegularExpressions.Regex.IsMatch(target, @"^\d{1,3}\.\d{1,3}\.\d{1,3}$"))
            {
                var result = new List<string>();
                for (int i = 1; i <= 254; i++) result.Add($"{target}.{i}");
                return result;
            }
            return new List<string>();
        }

        private static uint GetNetworkSize(IPAddress ipAddress, IPAddress subnetMask)
        {
            byte[] maskBytes = subnetMask.GetAddressBytes();
            if (maskBytes.Length != 4) return 0;
            uint mask = BitConverter.ToUInt32(ReverseIfLittleEndian(maskBytes), 0);
            uint size = ~mask; 
            return size > 2 ? size - 2 : 0; 
        }

        private static List<string> GetIpsInNetwork(IPAddress ipAddress, IPAddress subnetMask)
        {
            byte[] ipBytes = ipAddress.GetAddressBytes();
            byte[] maskBytes = subnetMask.GetAddressBytes();

            if (ipBytes.Length != maskBytes.Length) return new List<string>();

            byte[] networkAddressBytes = new byte[ipBytes.Length];
            byte[] broadcastAddressBytes = new byte[ipBytes.Length];

            for (int i = 0; i < networkAddressBytes.Length; i++)
            {
                networkAddressBytes[i] = (byte)(ipBytes[i] & maskBytes[i]);
                broadcastAddressBytes[i] = (byte)(networkAddressBytes[i] | ~maskBytes[i]);
            }

            uint networkAddress = BitConverter.ToUInt32(ReverseIfLittleEndian(networkAddressBytes), 0);
            uint broadcastAddress = BitConverter.ToUInt32(ReverseIfLittleEndian(broadcastAddressBytes), 0);

            var result = new List<string>();
            
            for (uint i = networkAddress + 1; i < broadcastAddress; i++)
            {
                byte[] bytes = BitConverter.GetBytes(i);
                bytes = ReverseIfLittleEndian(bytes);
                result.Add(new IPAddress(bytes).ToString());
            }

            return result;
        }

        private static byte[] ReverseIfLittleEndian(byte[] bytes)
        {
            if (BitConverter.IsLittleEndian)
            {
                var copy = new byte[bytes.Length];
                Array.Copy(bytes, copy, bytes.Length);
                Array.Reverse(copy);
                return copy;
            }
            return bytes;
        }
    }
}
