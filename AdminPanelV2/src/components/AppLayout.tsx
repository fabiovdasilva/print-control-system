import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

interface Crumb {
  label: string;
  to?: string;
}

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: Crumb[];
  agentStatus?: {
    label: string;
    status: "online" | "unstable" | "offline";
  };
  actions?: ReactNode;
}

export function AppLayout({ children, breadcrumbs, agentStatus, actions }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs?.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 ? <span>/</span> : null}
                <span
                  className={
                    i === breadcrumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"
                  }
                >
                  {c.label}
                </span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {agentStatus ? (
              <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
                <span
                  className={`size-2 rounded-full ${
                    agentStatus.status === "online"
                      ? "bg-success"
                      : agentStatus.status === "unstable"
                        ? "bg-warning"
                        : "bg-danger"
                  }`}
                />
                <span className="text-xs font-medium text-foreground">{agentStatus.label}</span>
              </div>
            ) : null}
            {actions}
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "success" | "warning" | "danger" | "primary";
}) {
  const accentClass = {
    success: "border-l-4 border-l-success",
    warning: "border-l-4 border-l-warning",
    danger: "border-l-4 border-l-danger",
    primary: "border-l-4 border-l-primary",
  }[accent ?? "primary"];
  const valueColor = {
    success: "text-foreground",
    warning: "text-warning-foreground",
    danger: "text-danger",
    primary: "text-foreground",
  }[accent ?? "primary"];
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-sm ${accent ? accentClass : ""}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <span className={`text-3xl font-bold ${valueColor}`}>{value}</span>
        {hint ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}

export function Panel({
  title,
  children,
  right,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card shadow-sm ${className}`}>
      {title || right ? (
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          {title ? <h3 className="font-bold text-foreground">{title}</h3> : <div />}
          {right}
        </div>
      ) : null}
      <div className="p-6">{children}</div>
    </div>
  );
}
