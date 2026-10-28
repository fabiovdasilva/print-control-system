import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout, PageTitle, Panel } from "@/components/AppLayout";
import { API_BASE, adminFetch } from "@/lib/api";
import type { FormEvent } from "react";

export const Route = createFileRoute("/clientes/novo")({
  head: () => ({ meta: [{ title: "Novo cliente — PrintFlow" }] }),
  component: NewClientPage,
});

function NewClientPage() {
  const navigate = useNavigate();

  const submitClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const feedback = form.querySelector<HTMLElement>("[data-create-client-feedback]");
    const data = new FormData(form);
    const pollIntervalValue = String(data.get("pollInterval") ?? "").trim();
    const pollInterval = pollIntervalValue ? Number(pollIntervalValue) : 15;

    if (!Number.isInteger(pollInterval) || pollInterval < 1 || pollInterval > 1440) {
      if (feedback) feedback.textContent = "Informe um intervalo entre 1 e 1440 minutos.";
      return;
    }

    const payload = {
      name: String(data.get("name") ?? "").trim(),
      doc: String(data.get("doc") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
      networkSubnets: String(data.get("networkSubnets") ?? "").trim(),
      snmpCommunity: String(data.get("snmpCommunity") ?? "public").trim() || "public",
      pollInterval,
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Salvando…";
    }
    if (feedback) feedback.textContent = "";

    try {
      const response = await adminFetch(`${API_BASE}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const client = await response.json() as { id: number };
      navigate({ to: "/clientes/$clientId", params: { clientId: String(client.id) } });
    } catch (error) {
      if (feedback) feedback.textContent = error instanceof Error ? error.message : "Falha ao cadastrar cliente.";
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Cadastrar cliente";
      }
    }
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Clientes", to: "/clientes" }, { label: "Novo cliente" }]}>
      <PageTitle title="Cadastrar cliente" subtitle="Depois do cadastro, a central libera um instalador exclusivo para este cliente." />
      <Panel title="Dados do cliente" className="max-w-4xl">
        <form className="grid gap-5" onSubmit={submitClient}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">Nome<input name="name" required className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">CNPJ / código<input name="doc" className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">E-mail<input name="email" type="email" className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Telefone<input name="phone" type="tel" className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Endereço<input name="address" className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Sub-redes para descoberta<input name="networkSubnets" className="min-h-10 border border-input px-3 py-2" /><span className="text-xs font-normal text-muted-foreground">Use CIDR e separe várias redes por vírgula.</span></label>
            <label className="grid gap-1.5 text-sm font-medium">Comunidade SNMP<input name="snmpCommunity" placeholder="public" className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Intervalo de leitura (minutos)<input name="pollInterval" type="number" min={1} max={1440} placeholder="15" className="min-h-10 border border-input px-3 py-2" /></label>
          </div>
          <input type="hidden" name="snmpCommunity" value="public" readOnly />
          <input type="hidden" name="pollInterval" value="15" readOnly />
          <p data-create-client-feedback role="alert" className="min-h-5 text-sm text-danger" />
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Link to="/clientes" className="rounded-lg border border-border px-4 py-2 text-sm font-medium">Cancelar</Link>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Cadastrar cliente</button>
          </div>
        </form>
      </Panel>
    </AppLayout>
  );
}

