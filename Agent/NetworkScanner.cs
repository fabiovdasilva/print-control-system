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
            var ipsToScan = new List<string>();

            if (!string.IsNullOrWhiteSpace(customIp))
            {
                // ---- MODO MANUAL: IP único ou faixa ----
                string target = customIp.Trim();

                // Checa se é um IP completo (ex: 192.168.1.100)
                if (System.Net.IPAddress.TryParse(target, out _))
                {
                    ipsToScan.Add(target);
                }
                else
                {
                    // Trata como prefixo de rede (ex: "192.168.1") → varre .1 a .254
                    for (int i = 1; i <= 254; i++)
                        ipsToScan.Add($"{target}.{i}");
                }
            }
            else
            {
                // ---- MODO AUTOMÁTICO: descobre a rede local ----
            foreach (var networkInterface in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (networkInterface.OperationalStatus == OperationalStatus.Up && 
                    networkInterface.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                {
                    var ipProperties = networkInterface.GetIPProperties();
                    foreach (var address in ipProperties.UnicastAddresses)
                    {
                        if (address.Address.AddressFamily == AddressFamily.InterNetwork)
                        {
                            var ip = address.Address;
                            var mask = address.IPv4Mask;
                            
                            // Ignorar IPs APIPA, Loopbacks do Windows, e interfaces com Máscara 0.0.0.0
                            if (mask != null && 
                                mask.ToString() != "0.0.0.0" && 
                                mask.ToString() != "255.255.255.255" &&
                                !ip.ToString().StartsWith("169.254") &&
                                !ip.ToString().StartsWith("127.")) 
                            {
                                // Ignorar interfaces virtuais de bancos e VPNs
                                string interfaceName = networkInterface.Name.ToLower();
                                string description = networkInterface.Description.ToLower();
                                
                                if (interfaceName.Contains("loopback") || description.Contains("loopback") ||
                                    interfaceName.Contains("virtual") || description.Contains("virtual"))
                                {
                                    continue;
                                }

                                uint netSize = GetNetworkSize(ip, mask);
                                
                                if (netSize <= 4096) 
                                {
                                    var networkIps = GetIpsInNetwork(ip, mask);
                                    ipsToScan.AddRange(networkIps);
                                }
                            }
                        }
                    }
                }
            }
            } // fim else (modo automático)

            if (ipsToScan.Count == 0) return new List<PrinterInfo>();

            var activeIps = new ConcurrentBag<string>();
            var printerList = new ConcurrentBag<PrinterInfo>();

            // 1. Ping Sweep
            Parallel.ForEach(ipsToScan, new ParallelOptions { MaxDegreeOfParallelism = 50 }, ip =>
            {
                try
                {
                    using (Ping pinger = new Ping())
                    {
                        PingReply reply = pinger.Send(ip, 500);
                        if (reply.Status == IPStatus.Success)
                        {
                            activeIps.Add(ip);
                        }
                    }
                }
                catch { }
            });

            // 2. Interrogar via SNMP
            Parallel.ForEach(activeIps, new ParallelOptions { MaxDegreeOfParallelism = 20 }, ip =>
            {
                try
                {
                    var printerIp = IPAddress.Parse(ip);
                    var endPoint = new IPEndPoint(printerIp, 161);
                    var community = new OctetString("public");
                    
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
                            string GetOidSafe(string oid)
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

            return new List<PrinterInfo>(printerList);
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
