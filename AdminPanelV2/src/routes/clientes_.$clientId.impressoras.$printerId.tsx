import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api';
import { AppLayout } from '@/components/AppLayout';
import { Printer as PrinterIcon, ArrowLeft, BarChart3, Settings, Play, Pause, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export const Route = createFileRoute('/clientes_/$clientId/impressoras/$printerId')({
  component: PrinterDetailsPage
});

function Panel({ title, children, right }: { title: string, children: React.ReactNode, right?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {right && <div>{right}</div>}
      </div>
      <div className="p-6 flex-1 bg-card">{children}</div>
    </div>
  );
}

export default function PrinterDetailsPage() {
  const { clientId, printerId } = useParams({ from: '/clientes_/$clientId/impressoras/$printerId' });
  const queryClient = useQueryClient();

  const { data: printer, isLoading, error } = useQuery({
    queryKey: ['printer', printerId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/printers/${printerId}`);
      if (!res.ok) throw new Error('Falha ao carregar impressora');
      return res.json();
    },
    refetchInterval: 10000
  });

  const toggleMonitorMutation = useMutation({
    mutationFn: async (isMonitored: boolean) => {
      await fetch(`${API_BASE}/printers/${printerId}/monitor`, {
        method: 'PUT'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer', printerId] });
    }
  });

  if (isLoading) return <AppLayout breadcrumbs={[{ label: 'Impressora', to: '/clientes' }]}><div className="p-8">Carregando detalhes...</div></AppLayout>;
  if (error || !printer) return <AppLayout breadcrumbs={[{ label: 'Erro' }]}><div className="p-8 text-danger">Erro ao carregar impressora.</div></AppLayout>;

  // Preparar dados do gráfico (últimos 14 dias)
  const chartData = printer.history.map((pages: number, i: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      pages
    };
  });

  const getTonerColor = (level: number | null) => {
    if (level === null) return "bg-muted";
    if (level > 20) return "bg-primary";
    if (level > 5) return "bg-warning";
    return "bg-danger";
  };

  return (
    <AppLayout 
      breadcrumbs={[
        { label: 'Clientes', to: '/clientes' },
        { label: printer.clientName || 'Cliente', to: `/clientes/${clientId}` },
        { label: printer.model || 'Impressora' }
      ]}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Detalhes: {printer.model}</h1>
          <p className="text-sm text-muted-foreground">Cliente: {printer.clientName}</p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Link to="/clientes/$clientId" params={{ clientId: clientId.toString() }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Voltar para o Cliente
          </Link>
          
          <button 
            onClick={() => toggleMonitorMutation.mutate(!printer.isMonitored)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all shadow-sm",
              printer.isMonitored 
                ? "bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {printer.isMonitored ? <Pause className="size-4" /> : <Play className="size-4" />}
            {printer.isMonitored ? "Pausar Monitoramento" : "Retomar Monitoramento"}
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-lg bg-primary/10">
              <Activity className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status SNMP</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn("size-2.5 rounded-full", printer.status === 'online' ? "bg-success" : "bg-danger")} />
                <h4 className="text-lg font-bold capitalize">{printer.status}</h4>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-lg bg-muted">
              <Settings className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">IP</p>
              <h4 className="text-base font-bold truncate max-w-[140px]">{printer.ip}</h4>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-lg bg-muted">
              <PrinterIcon className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modelo</p>
              <h4 className="text-base font-bold truncate max-w-[140px]">{printer.model}</h4>
              <p className="text-xs text-muted-foreground">ID: {printer.id}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-lg bg-muted">
              <BarChart3 className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Páginas Últimos 14d</p>
              <h4 className="text-2xl font-bold">{printer.history.reduce((a: number, b: number) => a + b, 0)}</h4>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Suprimentos */}
          <div className="lg:col-span-1 space-y-6">
            <Panel title="Suprimentos (SNMP)">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-foreground">Toner Principal</span>
                    <span className="font-bold">{printer.toner !== null ? `${printer.toner}%` : 'N/A'}</span>
                  </div>
                  <div className="h-3 w-full bg-muted overflow-hidden rounded-full">
                    <div className={cn("h-full transition-all duration-1000", getTonerColor(printer.toner))} style={{ width: `${printer.toner || 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-foreground">Cilindro (Drum)</span>
                    <span className="font-bold">{printer.drum !== null ? `${printer.drum}%` : 'N/A'}</span>
                  </div>
                  <div className="h-3 w-full bg-muted overflow-hidden rounded-full">
                    <div className={cn("h-full transition-all duration-1000", getTonerColor(printer.drum))} style={{ width: `${printer.drum || 0}%` }} />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border mt-6">
                  <p className="text-xs text-muted-foreground text-center">
                    Última leitura: {printer.lastSeen ? new Date(printer.lastSeen).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </Panel>
          </div>

          {/* Gráfico de Volume */}
          <div className="lg:col-span-2">
            <Panel title="Volume de Impressão (Últimos 14 dias)">
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pages" 
                      name="Páginas Impressas"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPages)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
