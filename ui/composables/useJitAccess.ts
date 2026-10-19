// XPAM self-service just-in-time access (zero standing privilege): the "Access" page and its warnings.
export interface JitAccessAsset {
  id: string;
  name: string;
  address: string;
  type: string;
  category: string;
}

export interface JitAccessPolicy {
  id: string;
  name: string;
  max_hours: number;
  auto_approve: boolean;
  auto_approve_max_hours: number;
  require_reason: boolean;
  warn_minutes?: number;
  privileged?: boolean;
  mode_display?: string;
}

export interface JitGrant {
  id: string;
  name: string;
  org_id: string;
  assets: JitAccessAsset[];
  date_start: string;
  date_expired: string;
  active: boolean;
  seconds_left: number;
  policy: JitAccessPolicy | null;
}

export interface JitPendingRequest {
  id: string;
  title: string;
  serial_num: string;
  assets: string[];
  date_start: string;
  date_expired: string;
  date_created: string;
  reason: string;
}

export interface JitRecentRequest {
  id: string;
  title: string;
  state: string;
  auto: string;
  date_updated: string;
}

export interface JitLiveAccount {
  id: string;
  username: string;
  asset: string;
  asset_id: string;
  mode: string;
  status: string;
  date_expired: string | null;
}

export interface JitAccessOverview {
  grants: JitGrant[];
  pending: JitPendingRequest[];
  recent: JitRecentRequest[];
  accounts: JitLiveAccount[];
  server_time: string;
}

export interface JitRequestableAsset extends JitAccessAsset {
  org_id: string;
  platform: string;
  policy: JitAccessPolicy;
}

export interface JitTicketBrief {
  id: string;
  serial_num: string;
  title: string;
  state: string;
  status: string;
  approved_automatically_by: string;
}

const BASE = "/api/v1/accounts/jit-access/";

export const getJitAccess = () => apiRequest<JitAccessOverview>({ method: "GET", path: BASE });

export const getJitRequestable = (search: string) =>
  apiRequest<JitRequestableAsset[]>({ method: "GET", path: `${BASE}requestable/`, query: search ? { search } : {} });

export const requestJitAccess = (assets: string[], hours: number, reason: string) =>
  apiRequest<JitTicketBrief>({ method: "POST", path: `${BASE}request/`, body: { assets, hours, reason } });

export const extendJitAccess = (id: string, hours: number, reason: string) =>
  apiRequest<JitTicketBrief>({ method: "POST", path: `${BASE}${id}/extend/`, body: { hours, reason } });

export const endJitAccess = (id: string) => apiRequest<{ ok: boolean }>({ method: "POST", path: `${BASE}${id}/end/` });

export const cancelJitRequest = (id: string) =>
  apiRequest<{ ok: boolean }>({ method: "POST", path: `${BASE}${id}/cancel/` });

/** "1 h 05 min" style remaining time. */
export function formatJitTimeLeft(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m > 0) return `${m} min`;
  return `${s % 60} s`;
}
