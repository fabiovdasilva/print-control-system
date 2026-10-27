import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout, KpiCard, PageTitle, Panel } from "@/components/AppLayout";
import { VolumeChart } from "@/components/VolumeChart";
import { fetchClients, fetchPrintJobs } from "@/lib/api";
import { Download } from "lucide-react";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — PrintFlow" }, { name: "description", content: "Volume de impressão real registrado pelos agentes." }] }),
  component: Page,
});

type Job = { id: number; clientId: number; clientName: string; printerModel: string; printerIp: string; documentName: string; userName: string; totalPages: number; printedAt: string };

function Page() {
  const jobsQuery = useQuery<Job[]>({ queryKey: ["printjobs"], queryFn: fetchPrintJobs });
  const clientsQuery = useQuery<any[]>({ queryKey: ["clients"], queryFn: fetchClients });
  const jobs = jobsQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const now = new Date();
  const monthJobs = jobs.filter((job) => { const date = new Date(job.printedAt); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); });
  const todayJobs = jobs.filter((job) => new Date(job.printedAt).toDateString() === now.toDateString());
  const totalPages = monthJobs.reduce((sum, job) => sum + job.totalPages, 0);
  const users = new Set(monthJobs.map((job) => job.userName).filter(Boolean)).size;

  function exportCsv() {
    const rows = [["Cliente", "Impressora", "IP", "Documento", "Usuário", "Páginas", "Data"], ...jobs.map((job) => [job.clientName, job.printerModel, job.printerIp, job.documentName, job.userName, job.totalPages, new Date(job.printedAt).toLocaleString("pt-BR")])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "relatorio-impressao.csv"; link.click(); URL.revokeObjectURL(url);
  }

  const error = jobsQuery.error ?? clientsQuery.error;
  return (
    <AppLayout breadcrumbs={[{ label: "Relatórios" }]}>
      <PageTitle title="Relatórios de impressão" subtitle="Totais baseados nos trabalhos recebidos pelos agentes." right={<button onClick={exportCsv} disabled={jobs.length === 0} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"><Download className="size-4" />Exportar CSV</button>} />
      {error ? <div role="alert" className="mb-5 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">{error instanceof Error ? error.message : "Falha ao carregar os dados."}</div> : null}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"><KpiCard label="Páginas no mês" value={totalPages.toLocaleString("pt-BR")} hint="Trabalhos recebidos" /><KpiCard label="Trabalhos no mês" value={monthJobs.length.toLocaleString("pt-BR")} hint="Documentos registrados" accent="primary" /><KpiCard label="Páginas hoje" value={todayJobs.reduce((sum, job) => sum + job.totalPages, 0).toLocaleString("pt-BR")} hint="Dia atual" accent="success" /><KpiCard label="Usuários ativos" value={users.toLocaleString("pt-BR")} hint="No mês atual" accent="warning" /></div>
      <Panel title="Volume recente de impressão" className="mb-8"><VolumeChart height={320} /></Panel>
      <Panel title="Detalhamento por cliente">{jobsQuery.isLoading || clientsQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando relatórios…</p> : clients.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre clientes e receba trabalhos de impressão para gerar relatórios.</p> : <div className="-mx-6 -mb-6 overflow-x-auto"><table className="w-full text-left"><thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3">Cliente</th><th className="px-6 py-3">Páginas hoje</th><th className="px-6 py-3">Páginas no mês</th><th className="px-6 py-3">Trabalhos no mês</th></tr></thead><tbody className="divide-y divide-border">{clients.map((client) => { const clientMonth = monthJobs.filter((job) => job.clientId === client.id); const clientToday = todayJobs.filter((job) => job.clientId === client.id); return <tr key={client.id}><td className="px-6 py-4 text-sm font-medium">{client.name}</td><td className="px-6 py-4 text-sm tabular-nums">{clientToday.reduce((sum, job) => sum + job.totalPages, 0).toLocaleString("pt-BR")}</td><td className="px-6 py-4 text-sm tabular-nums">{clientMonth.reduce((sum, job) => sum + job.totalPages, 0).toLocaleString("pt-BR")}</td><td className="px-6 py-4 text-sm tabular-nums">{clientMonth.length.toLocaleString("pt-BR")}</td></tr>; })}</tbody></table></div>}</Panel>
    </AppLayout>
  );
}
