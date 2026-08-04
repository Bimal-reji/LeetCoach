/**
 * Options page — configure the backend URL and view device identity.
 * Plain TypeScript (no React) to keep the bundle tiny.
 */
import { DEFAULT_BACKEND_URL, STORAGE_KEYS } from "../shared/constants";

const app = document.getElementById("app")!;

app.innerHTML = `
  <div class="animate-fade-up">
    <h1 class="text-2xl font-extrabold tracking-tight text-white">LeetCoach AI <span class="text-brand-400">Settings</span></h1>
    <p class="mt-1 text-sm text-slate-400">Configure where LeetCoach talks to its AI backend.</p>

    <section class="card mt-6">
      <label class="text-sm font-semibold text-slate-200" for="backend">Backend URL</label>
      <p class="mt-1 text-xs text-slate-500">The FastAPI server. Leave as-is for local development.</p>
      <input id="backend" class="input mt-2" type="url" placeholder="${DEFAULT_BACKEND_URL}" />
      <div class="mt-3 flex items-center gap-2">
        <button id="save" class="btn-primary">Save</button>
        <button id="test" class="btn-ghost">Test connection</button>
        <span id="status" class="text-sm"></span>
      </div>
    </section>

    <section class="card mt-4">
      <label class="text-sm font-semibold text-slate-200">Device identity</label>
      <p class="mt-1 text-xs text-slate-500">Used anonymously to track your progress (auth-free v1).</p>
      <code id="device" class="mt-2 block rounded-lg bg-base-900 px-3 py-2 font-mono text-xs text-emerald-300 break-all"></code>
    </section>
  </div>
`;

const input = document.getElementById("backend") as HTMLInputElement;
const status = document.getElementById("status")!;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const testBtn = document.getElementById("test") as HTMLButtonElement;

function setStatus(text: string, ok = true): void {
  status.textContent = text;
  status.className = `text-sm ${ok ? "text-emerald-400" : "text-rose-400"}`;
}

async function init(): Promise<void> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const settings = (data[STORAGE_KEYS.settings] ?? {}) as { backendUrl?: string };
  input.value = settings.backendUrl ?? DEFAULT_BACKEND_URL;

  const dev = await chrome.storage.local.get(STORAGE_KEYS.deviceId);
  document.getElementById("device")!.textContent = (dev[STORAGE_KEYS.deviceId] as string) ?? "generating…";
}

saveBtn.addEventListener("click", async () => {
  const url = input.value.trim().replace(/\/+$/, "") || DEFAULT_BACKEND_URL;
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: { backendUrl: url } });
  setStatus("Saved ✓", true);
  setTimeout(() => (status.textContent = ""), 2000);
});

testBtn.addEventListener("click", async () => {
  const url = input.value.trim().replace(/\/+$/, "") || DEFAULT_BACKEND_URL;
  setStatus("testing…");
  try {
    const resp = await fetch(`${url}/api/v1/health`);
    const data = (await resp.json()) as { status?: string; ai_provider?: string };
    if (resp.ok) {
      setStatus(`Connected (${data.ai_provider} mode) ✓`, true);
    } else {
      setStatus(`HTTP ${resp.status}`, false);
    }
  } catch {
    setStatus("Cannot reach backend — is it running?", false);
  }
});

void init();
