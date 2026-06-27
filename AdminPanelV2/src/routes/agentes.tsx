import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageTitle, Panel } from "@/components/AppLayout";
import { clients } from "@/lib/mock-data";
import { Cpu, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes — PrintFlow" },
      { name: "description", content: "Status dos agentes locais instalados em cada cliente." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppLayout breadcrumbs={[{ label: "Agentes" }]}>
      <PageTitle
        title="Agentes Locais"
        subtitle="Status de cada agente instalado nos ambientes dos clientes."
        right={
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Download className="size-4" /> Baixar instalador
          </button>
        }
      />

      <Panel title="Agentes Implantados">
        <div className="-mx-6 -mb-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Cliente / Host</th>
                <th className="px-6 py-3">Versão</th>
                <th className="px-6 py-3">Sub-rede</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Última sync</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-lg bg-muted">
                        <Cpu className="size-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{c.id}-agent-01</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{c.agentVersion}</td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{c.network.subnet}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        c.agentStatus === "online"
                          ? "bg-success-soft text-success"
                          : c.agentStatus === "unstable"
                            ? "bg-warning-soft text-warning-foreground"
                            : "bg-danger-soft text-danger",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          c.agentStatus === "online" && "bg-success",
                          c.agentStatus === "unstable" && "bg-warning",
                          c.agentStatus === "offline" && "bg-danger",
                        )}
                      />
                      {c.agentStatus === "online"
                        ? "Online"
                        : c.agentStatus === "unstable"
                          ? "Instável"
                          : "Offline"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {c.agentStatus === "online" ? "Há 12s" : c.agentStatus === "unstable" ? "Há 4 min" : "Há 3 dias"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-sm font-medium text-primary hover:underline">Gerenciar</button>
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
