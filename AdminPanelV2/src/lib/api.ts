export const API_BASE = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE.replace(/\/$/, "")
  : typeof window !== "undefined"
    ? import.meta.env.DEV
      ? `http://${window.location.hostname}:5000/api`
      : `${window.location.origin}/api`
    : "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const ADMIN_REQUEST_TIMEOUT_MS = 15_000;

export async function adminFetch(input: string | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const timeout = new AbortController();
  const externalSignal = init.signal;
  const abortFromCaller = () => timeout.abort();
  externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = window.setTimeout(() => timeout.abort(), ADMIN_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(input, { ...init, headers, credentials: "include", signal: timeout.signal });
  } catch (error) {
    if (timeout.signal.aborted && !externalSignal?.aborted) {
      throw new ApiError("A central demorou para responder. Confira a conexão e tente novamente.", 408);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response.ok) {
    let message = `Falha na comunicação com a central (${response.status}).`;
    try {
      const payload = await response.clone().json();
      message = payload.message || payload.detail || message;
    } catch {
      const body = await response.clone().text().catch(() => "");
      if (body) message = body;
    }
    throw new ApiError(message, response.status);
  }
  return response;
}

export async function fetchClients() {
  return adminFetch(`${API_BASE}/clients`).then((res) => res.json());
}

export async function fetchPrinters() {
  return adminFetch(`${API_BASE}/printers`).then((res) => res.json());
}

export async function fetchPrintJobs() {
  return adminFetch(`${API_BASE}/printjobs`).then((res) => res.json());
}

export async function fetchAgents() {
  return adminFetch(`${API_BASE}/agents`).then((res) => res.json());
}

export async function fetchDashboardTotals() {
  const [clients, printers, agents] = await Promise.all([fetchClients(), fetchPrinters(), fetchAgents()]);
  const agentsByClient = new Map(agents.map((agent: any) => [agent.clientId, agent]));
  const clientsWithAgent = clients.map((client: any) => ({
    ...client,
    agent: agentsByClient.get(client.id) ?? { isOnline: false, lastSeen: null, hosts: [] },
  }));
  const totals = {
    printers: printers.length,
    online: printers.filter((printer: any) => printer.status === "online").length,
    alerts: printers.filter((printer: any) => printer.status !== "online" || (printer.toner != null && printer.toner <= 15)).length,
    clients: clients.length,
  };
  return { clients: clientsWithAgent, printers, agents, totals };
}

export async function downloadAgent(clientId: number) {
  const response = await adminFetch(`${API_BASE}/clients/${clientId}/download-agent`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `PrintAgent_Cliente_${clientId}.exe`;
  link.click();
  URL.revokeObjectURL(url);
}
