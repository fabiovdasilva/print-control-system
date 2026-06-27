import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, KpiCard, PageTitle, Panel } from "@/components/AppLayout";
import { VolumeChart } from "@/components/VolumeChart";
import { AlertsList } from "@/components/AlertsList";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardTotals, fetchClients, fetchPrinters } from "@/lib/api";
import { ArrowRight, Building2, Printer } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Geral — PrintFlow" },
      { name: "description", content: "Visão consolidada de todos os clientes, impressoras e alertas em tempo real." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardTotals
  });

  if (isLoading || !dashboard) {
    return <div className="p-8 flex justify-center items-center h-screen">Carregando dados reais...</div>;
  }

  const { clients, printers, totals } = dashboard;
  const offline = totals.printers - totals.online;
  // TODO: agentStatus requires a check if agent is reachable, let's assume online for now or map properly.
  const activeClients = clients.length;

  // Adapt the backend client objects to match UI expectations
  const uiClients = clients.map((c: any) => {
    const cPrinters = printers.filter((p: any) => p.clientId === c.id);
    const cOnlinePrinters = cPrinters.filter((p: any) => p.status === 'online').length;
    // mock some fields that might be missing in backend for display
    return {
      id: c.id,
      name: c.name,
      cnpj: c.doc || '-',
      city: c.address || '-',
      printersOnline: cOnlinePrinters,
      printersTotal: cPrinters.length,
      agentStatus: 'online', // assume online for mock UI representation
      pagesToday: cPrinters.reduce((acc: number, p: any) => acc + (p.pagesToday || 0), 0),
      alertsCritical: cPrinters.filter((p: any) => p.status === 'offline' || (p.toner !== null && p.toner < 15)).length
    };
  });

  // Alerts logic for the dashboard
  const realAlerts = printers
    .filter((p: any) => p.status === 'offline' || (p.toner !== null && p.toner <= 15))
    .map((p: any) => ({
      id: p.id,
      severity: p.status === 'offline' ? 'error' : 'warning',
      title: p.status === 'offline' ? 'Impressora Offline' : `Toner Baixo (${p.toner}%)`,
      description: `${p.model || 'Desconhecida'} • ${p.location || p.clientName || 'Desconhecida'}`,
      time: p.lastAccess ? new Date(p.lastAccess).toLocaleTimeString() : 'Recente',
      ago: p.status === 'offline' ? 'Verifique a conexão' : 'Troca necessária em breve'
    }));

  return (
    <AppLayout
      breadcrumbs={[{ label: "Dashboard Geral" }]}
      agentStatus={{ label: `${uiClients.length} clientes registrados`, status: "online" }}
    >
      <PageTitle
        title="Dashboard Geral"
        subtitle="Visão consolidada de toda a operação — clientes, impressoras e alertas em tempo real."
      />

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Clientes Ativos" value={activeClients} hint="Empresas" />
        <KpiCard
          label="Impressoras Online"
          value={`${totals.online}/${totals.printers}`}
          hint={totals.printers > 0 ? `${Math.round((totals.online / totals.printers) * 100)}%` : '0%'}
          accent="success"
        />
        <KpiCard label="Alertas Abertos" value={totals.alerts} hint="Requer atenção" accent="warning" />
        <KpiCard label="Offline / Erro" value={offline} hint="Chamados" accent="danger" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Volume Consolidado de Impressão"
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
        <Panel title="Alertas Recentes">
          <AlertsList alerts={realAlerts.slice(0, 5)} />
        </Panel>
      </div>

      <Panel
        title="Clientes"
        right={
          <Link
            to="/clientes"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver todos <ArrowRight className="size-3" />
          </Link>
        }
      >
        <div className="-mx-6 -mb-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Localização</th>
                <th className="px-6 py-3">Parque</th>
                <th className="px-6 py-3">Agente</th>
                <th className="px-6 py-3">Páginas hoje</th>
                <th className="px-6 py-3">Alertas</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {uiClients.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-lg bg-muted">
                        <Building2 className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.cnpj}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{c.city}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Printer className="size-3.5 text-muted-foreground" />
                      <span className="font-medium">{c.printersOnline}</span>
                      <span className="text-muted-foreground">/ {c.printersTotal}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-success-soft text-success`}
                    >
                      <span
                        className={`size-1.5 rounded-full bg-success`}
                      />
                      Online
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm tabular-nums">{c.pagesToday.toLocaleString("pt-BR")}</td>
                  <td className="px-6 py-4">
                    {c.alertsCritical > 0 ? (
                      <span className="text-sm font-bold text-danger">{c.alertsCritical}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to="/clientes/$clientId"
                      params={{ clientId: c.id.toString() }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppLayout>
  );
}
