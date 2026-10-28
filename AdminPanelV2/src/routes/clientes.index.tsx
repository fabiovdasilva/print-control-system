import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, EmptyState, PageTitle, Panel } from "@/components/AppLayout";
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
  const { data: dashboard, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardTotals,
    refetchInterval: 15000
  });

  if (isLoading) return <div className="p-8 flex justify-center items-center h-screen">Carregando clientes…</div>;
  if (error) return <AppLayout breadcrumbs={[{ label: "Clientes" }]}><div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-5 text-sm text-danger">{error instanceof Error ? error.message : "Falha ao carregar clientes."}<button className="ml-3 underline" onClick={() => void refetch()}>Tentar novamente</button></div></AppLayout>;
  if (!dashboard) return null;

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
      agentStatus: c.agent?.isOnline ? 'Online' : 'Offline'
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
        subtitle={`${clients.length} clientes cadastrados na central.`}
        right={
          <Link to="/clientes/novo" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" /> Novo cliente
          </Link>
        }
      />

      <Panel
        right={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Buscar clientes por nome ou CNPJ"
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
              {filteredClients.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={<Building2 size={20} />} title={clients.length === 0 ? "Cadastre seu primeiro cliente" : "Nenhum cliente encontrado"} description={clients.length === 0 ? "Adicione uma empresa para organizar impressoras e agentes." : "Tente outro nome ou código, ou limpe a busca."} action={clients.length === 0 ? <Link to="/clientes/novo" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Cadastrar cliente</Link> : <button type="button" onClick={() => setSearchTerm("")} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold">Limpar busca</button>} /></td></tr>
              ) : filteredClients.map((c: any) => (
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
                    <span className="font-mono text-xs text-muted-foreground">{c.agentStatus}</span>
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
