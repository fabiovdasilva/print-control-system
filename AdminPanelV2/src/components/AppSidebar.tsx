import { useEffect, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, Printer, AlertTriangle, FileBarChart,
  Cpu, Settings, ChevronDown, ShieldCheck, Server, Activity,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardTotals } from "@/lib/api";
import { cn } from "@/lib/utils";

const mainNav = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/clientes", label: "Clientes", icon: Building2 },
  { to: "/impressoras", label: "Impressoras", icon: Printer },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
];
const systemNav = [
  { to: "/agentes", label: "Agentes", icon: Cpu },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppSidebar({ id, open, onClose, loadClientContext = true }: { id: string; open: boolean; onClose: () => void; loadClientContext?: boolean }) {
  const [mobileViewport, setMobileViewport] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboardTotals, enabled: loadClientContext });
  const clients = dashboard?.clients ?? [];
  const alertCount = dashboard?.totals?.alerts ?? 0;
  const currentClient = clients.find((client: any) => pathname.startsWith(`/clientes/${client.id}`));

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const updateViewport = () => setMobileViewport(media.matches);
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(document.querySelectorAll<HTMLElement>("#app-sidebar a[href], #app-sidebar button:not(:disabled), #app-sidebar select:not(:disabled)"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const isActive = (to: string, exact?: boolean) => exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const navLinkClass = (active: boolean) => cn("sidebar-link", active && "sidebar-link--active");

  return (
    <aside
      id={id}
      className={cn("app-sidebar", open && "app-sidebar--open")}
      aria-label="Navegação principal"
      aria-hidden={mobileViewport && !open ? true : undefined}
      aria-modal={mobileViewport && open ? true : undefined}
      role={mobileViewport && open ? "dialog" : undefined}
      inert={mobileViewport && !open ? true : undefined}
    >
      <div className="sidebar-brand-row">
        <Link to="/" onClick={onClose} className="sidebar-brand" aria-label="PrintFlow — visão geral">
          <span className="sidebar-brand-mark" aria-hidden="true">P</span>
          <span className="sidebar-brand-copy"><strong>PrintFlow</strong><small>MONITORAMENTO</small></span>
        </Link>
      </div>
      <nav className="sidebar-navigation">
        <p className="sidebar-section-label">Operação</p>
        <div className="sidebar-link-list">
          {mainNav.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} onClick={onClose} className={navLinkClass(active)} aria-current={active ? "page" : undefined}>
                <Icon className="sidebar-link-icon" size={18} aria-hidden="true" />
                <span className="sidebar-link-label">{item.label}</span>
                {item.to === "/alertas" && alertCount > 0 ? <span className="sidebar-count">{alertCount > 99 ? "99+" : alertCount}</span> : null}
              </Link>
            );
          })}
        </div>
        <div className="sidebar-client-context">
          <label className="sidebar-section-label" htmlFor="sidebar-client">Cliente selecionado</label>
          <div className="sidebar-select-wrap">
            <select
              id="sidebar-client"
              value={currentClient?.id ?? ""}
              onChange={(event) => {
                if (event.target.value) navigate({ to: "/clientes/$clientId", params: { clientId: event.target.value } });
              }}
              className="sidebar-client-select"
            >
              <option value="">Todos os clientes</option>
              {clients.map((client: any) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <ChevronDown className="sidebar-select-chevron" size={16} aria-hidden="true" />
          </div>
          {currentClient ? (
            <div className="sidebar-client-shortcuts">
              {[
                { tab: "dashboard", label: "Resumo", icon: Activity },
                { tab: "relatorios", label: "Uso e relatórios", icon: FileBarChart },
                { tab: "rede", label: "Agente e rede", icon: Server },
                { tab: "config", label: "Preferências", icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                return <Link key={item.tab} to="/clientes/$clientId" params={{ clientId: currentClient.id }} search={{ tab: item.tab }} onClick={onClose} className="sidebar-sub-link"><Icon size={15} aria-hidden="true" />{item.label}</Link>;
              })}
            </div>
          ) : null}
        </div>
        <p className="sidebar-section-label sidebar-section-label--system">Sistema</p>
        <div className="sidebar-link-list">
          {systemNav.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return <Link key={item.to} to={item.to} onClick={onClose} className={navLinkClass(active)} aria-current={active ? "page" : undefined}><Icon className="sidebar-link-icon" size={18} aria-hidden="true" /><span className="sidebar-link-label">{item.label}</span></Link>;
          })}
        </div>
      </nav>
      <div className="sidebar-account">
        <span className="sidebar-account-icon"><ShieldCheck size={18} aria-hidden="true" /></span>
        <span className="sidebar-account-copy"><strong>Central protegida</strong><small>Administrador</small></span>
      </div>
    </aside>
  );
}
