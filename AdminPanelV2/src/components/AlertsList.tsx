import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/AppLayout";
import { CircleCheck } from "lucide-react";

export type Alert = { id: number | string; severity: "error" | "warning" | "info"; title: string; description: string; time: string; ago: string };

const sevStyle: Record<Alert["severity"], { bg: string; dot: string; title: string; desc: string }> = {
  error: { bg: "bg-danger-soft/60", dot: "bg-danger", title: "text-danger", desc: "text-danger/80" },
  warning: { bg: "bg-warning-soft/60", dot: "bg-warning", title: "text-warning-foreground", desc: "text-warning-foreground/70" },
  info: { bg: "", dot: "bg-muted-foreground", title: "text-foreground", desc: "text-muted-foreground" },
};

export function AlertsList({ alerts, compact = false }: { alerts: Alert[]; compact?: boolean }) {
  if (alerts.length === 0) {
    return <EmptyState icon={<CircleCheck size={20} />} title="Nenhum alerta ativo" description="As impressoras estão sem ocorrências que precisem de atenção." className="alerts-empty-state" />;
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {alerts.map((alert) => {
        const style = sevStyle[alert.severity];
        return (
          <article key={alert.id} className={cn("alert-list-item", style.bg)}>
            <span className={cn("alert-list-dot", style.dot)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className={cn("text-xs font-bold", style.title)}>{alert.title}</p>
              <p className={cn("text-[11px]", style.desc)}>{alert.description}</p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">{alert.time} • {alert.ago}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
