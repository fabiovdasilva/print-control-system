import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { fetchPrintJobs } from "@/lib/api";

export function VolumeChart({ height = 260, clientId }: { height?: number, clientId?: number }) {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['printjobs'],
    queryFn: fetchPrintJobs
  });

  if (isLoading) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando dados...</div>;
  }

  // Filter by clientId if provided
  const relevantJobs = clientId ? jobs.filter((j: any) => j.clientId === clientId) : jobs;

  // Process data for the last 14 days
  const dataMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dataMap.set(d.toISOString().split('T')[0], 0);
  }

  relevantJobs.forEach((job: any) => {
    const dateStr = new Date(job.printedAt).toISOString().split('T')[0];
    if (dataMap.has(dateStr)) {
      dataMap.set(dateStr, dataMap.get(dateStr)! + job.totalPages);
    }
  });

  const chartData = Array.from(dataMap.entries()).map(([date, pages]) => {
    const [, month, day] = date.split('-');
    return { day: `${day}/${month}`, paginas: pages };
  });

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.546 0.215 262.881)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="oklch(0.546 0.215 262.881)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.929 0.013 255.508)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "oklch(0.554 0.046 257.417)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "oklch(0.554 0.046 257.417)" }} axisLine={false} tickLine={false} width={50} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid oklch(0.929 0.013 255.508)",
              fontSize: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            formatter={(v: number) => [v.toLocaleString("pt-BR") + " páginas", "Volume"]}
          />
          <Area
            type="monotone"
            dataKey="paginas"
            stroke="oklch(0.546 0.215 262.881)"
            strokeWidth={2}
            fill="url(#vol)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
