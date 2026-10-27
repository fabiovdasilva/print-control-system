import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import React, { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { API_BASE } from "../lib/api";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PrintFlow — Monitoramento de Impressoras" },
      {
        name: "description",
        content: "Plataforma de monitoramento de frotas de impressoras por cliente, com agentes locais, alertas em tempo real e relatórios de uso.",
      },
      { property: "og:title", content: "PrintFlow — Monitoramento de Impressoras" },
      { property: "og:description", content: "PrintHub Dashboard provides a centralized interface for monitoring and managing client printer fleets." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "PrintFlow — Monitoramento de Impressoras" },
      { name: "description", content: "PrintHub Dashboard provides a centralized interface for monitoring and managing client printer fleets." },
      { name: "twitter:description", content: "PrintHub Dashboard provides a centralized interface for monitoring and managing client printer fleets." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2f273376-309d-4c1c-a0bf-4372622b34f5/id-preview-5c925a8c--aba1c0e6-47b2-4496-9556-0d9f06cc2510.lovable.app-1782522815433.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2f273376-309d-4c1c-a0bf-4372622b34f5/id-preview-5c925a8c--aba1c0e6-47b2-4496-9556-0d9f06cc2510.lovable.app-1782522815433.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { Toaster } from "sonner";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AdminKeyGate>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </AdminKeyGate>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

function AdminKeyGate({ children }: { children: ReactNode }) {
  const [key, setKey] = React.useState("");
  const [input, setInput] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const saved = window.sessionStorage.getItem("printflow_admin_key");
    if (!saved) {
      setChecking(false);
      return;
    }
    void validateKey(saved, false);
  }, []);

  async function validateKey(candidate: string, showError = true) {
    setChecking(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/admin/health`, { headers: { "X-Admin-Key": candidate } });
      if (!response.ok) throw new Error("Chave inválida ou central indisponível.");
      window.sessionStorage.setItem("printflow_admin_key", candidate);
      setKey(candidate);
      setReady(true);
    } catch (cause) {
      window.sessionStorage.removeItem("printflow_admin_key");
      setReady(false);
      if (showError) setError(cause instanceof Error ? cause.message : "Não foi possível validar a chave.");
    } finally {
      setChecking(false);
    }
  }

  if (ready && key) return <>{children}</>;
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <form
        className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg"
        onSubmit={(event) => { event.preventDefault(); void validateKey(input.trim()); }}
      >
        <div className="mb-5 grid size-11 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">P</div>
        <h1 className="text-xl font-semibold text-foreground">Acesso à central PrintFlow</h1>
        <p className="mt-2 text-sm text-muted-foreground">Informe a chave administrativa exibida no console da central.</p>
        <label htmlFor="admin-key" className="mt-6 block text-sm font-medium text-foreground">Chave administrativa</label>
        <input
          id="admin-key"
          type="password"
          autoComplete="current-password"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          required
        />
        {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
        <button type="submit" disabled={checking} className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {checking ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
