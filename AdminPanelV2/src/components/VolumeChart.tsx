import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { fetchPrintJobs } from "@/lib/api";
import { EmptyState } from "@/components/AppLayout";
import { Printer } from "lucide-react";

export function VolumeChart({ height = 260, clientId }: { height?: number; clientId?: number }) {
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ["printjobs"], queryFn: fetchPrintJobs });

  if (isLoading) {
    return <div className="chart-loading" style={{ height }} role="status">Carregando dados de impressão…</div>;
  }

  const relevantJobs = clientId ? jobs.filter((job: any) => job.clientId === clientId) : jobs;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 13);
  const recentJobs = relevantJobs.filter((job: any) => {
    const printedAt = new Date(job.printedAt);
    return !Number.isNaN(printedAt.getTime()) && printedAt >= cutoff;
  });

  if (recentJobs.length === 0) {
    return (
      <div className="chart-empty-shell" style={{ height }}>
        <EmptyState icon={<Printer size={20} />} title="Sem dados recentes" description="O volume aparecerá quando a central receber trabalhos de impressão." />
      </div>
    );
  }

  const dataMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dataMap.set(date.toISOString().split("T")[0], 0);
  }

  recentJobs.forEach((job: any) => {
    const date = new Date(job.printedAt);
    if (Number.isNaN(date.getTime())) return;
    const dateKey = date.toISOString().split("T")[0];
    if (dataMap.has(dateKey)) dataMap.set(dateKey, dataMap.get(dateKey)! + job.totalPages);
  });

  const chartData = Array.from(dataMap.entries()).map(([date, pages]) => {
    const [, month, day] = date.split("-");
    return { day: `${day}/${month}`, paginas: pages };
  });

  return (
    <div className="volume-chart" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--app-brand)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--app-brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf2" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#718096" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#718096" }} axisLine={false} tickLine={false} width={50} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e0e7ef", fontSize: 12, boxShadow: "0 4px 12px rgba(16,35,62,.08)" }} formatter={(value: number) => [`${value.toLocaleString("pt-BR")} páginas`, "Volume"]} />
          <Area type="monotone" dataKey="paginas" stroke="var(--app-brand)" strokeWidth={2.5} fill="url(#vol)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
