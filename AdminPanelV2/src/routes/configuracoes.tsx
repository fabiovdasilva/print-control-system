import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageTitle, Panel } from "@/components/AppLayout";
import { Save } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — PrintFlow" },
      { name: "description", content: "Configurações gerais da plataforma." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppLayout breadcrumbs={[{ label: "Configurações" }]}>
      <PageTitle title="Configurações" subtitle="Preferências globais da plataforma." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Organização">
          <div className="space-y-4">
            <Field label="Nome da operação" value="PrintFlow Operação Central" />
            <Field label="Fuso horário" value="America/Sao_Paulo" />
            <Field label="Email do administrador" value="admin@printflow.com.br" />
          </div>
        </Panel>

        <Panel title="Políticas de Alerta">
          <div className="space-y-4">
            <Field label="Toner crítico (%)" value="10" />
            <Field label="Toner aviso (%)" value="20" />
            <Field label="Timeout offline (min)" value="5" />
          </div>
        </Panel>

        <Panel title="Notificações">
          <div className="space-y-3 text-sm">
            <Toggle label="Email em alertas críticos" enabled />
            <Toggle label="Webhook para integração externa" enabled />
            <Toggle label="Resumo diário às 08:00" enabled={false} />
            <Toggle label="Notificar agentes offline" enabled />
          </div>
        </Panel>

        <Panel title="API & Integrações">
          <div className="space-y-4">
            <Field label="API Key" value="pf_live_••••••••••a91" />
            <Field label="Webhook URL" value="https://example.com/hooks/printflow" />
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
              Regerar chave
            </button>
            <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
              Testar webhook
            </button>
          </div>
        </Panel>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Save className="size-4" /> Salvar tudo
        </button>
      </div>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        defaultValue={value}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function Toggle({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-card px-4 py-3">
      <span>{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          enabled ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  );
}
