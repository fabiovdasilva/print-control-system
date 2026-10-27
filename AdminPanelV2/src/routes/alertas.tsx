import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout, KpiCard, PageTitle, Panel } from "@/components/AppLayout";
import { fetchDashboardTotals } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/alertas")({
  head: () => ({ meta: [{ title: "Alertas — PrintFlow" }, { name: "description", content: "Alertas derivados do estado atual das impressoras." }] }),
  component: Page,
});

function Page() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboardTotals });
  const alerts = (data?.printers ?? []).filter((printer: any) => printer.status !== "online" || (printer.toner != null && printer.toner <= 15)).map((printer: any) => ({
    printer,
    critical: printer.status !== "online",
    title: printer.status !== "online" ? `Impressora ${printer.status === "offline" ? "offline" : "com alerta"}` : `Toner baixo (${printer.toner}%)`,
  }));
  const critical = alerts.filter((alert: any) => alert.critical).length;
  const warnings = alerts.length - critical;

  return (
    <AppLayout breadcrumbs={[{ label: "Alertas" }]}>
      <PageTitle title="Central de alertas" subtitle="Ocorrências calculadas a partir da última leitura registrada pela central." />
      {error ? <div role="alert" className="mb-5 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">{error instanceof Error ? error.message : "Falha ao carregar alertas."}<button className="ml-3 underline" onClick={() => void refetch()}>Tentar novamente</button></div> : null}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3"><KpiCard label="Críticos" value={critical} hint="Impressoras sem resposta" accent="danger" /><KpiCard label="Avisos" value={warnings} hint="Consumível em nível baixo" accent="warning" /><KpiCard label="Total aberto" value={alerts.length} hint="Estado atual" /></div>
      <Panel title="Impressoras que exigem atenção">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando alertas…</p> : alerts.length === 0 ? <div className="flex items-center gap-3 text-sm text-muted-foreground"><AlertTriangle className="size-4" />Nenhum alerta ativo.</div> : <div className="-mx-6 -mb-6 overflow-x-auto"><table className="w-full text-left"><thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3">Nível</th><th className="px-6 py-3">Impressora</th><th className="px-6 py-3">Cliente</th><th className="px-6 py-3">Última leitura</th></tr></thead><tbody className="divide-y divide-border">{alerts.map(({ printer, critical, title }: any) => <tr key={printer.id}><td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${critical ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning-foreground"}`}>{critical ? "Crítico" : "Aviso"}</span></td><td className="px-6 py-4"><div className="text-sm font-medium">{title}</div><div className="font-mono text-xs text-muted-foreground">{printer.model} · {printer.ip}</div></td><td className="px-6 py-4"><Link to="/clientes/$clientId" params={{ clientId: String(printer.clientId) }} className="text-sm text-primary hover:underline">{printer.clientName}</Link></td><td className="px-6 py-4 text-xs text-muted-foreground">{printer.lastAccess ? new Date(printer.lastAccess).toLocaleString("pt-BR") : "Sem leitura"}</td></tr>)}</tbody></table></div>}
      </Panel>
    </AppLayout>
  );
}
