// Dormant Anaplan REST API connector (model/module discovery). Inactive
// unless ANAPLAN_API_TOKEN + ANAPLAN_WORKSPACE_ID are set — nothing runs
// unless anaplanConfigured() is true and something calls
// discoverAnaplanModels()/discoverAnaplanModules() explicitly. Real
// calls against Anaplan's actual public REST API base URL and response
// shape (api.anaplan.com/2/0/...), never exercised against a live
// Anaplan tenant in this project (no Anaplan account available) —
// same dormant-but-real pattern as lib/snowflake.ts and lib/sapOData.ts.

const API_BASE = "https://api.anaplan.com/2/0";

function requireEnv() {
  const required = ["ANAPLAN_API_TOKEN", "ANAPLAN_WORKSPACE_ID"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing Anaplan environment variables: ${missing.join(", ")}`);
  return { token: process.env.ANAPLAN_API_TOKEN!, workspaceId: process.env.ANAPLAN_WORKSPACE_ID! };
}

export function anaplanConfigured() {
  return Boolean(process.env.ANAPLAN_API_TOKEN && process.env.ANAPLAN_WORKSPACE_ID);
}

function authHeaders(token: string) {
  return { Authorization: `AnaplanAuthToken ${token}`, Accept: "application/json" };
}

export async function anaplanHealthy(): Promise<boolean> {
  if (!anaplanConfigured()) return false;
  try {
    const { token, workspaceId } = requireEnv();
    const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/models`, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type AnaplanModel = { id: string; name: string; activeState: string };
export type AnaplanModule = { id: string; name: string };

export async function discoverAnaplanModels(): Promise<AnaplanModel[]> {
  const { token, workspaceId } = requireEnv();
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/models`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Anaplan models request failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return (json.models || []).map((m: any) => ({ id: m.id, name: m.name, activeState: m.activeState }));
}

export async function discoverAnaplanModules(modelId: string): Promise<AnaplanModule[]> {
  const { token } = requireEnv();
  const res = await fetch(`${API_BASE}/models/${modelId}/modules`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Anaplan modules request failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return (json.modules || []).map((m: any) => ({ id: m.id, name: m.name }));
}
