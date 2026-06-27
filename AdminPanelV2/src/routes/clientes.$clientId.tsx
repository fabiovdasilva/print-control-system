import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { AppLayout, KpiCard, PageTitle, Panel } from "@/components/AppLayout";
import { VolumeChart } from "@/components/VolumeChart";
import { AlertsList } from "@/components/AlertsList";
import { StatusPill, TonerCMYK } from "@/components/StatusPill";

import { fetchDashboardTotals, API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Building2, Cpu, Network, Save, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const tabs = ["dashboard", "impressoras", "relatorios", "bilhetagem", "rede", "config"] as const;
type Tab = (typeof tabs)[number];

const searchSchema = z.object({
  tab: z.enum(tabs).catch("dashboard").optional(),
});

export const Route = createFileRoute("/clientes/$clientId")({
  validateSearch: searchSchema,
  component: Page,
});

const tabLabels: Record<Tab, string> = {
  dashboard: "Dashboard",
  impressoras: "Impressoras",
  relatorios: "Relatórios",
  bilhetagem: "Bilhetagem",
  rede: "Rede & Agente",
  config: "Configurações",
};

function Page() {
  const { clientId } = Route.useParams();
  const { tab = "dashboard" } = Route.useSearch();
  const navigate = useNavigate();
  
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardTotals
  });

  if (isLoading || !dashboard) {
    return <div className="p-8 flex justify-center items-center h-screen">Carregando dados...</div>;
  }

  const clientRaw = dashboard.clients.find((c: any) => c.id.toString() === clientId);
  if (!clientRaw) return <div className="p-8 flex justify-center items-center h-screen">Cliente não encontrado</div>;

  const printers = dashboard.printers.filter((p: any) => p.clientId.toString() === clientId);
  
  // Format to match UI
  const client = {
    id: clientRaw.id,
    name: clientRaw.name,
    cnpj: clientRaw.doc || '-',
    city: clientRaw.address || '-',
    printersOnline: printers.filter((p: any) => p.status === 'online').length,
    printersTotal: printers.length,
    agentVersion: 'v1.0',
    agentStatus: 'online', // placeholder
    network: {
      subnet: "192.168.1.0/24",
      gateway: "192.168.1.1",
      dns: "8.8.8.8",
      snmpCommunity: "public",
      pollIntervalSec: 60
    }
  };

  const clientAlerts = printers
    .filter((p: any) => p.status === 'offline' || (p.toner !== null && p.toner <= 15))
    .map((p: any) => ({
      id: p.id,
      severity: p.status === 'offline' ? 'error' : 'warning',
      title: p.status === 'offline' ? 'Impressora Offline' : `Toner Baixo (${p.toner}%)`,
      description: `${p.model || 'Desconhecida'} • ${p.location || client.name}`,
      time: p.lastAccess ? new Date(p.lastAccess).toLocaleTimeString() : 'Recente',
      ago: p.status === 'offline' ? 'Verifique a conexão' : 'Troca necessária em breve'
    }));

  const setTab = (t: Tab) =>
    navigate({ to: "/clientes/$clientId", params: { clientId: client.id.toString() }, search: { tab: t } });

  return (
    <AppLayout
      breadcrumbs={[{ label: "Clientes", to: "/clientes" }, { label: client.name }]}
      agentStatus={{
        label: `Agente ${client.agentVersion} ${
          client.agentStatus === "online" ? "Online" : client.agentStatus === "unstable" ? "Instável" : "Offline"
        }`,
        status: client.agentStatus as "online" | "unstable" | "offline",
      }}
      actions={
        <div className="flex gap-2">
           <a href={`${API_BASE}/clients/${client.id}/download-agent`} download className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium hover:bg-muted bg-card">
              Baixar Agente
           </a>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-xl bg-card shadow-sm ring-1 ring-border">
            <Building2 className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-sm text-muted-foreground">
              {client.cnpj} • {client.city}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? (
        <DashboardTab client={client} printers={printers} alerts={clientAlerts} />
      ) : null}
      {tab === "impressoras" ? <PrintersTab printers={printers} /> : null}
      {tab === "relatorios" ? <ReportsTab client={client} /> : null}
      {tab === "bilhetagem" ? <TicketingTab client={client} printers={printers} /> : null}
      {tab === "rede" ? <NetworkTab client={client} clientRaw={clientRaw} printers={printers} /> : null}
      {tab === "config" ? <ConfigTab client={client} clientRaw={clientRaw} /> : null}
    </AppLayout>
  );
}

function DashboardTab({
  client,
  printers,
  alerts,
}: {
  client: any;
  printers: any[];
  alerts: any[];
}) {
  const offline = client.printersTotal - client.printersOnline;
  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Impressoras" value={client.printersTotal} hint="Dispositivos" />
        <KpiCard label="Online agora" value={client.printersOnline} hint={client.printersTotal > 0 ? `${Math.round((client.printersOnline / client.printersTotal) * 100)}%` : '0%'} accent="success" />
        <KpiCard label="Alertas Toner" value={alerts.filter((a: any) => a.severity === "warning").length} hint="Requer atenção" accent="warning" />
        <KpiCard label="Offline / Erro" value={offline} hint="Chamado aberto" accent="danger" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Volume de Impressão (14 dias)"
          right={
            <div className="flex gap-2">
              <button className="rounded-md bg-muted px-3 py-1 text-xs">Diário</button>
              <button className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground">Semanal</button>
            </div>
          }
          className="lg:col-span-2"
        >
          <VolumeChart />
        </Panel>
        <Panel title="Histórico Recente">
          <AlertsList alerts={alerts.slice(0, 5)} />
        </Panel>
      </div>

      <PrintersTab printers={printers} />
    </>
  );
}

function PrintersTab({ printers }: { printers: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredPrinters = printers.filter((p: any) => 
    (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.ipAddress || '').includes(searchTerm)
  );

  return (
    <Panel
      title="Frota Ativa"
      right={
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Filtrar por IP ou modelo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-64 rounded-md border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      }
    >
      <div className="-mx-6 -mb-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3">Modelo</th>
              <th className="px-6 py-3">IP / Host</th>
              <th className="px-6 py-3">Local</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Toner</th>
              <th className="px-6 py-3">Páginas</th>
              <th className="px-6 py-3">Último ping</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredPrinters.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-6 py-4 text-sm font-medium">{p.model}</td>
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.ip || p.ipAddress}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{p.location || 'N/A'}</td>
                <td className="px-6 py-4">
                  <StatusPill status={p.status === 'online' ? 'online' : 'offline'} label={p.status === 'online' ? 'Pronta' : 'Desconectada'} />
                </td>
                <td className="px-6 py-4">
                  <TonerCMYK toner={p.toner} />
                </td>
                <td className="px-6 py-4 text-sm tabular-nums text-foreground">
                  {(p.pagesTotal || 0).toLocaleString("pt-BR")}
                </td>
                <td className="px-6 py-4 text-xs text-muted-foreground">{p.lastAccess ? new Date(p.lastAccess).toLocaleString() : 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                  <Link to="/clientes/$clientId/impressoras/$printerId" params={{ clientId: p.clientId.toString(), printerId: p.id.toString() }} className="text-sm font-medium text-primary hover:underline">
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReportsTab({ client }: { client: any }) {
  const { data = [] } = useQuery({
    queryKey: ['printjobs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/printjobs`);
      return res.json();
    }
  });
  const jobs = Array.isArray(data) ? data : [];

  const relevantJobs = jobs.filter((j: any) => j.clientId === client.id);
  const totalPages = relevantJobs.reduce((acc: number, j: any) => acc + j.totalPages, 0);
  
  // As a mockup, let's say 27% are color pages since we don't have color tracking in PrintJob yet.
  const colorPages = Math.round(totalPages * 0.27);
  const cost = totalPages * 0.03;

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <KpiCard label="Páginas (Total Geral)" value={totalPages.toLocaleString("pt-BR")} hint="P&B + Color" />
        <KpiCard label="Páginas Coloridas" value={colorPages.toLocaleString("pt-BR")} hint="Estimativa (27%)" accent="primary" />
        <KpiCard label="Custo Estimado" value={`R$ ${cost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} hint="R$ 0,03 / pág" accent="warning" />
      </div>
      <Panel title="Volume de Impressão (14 dias)">
        <VolumeChart height={320} clientId={client.id} />
      </Panel>
    </>
  );
}

function TicketingTab({ client, printers }: { client: any, printers: any[] }) {
  const queryClient = useQueryClient();
  const { data: jobs = [] } = useQuery({
    queryKey: ['clientJobs', client.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/clients/${client.id}/jobs`);
      return res.json();
    }
  });

  const { data: quotas = [] } = useQuery({
    queryKey: ['clientQuotas', client.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/quotas/${client.id}`);
      return res.json();
    }
  });

  const [newQuotaUser, setNewQuotaUser] = useState("");
  const [newQuotaMax, setNewQuotaMax] = useState("");

  const handleAddQuota = async () => {
    if (!newQuotaUser || !newQuotaMax) return;
    try {
      const res = await fetch(`${API_BASE}/quotas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          userName: newQuotaUser,
          maxPages: parseInt(newQuotaMax),
          isBlocked: false
        })
      });
      if (res.ok) {
        setNewQuotaUser("");
        setNewQuotaMax("");
        queryClient.invalidateQueries({ queryKey: ['clientQuotas', client.id] });
      } else {
        alert("Erro ao adicionar cota.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQuota = async (id: number) => {
    if (!confirm("Remover esta cota?")) return;
    try {
      const res = await fetch(`${API_BASE}/quotas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['clientQuotas', client.id] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlock = async (quota: any) => {
    try {
      await fetch(`${API_BASE}/quotas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quota,
          isBlocked: !quota.isBlocked
        })
      });
      queryClient.invalidateQueries({ queryKey: ['clientQuotas', client.id] });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Cotas de Usuários">
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-4 p-4 border border-border rounded-lg bg-card">
             <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Usuário</label>
                <input value={newQuotaUser} onChange={e => setNewQuotaUser(e.target.value)} placeholder="Ex: Joao" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
             </div>
             <div className="flex flex-col gap-1.5 w-32">
                <label className="text-xs font-medium text-muted-foreground uppercase">Máx Páginas</label>
                <input type="number" value={newQuotaMax} onChange={e => setNewQuotaMax(e.target.value)} placeholder="100" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
             </div>
             <button onClick={handleAddQuota} className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Adicionar Cota
             </button>
          </div>

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Usuário</th>
                  <th className="px-4 py-2">Uso / Máximo</th>
                  <th className="px-4 py-2">Progresso</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotas.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhuma cota configurada.</td></tr>
                ) : quotas.map((q: any) => {
                  const pct = Math.min(100, Math.round((q.pagesUsed / q.maxPages) * 100)) || 0;
                  return (
                    <tr key={q.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{q.userName}</td>
                      <td className="px-4 py-3">{q.pagesUsed} / {q.maxPages}</td>
                      <td className="px-4 py-3">
                         <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full", pct > 90 ? "bg-danger" : pct > 75 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }}></div>
                         </div>
                      </td>
                      <td className="px-4 py-3">
                         <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", q.isBlocked ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
                           {q.isBlocked ? "Bloqueado" : "Ativo"}
                         </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                         <button onClick={() => handleToggleBlock(q)} className="text-xs text-muted-foreground hover:text-foreground mr-3">
                            {q.isBlocked ? "Desbloquear" : "Bloquear"}
                         </button>
                         <button onClick={() => handleDeleteQuota(q.id)} className="text-xs text-danger hover:text-danger/80">Excluir</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <Panel title="Histórico de Impressões (Bilhetagem)">
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Data/Hora</th>
                <th className="px-4 py-2">Usuário</th>
                <th className="px-4 py-2">Documento</th>
                <th className="px-4 py-2">Páginas</th>
                <th className="px-4 py-2">Impressora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>
              ) : jobs.slice(0, 100).map((job: any) => {
                const printer = printers.find((p: any) => p.id === job.printerId);
                return (
                  <tr key={job.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 text-muted-foreground">{new Date(job.printedAt).toLocaleString()}</td>
                    <td className="px-4 py-2 font-medium">{job.userName}</td>
                    <td className="px-4 py-2 truncate max-w-[200px]" title={job.documentName}>{job.documentName}</td>
                    <td className="px-4 py-2 font-mono">{job.totalPages}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{printer ? printer.model : `ID: ${job.printerId}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function NetworkTab({ client, clientRaw, printers }: { client: any, clientRaw: any, printers: any[] }) {
  const queryClient = useQueryClient();
  const [subnets, setSubnets] = useState(clientRaw.networkSubnets || "");
  const [snmp, setSnmp] = useState(clientRaw.snmpCommunity || "public");
  const [poll, setPoll] = useState(clientRaw.pollInterval?.toString() || "15");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any[] | null>(null);
  const [printerDecisions, setPrinterDecisions] = useState<Record<string, boolean>>({});

  const { data: agentStatus } = useQuery({
    queryKey: ['agentStatus', client.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/agent/${client.id}/status`);
      return res.json();
    },
    refetchInterval: 10000
  });

  const discoveredIPs = Array.from(new Set(printers.filter(p => p.ip).map(p => p.ip)));
  const hosts = agentStatus?.hosts || [];
  const isOnline = agentStatus?.isOnline || false;

  const handleToggleRole = async (hostname: string, isScanner: boolean, isSpooler: boolean) => {
    try {
      await fetch(`${API_BASE}/agent/${client.id}/${hostname}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isScannerEnabled: isScanner, isSpoolerEnabled: isSpooler })
      });
      queryClient.invalidateQueries({ queryKey: ['agentStatus', client.id] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          networkSubnets: subnets,
          snmpCommunity: snmp,
          pollInterval: parseInt(poll) || 15
        })
      });
      if (res.ok) {
        alert("Configurações de rede salvas com sucesso!");
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } else {
        alert("Erro ao salvar configurações de rede.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro na comunicação com o servidor.");
    }
  };

  const handleForceScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch(`${API_BASE}/admin/force-scan/${client.id}`, { method: 'POST' });
      if (res.ok) {
         const data = await res.json();
         setSubnets(data.network);
         toast.success("Varredura concluída", {
           description: "Rede detectada e impressoras encontradas."
         });
         
         if (data.discovered && data.discovered.length > 0) {
             setScanResults(data.discovered);
             const initDecisions: Record<string, boolean> = {};
             data.discovered.forEach((d: any) => initDecisions[d.ip] = true);
             setPrinterDecisions(initDecisions);
         } else {
             toast.info("Nenhuma impressora nova encontrada na rede.");
         }
      } else {
         toast.error("Erro ao solicitar varredura.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleApprove = async () => {
    if (!scanResults) return;
    
    const payload = scanResults.map(p => ({
        clientId: client.id,
        ipAddress: p.ip,
        model: p.model,
        isMonitored: printerDecisions[p.ip]
    }));
    
    try {
        const res = await fetch(`${API_BASE}/printers/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            toast.success("Impressoras salvas!", { description: data.message });
            setScanResults(null);
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        } else {
            toast.error("Erro ao salvar aprovação.");
        }
    } catch (err) {
        toast.error("Erro de comunicação.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel
        title="Agentes Instalados"
        right={
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
              isOnline
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger",
            )}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          {hosts.length === 0 ? (
             <div className="text-sm text-muted-foreground text-center py-4">Nenhum agente instalado ou reportando.</div>
          ) : (
            hosts.map((host: any) => (
              <div key={host.hostname} className="flex flex-col gap-3 p-3 border border-border rounded-lg bg-card">
                <div className="flex items-start gap-4">
                  <div className="grid size-10 place-items-center rounded-lg bg-muted shrink-0">
                    <Cpu className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">{host.hostname}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", host.isOnline ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                        {host.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Última sincronização</span>
                      <span>{host.lastSeen ? new Date(host.lastSeen).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" checked={host.isScannerEnabled} onChange={e => handleToggleRole(host.hostname, e.target.checked, host.isSpoolerEnabled)} className="rounded border-border bg-background" />
                    <span>Rastrear Rede e Descobrir Impressoras (SNMP)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" checked={host.isSpoolerEnabled} onChange={e => handleToggleRole(host.hostname, host.isScannerEnabled, e.target.checked)} className="rounded border-border bg-background" />
                    <span>Controlar Bilhetagem (Monitorar Spooler)</span>
                  </label>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel title="Rede & Descoberta">
        <div className="flex items-start gap-4">
          <div className="grid size-12 place-items-center rounded-lg bg-muted shrink-0">
            <Network className="size-5 text-primary" />
          </div>
          <div className="flex-1 space-y-4 text-sm w-full">
            <div className="flex flex-col gap-1.5">
              <label className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Sub-redes ou IPs (separados por vírgula)</label>
              <input 
                type="text" 
                value={subnets} 
                onChange={(e) => setSubnets(e.target.value)} 
                placeholder="Ex: 192.168.1.0/24, 10.0.0.5" 
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-muted-foreground font-medium text-xs uppercase tracking-wider">IPs Descobertos Automaticamente</label>
              <div className="p-3 border border-border rounded-md bg-muted/30 text-xs max-h-32 overflow-y-auto font-mono">
                {discoveredIPs.length > 0 ? discoveredIPs.join(", ") : "Nenhuma impressora descoberta ainda."}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Comunidade SNMP</label>
              <input 
                type="text" 
                value={snmp} 
                onChange={(e) => setSnmp(e.target.value)} 
                placeholder="Ex: public" 
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Intervalo de Polling (minutos)</label>
              <input 
                type="number" 
                value={poll} 
                onChange={(e) => setPoll(e.target.value)} 
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" 
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={handleForceScan} 
            disabled={isScanning}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? <Loader2 className="size-4 animate-spin text-primary" /> : <Search className="size-4" />}
            {isScanning ? "Aguardando agente..." : "Forçar Varredura"}
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Save className="size-4" /> Salvar Rede
          </button>
        </div>
      </Panel>

      {scanResults && (
        <Dialog open={true} onOpenChange={(open) => !open && setScanResults(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Aprovação de Impressoras</DialogTitle>
              <DialogDescription>
                A varredura encontrou os seguintes dispositivos na rede <strong>{subnets}</strong>. Selecione quais você deseja monitorar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
               {scanResults.map((p, idx) => (
                   <div key={idx} className="flex items-center space-x-3 rounded-lg border p-3">
                       <Checkbox 
                           id={`printer-${idx}`} 
                           checked={printerDecisions[p.ip]}
                           onCheckedChange={(c) => setPrinterDecisions(prev => ({...prev, [p.ip]: !!c}))}
                       />
                       <div className="flex-1">
                           <label htmlFor={`printer-${idx}`} className="text-sm font-medium leading-none cursor-pointer">
                               {p.ip}
                           </label>
                           <p className="text-xs text-muted-foreground mt-1">{p.model} ({p.mac})</p>
                       </div>
                       <div className="text-xs font-semibold">
                           {printerDecisions[p.ip] ? <span className="text-emerald-500">Monitorar</span> : <span className="text-muted-foreground">Ocultar</span>}
                       </div>
                   </div>
               ))}
            </div>
            <DialogFooter>
              <button 
                 onClick={() => setScanResults(null)}
                 className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                 Cancelar
              </button>
              <button 
                 onClick={handleApprove}
                 className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                 Salvar e Aplicar
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ConfigTab({ client, clientRaw }: { client: any, clientRaw: any }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(clientRaw.name || "");
  const [doc, setDoc] = useState(clientRaw.doc || "");
  const [city, setCity] = useState(clientRaw.address || "");
  const [tol, setTol] = useState(clientRaw.offlineToleranceHours?.toString() || "48");

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          doc: doc,
          address: city,
          offlineToleranceHours: parseInt(tol) || 48
        })
      });
      if (res.ok) {
        alert("Configurações salvas com sucesso!");
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } else {
        alert("Erro ao salvar configurações.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro na comunicação com o servidor.");
    }
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir esta empresa permanentemente? Todos os agentes e impressoras associados serão removidos do sistema.")) {
      try {
        const res = await fetch(`${API_BASE}/clients/${client.id}`, { method: 'DELETE' });
        if (res.ok) {
          alert("Empresa excluída com sucesso!");
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          navigate({ to: "/clientes" });
        } else {
          alert("Erro ao excluir a empresa.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro na comunicação com o servidor.");
      }
    }
  };

  return (
    <Panel title="Dados do Cliente">
      <div className="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Razão social" value={name} onChange={setName} />
        <Field label="CNPJ" value={doc} onChange={setDoc} />
        <Field label="Cidade / UF" value={city} onChange={setCity} />
        <Field label="Tempo Offline (Horas)" value={tol} onChange={setTol} type="number" />
      </div>
      <div className="mt-6 flex justify-between gap-2">
        <button onClick={handleDelete} className="rounded-md bg-danger-soft px-4 py-2 text-sm font-medium text-danger hover:bg-danger/20">
          Excluir Cliente
        </button>
        <div className="flex gap-2">
          <button className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Save className="size-4" /> Salvar alterações
          </button>
        </div>
      </div>
    </Panel>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export { Link };
