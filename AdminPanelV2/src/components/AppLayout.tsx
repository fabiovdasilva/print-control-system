import { useRef, useState, type ReactNode } from "react";
import { Menu, X, ChevronRight } from "lucide-react";
import { AppSidebar } from "./AppSidebar";

interface Crumb { label: string; to?: string }
interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: Crumb[];
  agentStatus?: { label: string; status: "online" | "unstable" | "offline" };
  actions?: ReactNode;
}

export function AppLayout({ children, breadcrumbs, agentStatus, actions }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMobileNav = () => {
    setMobileNavOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };
  const openMobileNav = () => {
    setMobileNavOpen(true);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>("#app-sidebar nav a")?.focus());
  };
  const statusLabel = agentStatus?.status === "online" ? "Operação saudável" : agentStatus?.status === "unstable" ? "Atenção necessária" : "Agentes offline";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <AppSidebar id="app-sidebar" open={mobileNavOpen} onClose={closeMobileNav} />
      {mobileNavOpen ? <button className="app-nav-scrim" type="button" aria-label="Fechar menu" onClick={closeMobileNav} /> : null}
      <div className="app-main">
        <header className="app-topbar">
          <button
            ref={menuButtonRef}
            type="button"
            className="app-menu-button"
            aria-label={mobileNavOpen ? "Fechar navegação" : "Abrir navegação"}
            aria-expanded={mobileNavOpen}
            aria-controls="app-sidebar"
            onClick={() => mobileNavOpen ? closeMobileNav() : openMobileNav()}
          >
            {mobileNavOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
          <nav className="app-breadcrumbs" aria-label="Localização">
            {breadcrumbs?.length ? breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="app-crumb">
                {index > 0 ? <ChevronRight size={14} aria-hidden="true" /> : null}
                <span aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>{crumb.label}</span>
              </span>
            )) : <span className="app-crumb-current">Central PrintFlow</span>}
          </nav>
          <div className="app-topbar-right">
            {agentStatus ? (
              <div className={`health-chip health-chip--${agentStatus.status}`} title={agentStatus.label}>
                <span className="health-chip-dot" aria-hidden="true" />
                <span>{statusLabel}</span>
                <span className="health-chip-detail">{agentStatus.label}</span>
              </div>
            ) : null}
            {actions}
          </div>
        </header>
        <main id="main-content" className="app-content">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="page-heading">
      <div className="page-heading-copy">
        <h1 className="page-heading-title">{title}</h1>
        {subtitle ? <p className="page-heading-description">{subtitle}</p> : null}
      </div>
      {right ? <div className="page-heading-actions">{right}</div> : null}
    </div>
  );
}

export function KpiCard({ label, value, hint, accent }: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "success" | "warning" | "danger" | "primary";
}) {
  return (
    <section className={`metric-card metric-card--${accent ?? "neutral"}`} aria-label={`${label}: ${value}`}>
      <div className="metric-card-topline">
        <p className="metric-card-label">{label}</p>
        <span className="metric-card-indicator" aria-hidden="true" />
      </div>
      <div className="metric-card-bottomline">
        <span className="metric-card-value">{value}</span>
        {hint ? <span className="metric-card-hint">{hint}</span> : null}
      </div>
    </section>
  );
}

export function Panel({ title, children, right, className = "" }: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`content-panel ${className}`}>
      {title || right ? (
        <div className="content-panel-header">
          {title ? <h2 className="content-panel-title">{title}</h2> : <div />}
          {right ? <div className="content-panel-actions">{right}</div> : null}
        </div>
      ) : null}
      <div className="content-panel-body">{children}</div>
    </section>
  );
}


export function EmptyState({ icon, title, description, action, className = "" }: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty-state ${className}`}>
      <span className="empty-state-icon" aria-hidden="true">{icon}</span>
      <div className="empty-state-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
