import { cn } from "@/lib/utils";
import type { PrinterStatus } from "@/lib/mock-data";

const styles: Record<PrinterStatus, string> = {
  online: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  error: "bg-danger-soft text-danger",
  offline: "bg-muted text-muted-foreground",
};

const labels: Record<PrinterStatus, string> = {
  online: "Online",
  warning: "Aviso",
  error: "Erro",
  offline: "Offline",
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: PrinterStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        styles[status],
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", {
          "bg-success": status === "online",
          "bg-warning": status === "warning",
          "bg-danger": status === "error",
          "bg-muted-foreground": status === "offline",
        })}
      />
      {label ?? labels[status]}
    </span>
  );
}

export function TonerBar({ value, color = "k" }: { value: number; color?: "c" | "m" | "y" | "k" }) {
  const colorClass = {
    c: "bg-toner-c",
    m: "bg-toner-m",
    y: "bg-toner-y",
    k: "bg-toner-k",
  }[color];
  const lowBg = value < 20 ? "bg-warning" : value < 10 ? "bg-danger" : colorClass;
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full transition-all", lowBg)} style={{ width: `${value}%` }} />
    </div>
  );
}

export function TonerCMYK({
  toner,
}: {
  toner: { c: number; m: number; y: number; k: number };
}) {
  const hasColor = toner.c + toner.m + toner.y > 0;
  if (!hasColor) {
    return <TonerBar value={toner.k} color="k" />;
  }
  return (
    <div className="flex items-center gap-1">
      {(["c", "m", "y", "k"] as const).map((k) => (
        <div
          key={k}
          className="flex w-4 flex-col items-center gap-0.5"
          title={`${k.toUpperCase()}: ${toner[k]}%`}
        >
          <div className="h-4 w-3 overflow-hidden rounded-sm bg-muted">
            <div
              className={cn("h-full w-full origin-bottom", {
                "bg-toner-c": k === "c",
                "bg-toner-m": k === "m",
                "bg-toner-y": k === "y",
                "bg-toner-k": k === "k",
              })}
              style={{ transform: `scaleY(${toner[k] / 100})` }}
            />
          </div>
          <span className="text-[8px] font-mono text-muted-foreground">{toner[k]}</span>
        </div>
      ))}
    </div>
  );
}
