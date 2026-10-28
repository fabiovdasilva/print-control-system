import "./bootstrap.css";

const API_BASE = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE.replace(/\/$/, "")
  : `${window.location.origin}/api`;

const root = document.getElementById("root");
const form = document.getElementById("login-form") as HTMLFormElement | null;
const password = document.getElementById("admin-password") as HTMLInputElement | null;
const submit = document.getElementById("login-submit") as HTMLButtonElement | null;
const errorMessage = document.getElementById("login-error");
const toggle = document.getElementById("toggle-password") as HTMLButtonElement | null;

if (!root || !form || !password || !submit || !errorMessage || !toggle) {
  throw new Error("PrintFlow login elements are missing.");
}

let appStarted = false;

function showError(message: string) {
  errorMessage!.textContent = message;
  errorMessage!.hidden = false;
}

async function startApplication() {
  if (appStarted) return;
  appStarted = true;
  document.title = "PrintFlow — Carregando painel";
  root!.innerHTML = '<main class="login-screen"><p class="loading-message">Carregando o painel…</p></main>';
  try {
    await import("./spa.tsx");
  } catch {
    appStarted = false;
    root!.innerHTML = '<main class="login-screen"><section class="login-card"><h1>Não foi possível abrir o painel</h1><p class="intro">Atualize a página e tente novamente.</p><button id="retry-app" class="submit-button" type="button">Tentar novamente</button></section></main>';
    document.getElementById("retry-app")?.addEventListener("click", () => window.location.reload());
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submit!.disabled) return;

  submit!.disabled = true;
  submit!.textContent = "Entrando…";
  errorMessage!.hidden = true;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password!.value }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível entrar.");
    password!.value = "";
    await startApplication();
  } catch (error) {
    showError(error instanceof Error ? error.message : "Não foi possível conectar à central.");
    submit!.disabled = false;
    submit!.textContent = "Entrar";
    password!.focus();
  }
});

toggle.addEventListener("click", () => {
  const visible = password!.type === "password";
  password!.type = visible ? "text" : "password";
  toggle!.textContent = visible ? "Ocultar" : "Mostrar";
  toggle!.setAttribute("aria-label", visible ? "Ocultar senha" : "Mostrar senha");
  toggle!.setAttribute("aria-pressed", String(visible));
  password!.focus();
});

fetch(`${API_BASE}/auth/session`, { credentials: "include", cache: "no-store" })
  .then((response) => response.json())
  .then((result) => {
    if (result.authenticated) void startApplication();
  })
  .catch(() => showError("Não foi possível conectar à central. Confira a rede e tente novamente."));
