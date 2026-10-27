import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageTitle, Panel } from "@/components/AppLayout";
import { API_BASE } from "@/lib/api";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { KeyRound, LogOut, Server, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — PrintFlow" }, { name: "description", content: "Configuração da central e acesso administrativo." }] }),
  component: Page,
});

function Page() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const apiUrl = API_BASE;

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 12) {
      toast.error("A nova senha precisa ter pelo menos 12 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("A confirmação não corresponde à nova senha.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(apiUrl + "/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Não foi possível alterar a senha.");
      toast.success(result.message);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await fetch(apiUrl + "/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.reload();
    }
  }

  return (
    <AppLayout breadcrumbs={[{ label: "Configurações" }]}>
      <PageTitle title="Configuração da central" subtitle="Conexão, senha e segurança deste painel." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Central de monitoramento">
          <div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Server className="size-5" /></div><div className="min-w-0"><p className="font-medium">API configurada</p><code className="mt-2 block break-all rounded-md bg-muted px-3 py-2 text-xs">{apiUrl}</code><p className="mt-3 text-sm text-muted-foreground">Em produção, o painel e a API usam o mesmo endereço.</p></div></div>
        </Panel>
        <Panel title="Acesso administrativo">
          <div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success"><ShieldCheck className="size-5" /></div><div><p className="font-medium">Sessão autenticada</p><p className="mt-1 text-sm text-muted-foreground">A sessão é protegida por cookie e expira após 12 horas.</p><button onClick={() => void logout()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"><LogOut className="size-4" />Sair da central</button></div></div>
        </Panel>
        <Panel title="Alterar senha administrativa">
          <form className="space-y-4" onSubmit={(event) => { void changePassword(event); }}>
            <label className="block text-sm font-medium">Senha atual<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required /></label>
            <label className="block text-sm font-medium">Nova senha<input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required /></label>
            <label className="block text-sm font-medium">Confirmar nova senha<input type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required /></label>
            <p className="text-xs text-muted-foreground">Use pelo menos 12 caracteres. A senha é armazenada como hash com salt.</p>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"><KeyRound className="size-4" />{saving ? "Salvando…" : "Atualizar senha"}</button>
          </form>
        </Panel>
        <Panel title="Limites do protótipo">
          <div className="space-y-3 text-sm text-muted-foreground"><p>Os alertas atuais usam offline e toner igual ou abaixo de 15%.</p><p>Relatórios exibem somente trabalhos que o agente recebeu e conseguiu enviar à central.</p><p>Configure HTTPS e uma política de backup antes de usar dados reais em rede externa.</p></div>
        </Panel>
      </div>
    </AppLayout>
  );
}
