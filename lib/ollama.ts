// Real local LLM connector — Ollama running on this machine, no cloud
// key needed. Used for genuine intent classification and natural-
// language answer generation, with the rule-based keyword matchers
// (lib/nlMatch.ts, lib/copilot/intent.ts) kept as the fallback if
// Ollama isn't reachable (it's a local process — it can be off).

const HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

export async function ollamaHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${HOST}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ollamaGenerate(prompt: string, opts: { json?: boolean; timeoutMs?: number } = {}): Promise<string> {
  const res = await fetch(`${HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      format: opts.json ? "json" : undefined,
      options: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  return data.response as string;
}

export async function ollamaGenerateJson<T = any>(prompt: string, timeoutMs?: number): Promise<T> {
  const raw = await ollamaGenerate(prompt, { json: true, timeoutMs });
  return JSON.parse(raw) as T;
}
