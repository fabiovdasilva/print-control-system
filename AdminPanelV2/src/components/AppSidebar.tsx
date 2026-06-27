import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Printer,
  AlertTriangle,
  FileBarChart,
  Cpu,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardTotals } from "@/lib/api";
import { cn } from "@/lib/utils";

const mainNav = [
  { to: "/", label: "Dashboard Geral", icon: LayoutDashboard, exact: true },
  { to: "/clientes", label: "Clientes", icon: Building2 },
  { to: "/impressoras", label: "Impressoras", icon: Printer },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle, badge: 0 },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
];

const systemNav = [
  { to: "/agentes", label: "Agentes", icon: Cpu },
  { to: "/configuracoes", label: "Configurações Globais", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardTotals
  });

  const clients = dashboard?.clients || [];

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const currentClient = clients.find((c: any) => pathname.startsWith(`/clientes/${c.id}`));

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
            P
          </div>
          <span className="text-xl font-bold tracking-tight text-white">PrintFlow</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-muted">
          Operador
        </div>
        {mainNav.map((item) => {
          const active = isActive(item.to, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-active text-white font-medium"
                  : "text-slate-400 hover:bg-sidebar-active/60 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="rounded bg-danger px-1.5 py-px text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}

        <div className="mt-8 mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-muted">
          Cliente Atual
        </div>
        <div className="relative">
          <select
            value={currentClient?.id ?? ""}
            onChange={(e) => {
              if (e.target.value) navigate({ to: "/clientes/$clientId", params: { clientId: e.target.value } });
            }}
            className="w-full appearance-none rounded-md bg-sidebar-active px-3 py-2 pr-8 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Selecionar cliente...</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>

        {currentClient ? (
          <div className="mt-4 space-y-1">
            {[
              { tab: "dashboard", label: "Frota e Status" },
              { tab: "relatorios", label: "Relatórios de Uso" },
              { tab: "rede", label: "Agente e Rede" },
              { tab: "config", label: "Configurações" },
            ].map((s) => (
              <Link
                key={s.tab}
                to="/clientes/$clientId"
                params={{ clientId: currentClient.id }}
                search={{ tab: s.tab }}
                className="block rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              >
                {s.label}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-8 mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-muted">
          Sistema
        </div>
        {systemNav.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-active text-white font-medium"
                  : "text-slate-400 hover:bg-sidebar-active/60 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-full bg-slate-700 text-xs font-bold text-white">
            RS
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">Ricardo Silva</p>
            <p className="truncate text-xs text-sidebar-muted">Operador Senior</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
