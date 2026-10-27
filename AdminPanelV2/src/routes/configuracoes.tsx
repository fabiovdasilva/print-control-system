import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageTitle, Panel } from "@/components/AppLayout";
import { API_BASE } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Server, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — PrintFlow" }, { name: "description", content: "Configuração da central e acesso administrativo." }] }),
  component: Page,
});

function Page() {
  const [confirmChange, setConfirmChange] = useState(false);
  const apiUrl = API_BASE;
  const configured = typeof window !== "undefined" && Boolean(window.sessionStorage.getItem("printflow_admin_key"));

  function changeKey() {
    window.sessionStorage.removeItem("printflow_admin_key");
    toast.info("Informe a nova chave administrativa.");
    window.location.reload();
  }

  return (
    <AppLayout breadcrumbs={[{ label: "Configurações" }]}>
      <PageTitle title="Configuração da central" subtitle="Estado de conexão e segurança deste painel." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Central de monitoramento">
          <div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Server className="size-5" /></div><div className="min-w-0"><p className="font-medium">API configurada</p><code className="mt-2 block break-all rounded-md bg-muted px-3 py-2 text-xs">{apiUrl}</code><p className="mt-3 text-sm text-muted-foreground">A URL pode ser alterada com <code>VITE_API_BASE</code> no ambiente do painel.</p></div></div>
        </Panel>
        <Panel title="Acesso administrativo">
          <div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success"><ShieldCheck className="size-5" /></div><div><p className="font-medium">{configured ? "Sessão autenticada" : "Sessão sem chave"}</p><p className="mt-1 text-sm text-muted-foreground">A chave fica somente nesta sessão do navegador. A central compara a chave em cada chamada administrativa.</p><button onClick={() => setConfirmChange(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"><KeyRound className="size-4" />Trocar chave</button></div></div>
        </Panel>
        <Panel title="Configuração do servidor">
          <div className="space-y-3 text-sm text-muted-foreground"><p>Defina <code>PRINT_CONTROL_ADMIN_KEY</code> para manter a chave administrativa entre reinicializações.</p><p>Sem essa variável, a central gera uma chave temporária e a mostra no console na inicialização.</p><p>O download de um novo instalador substitui o token do agente daquele cliente; reinstale o arquivo baixado para restabelecer o heartbeat.</p></div>
        </Panel>
        <Panel title="Limites do protótipo">
          <div className="space-y-3 text-sm text-muted-foreground"><p>Os alertas atuais usam offline e toner igual ou abaixo de 15%.</p><p>Relatórios exibem somente trabalhos que o agente recebeu e conseguiu enviar à central.</p><p>Configure HTTPS e uma política de backup antes de usar dados reais em rede externa.</p></div>
        </Panel>
      </div>
      {confirmChange ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmChange(false); }}><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"><h2 className="font-semibold">Trocar chave administrativa?</h2><p className="mt-2 text-sm text-muted-foreground">A sessão atual será encerrada. A próxima tela pedirá a nova chave.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirmChange(false)} className="rounded-lg border border-border px-3 py-2 text-sm">Cancelar</button><button onClick={changeKey} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Encerrar sessão</button></div></div></div> : null}
    </AppLayout>
  );
}
