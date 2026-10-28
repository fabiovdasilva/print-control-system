import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout, PageTitle, Panel } from "@/components/AppLayout";
import { API_BASE, adminFetch } from "@/lib/api";
import { useEffect, useRef, useState, type FormEvent } from "react";

export const Route = createFileRoute("/clientes/novo")({
  head: () => ({ meta: [{ title: "Novo cliente — PrintFlow" }] }),
  component: NewClientPage,
});

function NewClientPage() {
  const navigate = useNavigate();
  const [lookupState, setLookupState] = useState("Digite um CNPJ válido para buscar os dados da empresa.");
  const lookupController = useRef<AbortController | null>(null);
  const lookupTimer = useRef<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => () => {
    if (lookupTimer.current !== undefined) window.clearTimeout(lookupTimer.current);
    lookupController.current?.abort();
  }, []);

  const lookupCnpj = (input: HTMLInputElement) => {
    const digits = input.value.replace(/\D/g, "");
    const form = input.form;
    if (!form) return;
    const feedback = form.querySelector<HTMLElement>("[data-cnpj-feedback]");
    lookupController.current?.abort();
    if (digits.length !== 14) {
      setLookupState("Digite os 14 números do CNPJ para pesquisar.");
      return;
    }

    setLookupState("Buscando dados do CNPJ…");
    lookupTimer.current = window.setTimeout(async () => {
      const controller = new AbortController();
      lookupController.current = controller;
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(response.status === 404 ? "CNPJ não encontrado. Você pode preencher os dados manualmente." : "Não foi possível consultar o CNPJ agora. Tente novamente ou preencha manualmente.");
        const company = await response.json() as {
          razao_social?: string;
          nome_fantasia?: string;
          email?: string;
          ddd_telefone_1?: string;
          logradouro?: string;
          numero?: string;
          complemento?: string;
          bairro?: string;
          municipio?: string;
          uf?: string;
          cep?: string;
          descricao_situacao_cadastral?: string;
        };
        if (input.form !== form || input.value.replace(/\D/g, "") !== digits) return;
        const fill = (name: string, value: string) => {
          const field = form.elements.namedItem(name);
          if (field instanceof HTMLInputElement && value && !field.value.trim()) {
            field.value = value;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
          }
        };
        fill("name", company.nome_fantasia || company.razao_social || "");
        fill("email", company.email || "");
        fill("phone", company.ddd_telefone_1 || "");
        const address = [
          [company.logradouro, company.numero].filter(Boolean).join(", "),
          company.complemento,
          company.bairro,
          [company.municipio, company.uf].filter(Boolean).join("/"),
          company.cep ? `CEP ${company.cep}` : "",
        ].filter(Boolean).join(" — ");
        fill("address", address);
        setLookupState(company.descricao_situacao_cadastral
          ? `Dados encontrados. Situação cadastral: ${company.descricao_situacao_cadastral}. Confira e complete antes de salvar.`
          : "Dados encontrados. Confira e complete antes de salvar.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLookupState(error instanceof Error ? error.message : "Falha ao consultar CNPJ.");
      }
    }, 350);
  };

  const submitClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const pollIntervalValue = String(data.get("pollInterval") ?? "").trim();
    const pollInterval = pollIntervalValue ? Number(pollIntervalValue) : 15;

    if (!Number.isInteger(pollInterval) || pollInterval < 1 || pollInterval > 1440) {
      setSubmitError("Informe um intervalo entre 1 e 1440 minutos.");
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

    setSubmitError("");
    setSaving(true);

    try {
      const response = await adminFetch(`${API_BASE}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const client = await response.json() as { id: number };
      navigate({ to: "/clientes/$clientId", params: { clientId: String(client.id) } });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Falha ao cadastrar cliente.");
      setSaving(false);
    }
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Clientes", to: "/clientes" }, { label: "Novo cliente" }]} loadClientContext={false}>
      <PageTitle title="Cadastrar cliente" subtitle="Depois do cadastro, a central libera um instalador exclusivo para este cliente." />
      <Panel title="Dados do cliente" className="max-w-4xl">
        <form className="grid gap-5" onSubmit={submitClient}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">Nome<input name="name" required className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">CNPJ<input name="doc" inputMode="numeric" autoComplete="off" onChange={(event) => lookupCnpj(event.currentTarget)} className="min-h-10 border border-input px-3 py-2" /><span data-cnpj-feedback aria-live="polite" className="text-xs font-normal text-muted-foreground">{lookupState}</span></label>
            <label className="grid gap-1.5 text-sm font-medium">E-mail<input name="email" type="email" className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Telefone<input name="phone" type="tel" className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Endereço<input name="address" className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Sub-redes para descoberta<input name="networkSubnets" className="min-h-10 border border-input px-3 py-2" /><span className="text-xs font-normal text-muted-foreground">Use CIDR e separe várias redes por vírgula.</span></label>
            <label className="grid gap-1.5 text-sm font-medium">Comunidade SNMP<input name="snmpCommunity" placeholder="public" defaultValue="public" className="min-h-10 border border-input px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Intervalo de leitura (minutos)<input name="pollInterval" type="number" min={1} max={1440} placeholder="15" defaultValue="15" className="min-h-10 border border-input px-3 py-2" /></label>
          </div>
          <p role="alert" className="min-h-5 text-sm text-danger">{submitError}</p>
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Link to="/clientes" className="rounded-lg border border-border px-4 py-2 text-sm font-medium">Cancelar</Link>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? "Salvando…" : "Cadastrar cliente"}</button>
          </div>
        </form>
      </Panel>
    </AppLayout>
  );
}

