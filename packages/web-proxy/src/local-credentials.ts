import { normalizedWebOrigin, validateWebScript, validateWebSelector } from "./credentials";

// Used only in the main process. The shell renderer never receives this object.
export function createLocalCredentialSession(targetUrl: string, value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Tinker sign-in configuration is missing");
  const data = value as Record<string, any>;
  const config = data.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Invalid sign-in configuration");
  const origin = normalizedWebOrigin(targetUrl);
  // Core uses "no" for disabled autofill; retain "none" for legacy launches.
  const mode = config.autofill === "no" ? "none" : config.autofill || "none";
  if (!["basic", "script", "none"].includes(mode)) throw new Error("Unsupported sign-in mode");
  if (mode === "none") return { autofillAvailable: false, origin, mode };
  const steps = mode === "script" ? validateWebScript(config.script, origin) : null;
  const username = data.username ?? "";
  const password = data.password ?? "";
  if (typeof username !== "string" || typeof password !== "string" || username.length > 4096 || password.length > 65536)
    throw new Error("Invalid Tinker credential format");
  if (
    (mode === "basic" || steps?.some((step) => step.value.includes("{SECRET}"))) &&
    (!password || (data.secret_type && data.secret_type !== "password"))
  )
    throw new Error("The sign-in configuration requires a password account");
  const selector = (key: string, required = false) => {
    const value = config[key] ?? "";
    if (required || value) validateWebSelector(value);
    return value;
  };
  const credentialOrigins = steps
    ? [
        ...new Set(
          steps
            .filter((step) => step.command === "type" && /\{USERNAME\}|\{SECRET\}/.test(step.value))
            .map((step) => step.origin)
        )
      ]
    : [origin];
  let credentials = { username, password };
  return {
    autofillAvailable: true,
    origin,
    mode,
    steps,
    credentialOrigins,
    selectors: {
      username: selector("username_selector"),
      password: selector("password_selector", mode === "basic"),
      submit: selector("submit_selector", mode === "basic"),
      success: selector("success_selector"),
      interactive: selector("interactive_selector")
    },
    release() {
      if (!credentials) throw new Error("The credentials were already claimed or the session has ended");
      const released = credentials;
      credentials = null;
      return released;
    },
    dispose() {
      credentials = null;
    }
  };
}
