const JMSErrorStatusCodes: Readonly<Record<number, string>> = {
  1000: "JMSErrNoSession",
  1001: "JMSErrAuthUser",
  1002: "JMSErrBadParams",
  1003: "JMSErrIdleTimeOut",
  1004: "JMSErrPermissionExpired",
  1005: "JMSErrTerminatedByAdmin",
  1006: "JMSErrAPIFailed",
  1007: "JMSErrGatewayFailed",
  1008: "JMSErrGuacamoleServer",
  1009: "JMSErrDisconnected",
  1010: "JMSErrMaxSession",
  1011: "JMSErrRemoveShareUser"
};

export const ErrorStatusCodes: Readonly<Record<number, string>> = {
  256: "GuaErrUnSupport",
  512: "GuaErrServerError",
  513: "GuaErrServerBusy",
  514: "GuaErrUpStreamTimeout",
  515: "GuacamoleErrUpstreamError",
  516: "GuaErrResourceNotFound",
  517: "GuaErrResourceConflict",
  518: "GuaErrResourceClosed",
  519: "GuaErrUpStreamNotFound",
  520: "GuaErrUpStreamUnavailable",
  521: "GuaErrSessionConflict",
  522: "GuacamoleErrIdleSessionTimeLimitExceeded",
  523: "GuacamoleErrForciblyDisconnected",
  768: "JMSErrBadParams",
  769: "GuaErrClientUnauthorized",
  771: "GuacamoleErrInsufficientPrivileges",
  776: "GuaErrClientTimeout",
  781: "GuaErrClientOverrun",
  783: "GuaErrClientBadType",
  797: "GuaErrClientTooMany",
  ...JMSErrorStatusCodes
};

export const APIErrorType: any = {
  "connect API core err": "JMSErrAPIFailed",
  "connect Panda API core err": "JMSErrAPIFailed",
  "unsupported type": "JMSErrBadParams",
  "unsupported protocol": "JMSErrBadParams",
  "permission deny": "JMSErrPermission"
};

export function ConvertAPIError(errMsg: string | any): string {
  if (typeof errMsg !== "string") {
    return errMsg;
  }
  const errArray = errMsg.split(":");
  const errorKey = errArray[0];
  if (errorKey) {
    return APIErrorType[errorKey] || errMsg;
  }
  return errMsg;
}

export const GuacamoleErrMsg: Readonly<Record<string, string>> = {
  "No permission": "JMSErrPermission",
  "Disconnected.": "GuacamoleErrDisconnected",
  "Credentials expired.": "GuacamoleErrCredentialsExpired",
  "Security negotiation failed (wrong security type?)": "GuacamoleErrSecurityNegotiationFailed",
  "Access denied by server (account locked/disabled?)": "GuacamoleErrAccessDenied",
  "Authentication failure (invalid credentials?)": "GuacamoleErrAuthenticationFailure",
  "SSL/TLS connection failed (untrusted/self-signed certificate?)": "GuacamoleErrSSLTLSConnectionFailed",
  "DNS lookup failed (incorrect hostname?)": "GuacamoleErrDNSLookupFailed",
  "Server refused connection (wrong security type?)": "GuacamoleErrServerRefusedConnectionBySecurityType",
  "Connection failed (server unreachable?)": "GuacamoleErrConnectionFailed",
  "Upstream error.": "GuacamoleErrUpstreamError",
  "Forcibly disconnected.": "GuacamoleErrForciblyDisconnected",
  "Logged off.": "GuacamoleErrLoggedOff",
  "Idle session time limit exceeded.": "GuacamoleErrIdleSessionTimeLimitExceeded",
  "Active session time limit exceeded.": "GuacamoleErrActiveSessionTimeLimitExceeded",
  "Disconnected by other connection.": "GuacamoleErrDisconnectedByOtherConnection",
  "Server refused connection.": "GuacamoleErrServerRefusedConnection",
  "Insufficient privileges.": "GuacamoleErrInsufficientPrivileges",
  "Manually disconnected.": "GuacamoleErrManuallyDisconnected",
  "Manually logged off.": "GuacamoleErrManuallyLoggedOff",

  "Unsupported credential type requested.": "GuacamoleErrUnsupportedCredentialTypeRequested",
  "Unable to connect to VNC server.": "GuacamoleErrUnableToConnectToVNCServer"
};

export function ConvertGuacamoleError(errMsg: unknown, code?: number): string {
  const statusCode = typeof code === "number" && Number.isInteger(code) ? code : undefined;
  if (statusCode !== undefined && JMSErrorStatusCodes[statusCode]) {
    return JMSErrorStatusCodes[statusCode];
  }

  const message = typeof errMsg === "string" ? errMsg.trim() : "";
  const messageKey = Object.hasOwn(GuacamoleErrMsg, message) ? GuacamoleErrMsg[message] : undefined;
  // Generic messages must not hide a more useful status code.
  if (messageKey && message !== "Disconnected." && message !== "Upstream error.") {
    return messageKey;
  }
  return (
    (statusCode === undefined ? undefined : ErrorStatusCodes[statusCode]) || messageKey || "GuaErrConnectionClosed"
  );
}

export interface GuacamoleConnectionErrorDetails {
  code?: number;
  message?: string;
  sessionId?: string;
}

/** Core's built-in platform for native RDP RemoteApp assets. */
export const REMOTE_APP_PLATFORM_NAME = "Windows-RemoteApp";

/**
 * A native RemoteApp session that ends normally sooner than this after it connected is reported as
 * "the application could not be started"; a later normal end as "the application was closed".
 * Windows reports no error for a missing/blocked program: it shows no window, and the RDS host logs
 * the session off once no RemoteApp is running (RemoteAppLogoffTimeLimit=0).
 * One fixed threshold; tune it from timings measured on the RDS host.
 */
export const REMOTEAPP_FAILED_START_SECONDS = 15;

// guacd (RDP) uses these when the server ended the session itself (logoff/disconnect), not on failures.
const NORMAL_SESSION_END_MESSAGES = new Set([
  "Disconnected.",
  "Logged off.",
  "Manually disconnected.",
  "Manually logged off."
]);
const GUAC_STATUS_SUCCESS = 0x0000;
// guacd reports a server-side logoff/disconnect as RESOURCE_CLOSED (0x0206) or SESSION_CLOSED (0x020B)
const GUAC_STATUS_RESOURCE_CLOSED = 0x0206;
const GUAC_STATUS_SESSION_CLOSED = 0x020b;

/** True when the session ended without a failure: no error at all, or a guacd logoff/disconnect notice. */
export function isNormalSessionEnd(details?: Pick<GuacamoleConnectionErrorDetails, "code" | "message">): boolean {
  if (!details) return true;
  if (details.code === GUAC_STATUS_SUCCESS) return true;
  if (
    details.code !== undefined &&
    details.code !== GUAC_STATUS_RESOURCE_CLOSED &&
    details.code !== GUAC_STATUS_SESSION_CLOSED
  )
    return false;
  return NORMAL_SESSION_END_MESSAGES.has(details.message?.trim() || "");
}

interface RemoteAppSessionLike {
  remote_app?: unknown;
  platform?: { name?: unknown } | null;
  asset?: { platform?: { name?: unknown } | null } | null;
}

/**
 * Native RDP RemoteApp (Windows-RemoteApp asset). JumpServer applet sessions also carry `remote_app`,
 * but their asset is the applet's target asset, which is never on the Windows-RemoteApp platform.
 */
export function isNativeRemoteAppSession(session?: RemoteAppSessionLike | null): boolean {
  // koko sends the connection platform at the top level; the token's asset has no platform.
  const platformName = session?.platform?.name || session?.asset?.platform?.name;
  return Boolean(session?.remote_app) && platformName === REMOTE_APP_PLATFORM_NAME;
}

export function remoteAppEndMessageKey(connectedAt: number, endedAt: number = Date.now()) {
  return endedAt - connectedAt < REMOTEAPP_FAILED_START_SECONDS * 1000 ? "RemoteAppFailedToStart" : "RemoteAppClosed";
}
