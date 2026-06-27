import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageTitle, Panel } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardTotals } from "@/lib/api";
import { Building2, Plus, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — PrintFlow" },
      { name: "description", content: "Lista de clientes monitorados pela plataforma." },
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

  const uiClients = clients.map((c: any) => {
    const cPrinters = printers.filter((p: any) => p.clientId === c.id);
    const cOnlinePrinters = cPrinters.filter((p: any) => p.status === 'online').length;
    return {
      id: c.id,
      name: c.name,
      cnpj: c.doc || '-',
      city: c.address || '-',
      printersOnline: cOnlinePrinters,
      printersTotal: cPrinters.length,
      agentVersion: 'v1.0'
    };
  });

  const filteredClients = uiClients.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cnpj.includes(searchTerm)
  );

  return (
    <AppLayout breadcrumbs={[{ label: "Clientes" }]}>
      <PageTitle
        title="Clientes"
        subtitle={`${clients.length} empresas com agentes implantados.`}
        right={
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" /> Novo cliente
          </button>
        }
      />

      <Panel
        right={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar por nome ou CNPJ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-72 rounded-md border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        }
        title="Todos os clientes"
      >
        <div className="-mx-6 -mb-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">CNPJ</th>
                <th className="px-6 py-3">Localização</th>
                <th className="px-6 py-3">Impressoras</th>
                <th className="px-6 py-3">Agente</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredClients.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-lg bg-muted">
                        <Building2 className="size-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{c.cnpj}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{c.city}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="font-medium">{c.printersOnline}</span>
                    <span className="text-muted-foreground"> / {c.printersTotal}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-muted-foreground">{c.agentVersion}</span>
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
