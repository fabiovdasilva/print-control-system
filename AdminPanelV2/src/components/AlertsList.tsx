import { cn } from "@/lib/utils";
import type { Alert } from "@/lib/mock-data";

const sevStyle: Record<Alert["severity"], { bg: string; dot: string; title: string; desc: string }> = {
  error: { bg: "bg-danger-soft/60", dot: "bg-danger", title: "text-danger", desc: "text-danger/80" },
  warning: { bg: "bg-warning-soft/60", dot: "bg-warning", title: "text-warning-foreground", desc: "text-warning-foreground/70" },
  info: { bg: "", dot: "bg-muted-foreground", title: "text-foreground", desc: "text-muted-foreground" },
};

export function AlertsList({ alerts, compact = false }: { alerts: Alert[]; compact?: boolean }) {
  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {alerts.map((a) => {
        const s = sevStyle[a.severity];
        return (
          <div key={a.id} className={cn("flex items-start gap-3 rounded-lg p-3", s.bg)}>
            <div className={cn("mt-1.5 size-2 shrink-0 rounded-full", s.dot)} />
            <div className="min-w-0 flex-1">
              <p className={cn("text-xs font-bold", s.title)}>{a.title}</p>
              <p className={cn("text-[11px]", s.desc)}>{a.description}</p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                {a.time} • {a.ago}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
