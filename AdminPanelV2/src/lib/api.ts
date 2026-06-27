export const API_BASE = typeof window !== 'undefined' ? "http://" + window.location.hostname + ":5000/api" : "http://localhost:5000/api";

export async function fetchClients() {
    const res = await fetch(`${API_BASE}/clients`);
    if (!res.ok) throw new Error("Failed to fetch clients");
    return res.json();
}

export async function fetchPrinters() {
    const res = await fetch(`${API_BASE}/printers`);
    if (!res.ok) throw new Error("Failed to fetch printers");
    return res.json();
}

export async function fetchPrintJobs() {
    const res = await fetch(`${API_BASE}/printjobs`);
    if (!res.ok) throw new Error("Failed to fetch print jobs");
    return res.json();
}

export async function fetchDashboardTotals() {
    const clients = await fetchClients();
    const printers = await fetchPrinters();
    
    const totals = {
        printers: printers.length,
        online: printers.filter((p: any) => p.status === 'online').length,
        alerts: printers.filter((p: any) => p.status === 'offline' || (p.toner !== null && p.toner < 15)).length,
        clients: clients.length
    };
    
    return { clients, printers, totals };
}
