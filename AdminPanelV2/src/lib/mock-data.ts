export type PrinterStatus = "online" | "warning" | "error" | "offline";

export interface Printer {
  id: string;
  model: string;
  ip: string;
  location: string;
  status: PrinterStatus;
  statusLabel: string;
  toner: { c: number; m: number; y: number; k: number };
  pages: number;
  lastSeen: string;
  clientId: string;
}

export interface Alert {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  clientId: string;
  printerId?: string;
  time: string;
  ago: string;
}

export interface Client {
  id: string;
  name: string;
  cnpj: string;
  city: string;
  agentVersion: string;
  agentStatus: "online" | "unstable" | "offline";
  printersTotal: number;
  printersOnline: number;
  alertsCritical: number;
  pagesToday: number;
  network: {
    subnet: string;
    gateway: string;
    dns: string;
    snmpCommunity: string;
    pollIntervalSec: number;
  };
}

export const clients: Client[] = [
  {
    id: "transprime",
    name: "Logística TransPrime",
    cnpj: "12.345.678/0001-99",
    city: "São Paulo, SP",
    agentVersion: "v2.4.1",
    agentStatus: "online",
    printersTotal: 42,
    printersOnline: 38,
    alertsCritical: 1,
    pagesToday: 12450,
    network: {
      subnet: "192.168.1.0/24",
      gateway: "192.168.1.1",
      dns: "8.8.8.8, 1.1.1.1",
      snmpCommunity: "public",
      pollIntervalSec: 60,
    },
  },
  {
    id: "santafe",
    name: "Hospital Santa Fé",
    cnpj: "98.765.432/0001-11",
    city: "Rio de Janeiro, RJ",
    agentVersion: "v2.4.1",
    agentStatus: "online",
    printersTotal: 64,
    printersOnline: 61,
    alertsCritical: 2,
    pagesToday: 18204,
    network: {
      subnet: "10.10.0.0/16",
      gateway: "10.10.0.1",
      dns: "10.10.0.2",
      snmpCommunity: "santafe_ro",
      pollIntervalSec: 30,
    },
  },
  {
    id: "mackenzie",
    name: "Colégio Mackenzie",
    cnpj: "55.432.109/0001-22",
    city: "Curitiba, PR",
    agentVersion: "v2.3.9",
    agentStatus: "unstable",
    printersTotal: 28,
    printersOnline: 22,
    alertsCritical: 0,
    pagesToday: 4120,
    network: {
      subnet: "172.16.5.0/24",
      gateway: "172.16.5.1",
      dns: "172.16.5.2",
      snmpCommunity: "public",
      pollIntervalSec: 60,
    },
  },
  {
    id: "andrade",
    name: "Escritório Andrade & Cia",
    cnpj: "33.221.456/0001-77",
    city: "Belo Horizonte, MG",
    agentVersion: "v2.4.0",
    agentStatus: "online",
    printersTotal: 12,
    printersOnline: 12,
    alertsCritical: 0,
    pagesToday: 882,
    network: {
      subnet: "192.168.10.0/24",
      gateway: "192.168.10.1",
      dns: "8.8.8.8",
      snmpCommunity: "public",
      pollIntervalSec: 120,
    },
  },
  {
    id: "petrobel",
    name: "Petrobel Indústria",
    cnpj: "01.987.654/0001-33",
    city: "Salvador, BA",
    agentVersion: "v2.2.4",
    agentStatus: "offline",
    printersTotal: 31,
    printersOnline: 0,
    alertsCritical: 5,
    pagesToday: 0,
    network: {
      subnet: "192.168.50.0/24",
      gateway: "192.168.50.1",
      dns: "8.8.8.8",
      snmpCommunity: "public",
      pollIntervalSec: 60,
    },
  },
];

export const printers: Printer[] = [
  {
    id: "p1",
    clientId: "transprime",
    model: "HP LaserJet M404n",
    ip: "192.168.1.102",
    location: "Recepção",
    status: "error",
    statusLabel: "Atolamento",
    toner: { c: 0, m: 0, y: 0, k: 65 },
    pages: 12450,
    lastSeen: "Há 5 min",
  },
  {
    id: "p2",
    clientId: "transprime",
    model: "Brother MFC-L2710DW",
    ip: "192.168.1.115",
    location: "Logística",
    status: "warning",
    statusLabel: "Toner baixo (12%)",
    toner: { c: 0, m: 0, y: 0, k: 12 },
    pages: 4122,
    lastSeen: "Há 1 min",
  },
  {
    id: "p3",
    clientId: "transprime",
    model: "Kyocera Ecosys M2040dn",
    ip: "192.168.1.120",
    location: "Administrativo",
    status: "online",
    statusLabel: "Online",
    toner: { c: 0, m: 0, y: 0, k: 88 },
    pages: 89012,
    lastSeen: "Agora",
  },
  {
    id: "p4",
    clientId: "transprime",
    model: "HP Color LaserJet M454dw",
    ip: "192.168.1.130",
    location: "Diretoria",
    status: "online",
    statusLabel: "Online",
    toner: { c: 72, m: 64, y: 81, k: 90 },
    pages: 23110,
    lastSeen: "Agora",
  },
  {
    id: "p5",
    clientId: "santafe",
    model: "Ricoh IM C3000",
    ip: "10.10.4.21",
    location: "Sala 402",
    status: "warning",
    statusLabel: "Pouco toner ciano",
    toner: { c: 8, m: 60, y: 55, k: 70 },
    pages: 154220,
    lastSeen: "Há 3 min",
  },
  {
    id: "p6",
    clientId: "santafe",
    model: "HP LaserJet Pro M428fdw",
    ip: "10.10.4.30",
    location: "Recepção PA",
    status: "online",
    statusLabel: "Online",
    toner: { c: 0, m: 0, y: 0, k: 56 },
    pages: 78112,
    lastSeen: "Agora",
  },
  {
    id: "p7",
    clientId: "santafe",
    model: "Xerox VersaLink C405",
    ip: "10.10.5.11",
    location: "UTI - Posto 2",
    status: "error",
    statusLabel: "Sem papel",
    toner: { c: 44, m: 50, y: 38, k: 60 },
    pages: 65912,
    lastSeen: "Há 12 min",
  },
  {
    id: "p8",
    clientId: "mackenzie",
    model: "Epson L4260",
    ip: "172.16.5.50",
    location: "Biblioteca",
    status: "online",
    statusLabel: "Online",
    toner: { c: 40, m: 38, y: 45, k: 62 },
    pages: 9802,
    lastSeen: "Há 1 min",
  },
  {
    id: "p9",
    clientId: "mackenzie",
    model: "Brother HL-L2350DW",
    ip: "172.16.5.62",
    location: "Sala dos Professores",
    status: "offline",
    statusLabel: "Offline",
    toner: { c: 0, m: 0, y: 0, k: 30 },
    pages: 2210,
    lastSeen: "Há 2h",
  },
  {
    id: "p10",
    clientId: "andrade",
    model: "HP LaserJet M404dn",
    ip: "192.168.10.21",
    location: "Atendimento",
    status: "online",
    statusLabel: "Online",
    toner: { c: 0, m: 0, y: 0, k: 78 },
    pages: 5420,
    lastSeen: "Agora",
  },
  {
    id: "p11",
    clientId: "andrade",
    model: "Canon imageCLASS MF445dw",
    ip: "192.168.10.34",
    location: "Sala de Reunião",
    status: "online",
    statusLabel: "Online",
    toner: { c: 0, m: 0, y: 0, k: 91 },
    pages: 1248,
    lastSeen: "Agora",
  },
  {
    id: "p12",
    clientId: "petrobel",
    model: "Kyocera TASKalfa 4053ci",
    ip: "192.168.50.10",
    location: "Galpão A",
    status: "offline",
    statusLabel: "Sem comunicação",
    toner: { c: 0, m: 0, y: 0, k: 0 },
    pages: 0,
    lastSeen: "Há 3 dias",
  },
];

export const alerts: Alert[] = [
  {
    id: "a1",
    severity: "error",
    title: "Atolamento Crítico",
    description: "HP LaserJet M404n (Recepção)",
    clientId: "transprime",
    printerId: "p1",
    time: "14:22",
    ago: "Há 5 min",
  },
  {
    id: "a2",
    severity: "warning",
    title: "Toner Baixo (12%)",
    description: "Brother L2710 (Logística)",
    clientId: "transprime",
    printerId: "p2",
    time: "12:45",
    ago: "Há 2h",
  },
  {
    id: "a3",
    severity: "error",
    title: "Sem papel",
    description: "Xerox VersaLink C405 (UTI - Posto 2)",
    clientId: "santafe",
    printerId: "p7",
    time: "13:50",
    ago: "Há 12 min",
  },
  {
    id: "a4",
    severity: "warning",
    title: "Toner Ciano em 8%",
    description: "Ricoh IM C3000 (Sala 402)",
    clientId: "santafe",
    printerId: "p5",
    time: "13:02",
    ago: "Há 1h",
  },
  {
    id: "a5",
    severity: "info",
    title: "Agente Reiniciado",
    description: "Servidor Principal 01",
    clientId: "transprime",
    time: "09:12",
    ago: "Há 5h",
  },
  {
    id: "a6",
    severity: "error",
    title: "Agente Offline",
    description: "Petrobel - sem conexão há 72h",
    clientId: "petrobel",
    time: "Ontem",
    ago: "Há 3 dias",
  },
  {
    id: "a7",
    severity: "info",
    title: "Firmware atualizado",
    description: "4 dispositivos concluídos (Mackenzie)",
    clientId: "mackenzie",
    time: "Ontem",
    ago: "Ontem",
  },
];

// Volume data — last 14 days
export const volumeSeries = [
  { day: "14/06", paginas: 8420 },
  { day: "15/06", paginas: 9210 },
  { day: "16/06", paginas: 7180 },
  { day: "17/06", paginas: 10240 },
  { day: "18/06", paginas: 11920 },
  { day: "19/06", paginas: 12010 },
  { day: "20/06", paginas: 9420 },
  { day: "21/06", paginas: 4220 },
  { day: "22/06", paginas: 3110 },
  { day: "23/06", paginas: 11420 },
  { day: "24/06", paginas: 12880 },
  { day: "25/06", paginas: 13410 },
  { day: "26/06", paginas: 12101 },
  { day: "27/06", paginas: 12450 },
];

export const totals = {
  printers: clients.reduce((s, c) => s + c.printersTotal, 0),
  online: clients.reduce((s, c) => s + c.printersOnline, 0),
  alerts: alerts.filter((a) => a.severity !== "info").length,
  pagesToday: clients.reduce((s, c) => s + c.pagesToday, 0),
};

export function getClient(id: string) {
  return clients.find((c) => c.id === id);
}
export function getClientPrinters(id: string) {
  return printers.filter((p) => p.clientId === id);
}
export function getClientAlerts(id: string) {
  return alerts.filter((a) => a.clientId === id);
}
