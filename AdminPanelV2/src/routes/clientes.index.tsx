import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageTitle, Panel } from "@/components/AppLayout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, adminFetch, fetchDashboardTotals } from "@/lib/api";
import { Building2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [showCreate, setShowCreate] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", doc: "", email: "", phone: "", address: "", networkSubnets: "", snmpCommunity: "public", pollInterval: 15 });
  const queryClient = useQueryClient();
  const createClient = useMutation({
    mutationFn: async () => {
      const response = await adminFetch(`${API_BASE}/clients`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newClient) });
      return response.json();
    },
    onSuccess: async () => {
      toast.success("Cliente cadastrado.");
      setShowCreate(false);
      setNewClient({ name: "", doc: "", email: "", phone: "", address: "", networkSubnets: "", snmpCommunity: "public", pollInterval: 15 });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Falha ao cadastrar cliente."),
  });
  const { data: dashboard, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardTotals
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
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" /> Novo cliente
          </button>
        }
      />

      {showCreate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
          <form className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="new-client-title" onSubmit={(event) => { event.preventDefault(); createClient.mutate(); }}>
            <h2 id="new-client-title" className="text-lg font-semibold">Cadastrar cliente</h2>
            <p className="mt-1 text-sm text-muted-foreground">Defina os dados e a faixa de rede que o agente vai consultar.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[{key:"name",label:"Nome",required:true},{key:"doc",label:"CNPJ / código"},{key:"email",label:"E-mail"},{key:"phone",label:"Telefone"},{key:"address",label:"Endereço"},{key:"networkSubnets",label:"Sub-redes (CIDR, separadas por vírgula)"},{key:"snmpCommunity",label:"Comunidade SNMP"},{key:"pollInterval",label:"Intervalo de leitura (minutos)"}].map(({key,label,required}) => <label key={key} className="text-sm font-medium">{label}<input required={required} type={key === "pollInterval" ? "number" : "text"} min={key === "pollInterval" ? 1 : undefined} value={newClient[key as keyof typeof newClient]} onChange={(event) => setNewClient((value) => ({...value,[key]: key === "pollInterval" ? Number(event.target.value) : event.target.value}))} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>)}
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={createClient.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{createClient.isPending ? "Salvando…" : "Cadastrar cliente"}</button></div>
          </form>
        </div>
      ) : null}

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
