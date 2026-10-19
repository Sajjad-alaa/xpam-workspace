// XPAM: a just-in-time policy may ask for MFA before its account is used. The connect flow calls
// promptJitMfa() when the server answers "jit_mfa_required"; the modal lives in the default layout.
interface JitMfaState {
  open: boolean;
  resolve: ((ok: boolean) => void) | null;
}

export const useJitMfaState = () => useState<JitMfaState>("xpam-jit-mfa", () => ({ open: false, resolve: null }));

export function promptJitMfa(): Promise<boolean> {
  const state = useJitMfaState();
  state.value.resolve?.(false);
  return new Promise<boolean>((resolve) => {
    state.value = { open: true, resolve };
  });
}

export function finishJitMfa(ok: boolean) {
  const state = useJitMfaState();
  const resolve = state.value.resolve;
  state.value = { open: false, resolve: null };
  resolve?.(ok);
}

export interface MfaBackend {
  name: string;
  display_name: string;
  placeholder: string;
  disabled: boolean;
}

export const getMfaBackends = () =>
  apiRequest<{ confirm_type: string; content: MfaBackend[] }>({
    method: "GET",
    path: "/api/v1/authentication/confirm/",
    query: { confirm_type: "mfa" }
  });

export const confirmMfa = (mfaType: string, code: string) =>
  apiRequest<string>({
    method: "POST",
    path: "/api/v1/authentication/confirm/",
    body: { confirm_type: "mfa", mfa_type: mfaType, secret_key: code }
  });

export const sendMfaCode = (mfaType: string) =>
  apiRequest<unknown>({ method: "POST", path: "/api/v1/authentication/mfa/send-code/", body: { type: mfaType } });
