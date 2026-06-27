import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, KpiCard, PageTitle, Panel } from "@/components/AppLayout";
import { alerts, clients } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas — PrintFlow" },
      { name: "description", content: "Central de alertas em tempo real." },
    ],
  }),
  component: Page,
});

function Page() {
  const counts = {
    error: alerts.filter((a) => a.severity === "error").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };
  return (
    <AppLayout breadcrumbs={[{ label: "Alertas" }]}>
      <PageTitle title="Central de Alertas" subtitle="Eventos em tempo real de todos os clientes monitorados." />

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <KpiCard label="Críticos" value={counts.error} hint="Ação imediata" accent="danger" />
        <KpiCard label="Avisos" value={counts.warning} hint="Próximos da falha" accent="warning" />
        <KpiCard label="Informativos" value={counts.info} hint="Últimas 24h" accent="primary" />
      </div>

      <Panel title="Histórico completo">
        <div className="-mx-6 -mb-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Severidade</th>
                <th className="px-6 py-3">Evento</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Quando</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {alerts.map((a) => {
                const client = clients.find((c) => c.id === a.clientId);
                return (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          a.severity === "error" && "bg-danger-soft text-danger",
                          a.severity === "warning" && "bg-warning-soft text-warning-foreground",
                          a.severity === "info" && "bg-muted text-muted-foreground",
                        )}
                      >
                        {a.severity === "error" ? "Crítico" : a.severity === "warning" ? "Aviso" : "Info"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        to="/clientes/$clientId"
                        params={{ clientId: a.clientId }}
                        className="text-primary hover:underline"
                      >
                        {client?.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {a.time} • {a.ago}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-medium text-primary hover:underline">Reconhecer</button>
                    </td>
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
