import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageTitle, Panel } from "@/components/AppLayout";
import { StatusPill, TonerCMYK } from "@/components/StatusPill";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardTotals } from "@/lib/api";
import { Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/impressoras")({
  head: () => ({
    meta: [
      { title: "Impressoras — PrintFlow" },
      { name: "description", content: "Todas as impressoras monitoradas em todos os clientes." },
    ],
  }),
  component: Page,
});

function Page() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardTotals
  });

  if (isLoading || !dashboard) {
    return <div className="p-8 flex justify-center items-center h-screen">Carregando dados...</div>;
  }

  const { clients, printers } = dashboard;

  const filteredPrinters = printers.filter((p: any) => 
    (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.ipAddress || '').includes(searchTerm) ||
    (p.clientName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout breadcrumbs={[{ label: "Impressoras" }]}>
      <PageTitle
        title="Todas as Impressoras"
        subtitle={`${printers.length} dispositivos em ${clients.length} clientes.`}
      />
      <Panel
        title="Frota Consolidada"
        right={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Filtrar por modelo, IP ou cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-80 rounded-md border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        }
      >
        <div className="-mx-6 -mb-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Modelo</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">IP</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Toner</th>
                <th className="px-6 py-3">Páginas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPrinters.map((p: any) => {
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{p.model}</div>
                      <div className="text-xs text-muted-foreground">{p.location || 'Local não definido'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        to="/clientes/$clientId"
                        params={{ clientId: p.clientId.toString() }}
                        className="text-primary hover:underline"
                      >
                        {p.clientName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.ip || p.ipAddress}</td>
                    <td className="px-6 py-4">
                      <StatusPill status={p.status === 'online' ? 'online' : 'offline'} label={p.status === 'online' ? 'Pronta' : 'Desconectada'} />
                    </td>
                    <td className="px-6 py-4">
                      <TonerCMYK toner={p.toner} />
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums">{(p.pagesTotal || 0).toLocaleString("pt-BR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppLayout>
  );
}
