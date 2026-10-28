import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout, EmptyState, PageTitle, Panel } from "@/components/AppLayout";
import { fetchAgents } from "@/lib/api";
import { Cpu } from "lucide-react";

export const Route = createFileRoute("/agentes")({
  head: () => ({ meta: [{ title: "Agentes — PrintFlow" }, { name: "description", content: "Status dos agentes locais instalados nos clientes." }] }),
  component: Page,
});

type Agent = { clientId: number; clientName: string; networkSubnets: string; isOnline: boolean; lastSeen: string | null; hosts: { hostname: string; lastSeen: string; isOnline: boolean }[] };

function Page() {
  const { data: agents = [], isLoading, error, refetch } = useQuery<Agent[]>({ queryKey: ["agents"], queryFn: fetchAgents, refetchInterval: 15_000 });
  return (
    <AppLayout breadcrumbs={[{ label: "Agentes" }]}>
      <PageTitle title="Agentes locais" subtitle="Último heartbeat recebido pela central para cada cliente." right={<Link to="/clientes" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Gerenciar clientes</Link>} />
      {error ? <div role="alert" className="mb-5 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">{error instanceof Error ? error.message : "Falha ao carregar agentes."}<button className="ml-3 underline" onClick={() => void refetch()}>Tentar novamente</button></div> : null}
      <Panel title="Conexões">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando agentes…</p> : agents.length === 0 ? <EmptyState icon={<Cpu size={20} />} title="Nenhum agente conectado" description="Cadastre um cliente e instale o agente para receber comunicação e estado da frota." action={<Link to="/clientes" className="text-sm font-semibold text-primary hover:underline">Gerenciar clientes</Link>} /> : (
          <div className="-mx-6 -mb-6 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3">Cliente / host</th><th className="px-6 py-3">Sub-rede</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Última comunicação</th></tr></thead>
              <tbody className="divide-y divide-border">
                {agents.flatMap((agent) => (agent.hosts.length ? agent.hosts : [{ hostname: "Agente não conectado", lastSeen: "", isOnline: false }]).map((host, index) => (
                  <tr key={`${agent.clientId}-${host.hostname}-${index}`}>
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-muted"><Cpu className="size-4 text-primary" /></div><div><Link to="/clientes/$clientId" params={{ clientId: String(agent.clientId) }} className="text-sm font-medium hover:text-primary">{agent.clientName}</Link><div className="font-mono text-xs text-muted-foreground">{host.hostname}</div></div></div></td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{agent.networkSubnets || "Não configurada"}</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${host.isOnline ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>{host.isOnline ? "Online" : "Offline"}</span></td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{host.lastSeen ? new Date(host.lastSeen).toLocaleString("pt-BR") : "Sem heartbeat"}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppLayout>
  );
}
