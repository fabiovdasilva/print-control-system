import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, KpiCard, PageTitle, Panel } from "@/components/AppLayout";
import { VolumeChart } from "@/components/VolumeChart";
import { clients } from "@/lib/mock-data";
import { Download } from "lucide-react";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — PrintFlow" },
      { name: "description", content: "Relatórios consolidados de impressão, custos e consumíveis." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppLayout breadcrumbs={[{ label: "Relatórios" }]}>
      <PageTitle
        title="Relatórios"
        subtitle="Consolidado de uso e custos por cliente."
        right={
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
            <Download className="size-4" /> Exportar CSV
          </button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Páginas no Mês" value="421.890" hint="Todos os clientes" />
        <KpiCard label="Páginas Coloridas" value="118.420" hint="28%" accent="primary" />
        <KpiCard label="Frente / Verso" value="62%" hint="Economia ativa" accent="success" />
        <KpiCard label="Custo Estimado" value="R$ 12.488,90" hint="R$ 0,03 / pág" accent="warning" />
      </div>

      <Panel title="Volume Mensal (14 dias)" className="mb-8">
        <VolumeChart height={320} />
      </Panel>

      <Panel title="Detalhamento por Cliente">
        <div className="-mx-6 -mb-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Páginas hoje</th>
                <th className="px-6 py-3">Páginas mês</th>
                <th className="px-6 py-3">Custo estimado</th>
                <th className="px-6 py-3">Variação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c, i) => {
                const monthly = c.pagesToday * 22;
                const cost = (monthly * 0.03).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                const variation = [+8.2, -3.1, +15.4, -1.8, -42.0][i] ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 text-sm font-medium">{c.name}</td>
                    <td className="px-6 py-4 text-sm tabular-nums">{c.pagesToday.toLocaleString("pt-BR")}</td>
                    <td className="px-6 py-4 text-sm tabular-nums">{monthly.toLocaleString("pt-BR")}</td>
                    <td className="px-6 py-4 text-sm tabular-nums">{cost}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-medium ${
                          variation > 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {variation > 0 ? "+" : ""}
                        {variation.toFixed(1)}%
                      </span>
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
