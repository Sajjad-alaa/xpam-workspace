import { describe, expect, it } from "vitest";
import {
  ConvertGuacamoleError,
  isNativeRemoteAppSession,
  isNormalSessionEnd,
  REMOTEAPP_FAILED_START_SECONDS,
  remoteAppEndMessageKey
} from "~/lion/utils/status";

describe("lion RemoteApp session status", () => {
  it("tells native RemoteApp apart from applets and desktops", () => {
    const remoteApp = { remote_app: { id: "a", name: "notepad" }, asset: { platform: { name: "Windows-RemoteApp" } } };
    const applet = { remote_app: { id: "b", name: "chrome" }, asset: { platform: { name: "Website" } } };
    const desktop = { remote_app: null, asset: { platform: { name: "Windows-RemoteApp" } } };
    expect(isNativeRemoteAppSession(remoteApp)).toBe(true);
    expect(isNativeRemoteAppSession(applet)).toBe(false);
    expect(isNativeRemoteAppSession(desktop)).toBe(false);
    expect(isNativeRemoteAppSession({})).toBe(false);
    // Real koko session shape: platform at the top level, asset without platform
    const kokoRemoteApp = { remote_app: { id: "a", name: "qgis-ltr-bin" }, platform: { name: "Windows-RemoteApp" }, asset: { name: "windows 1" } };
    const kokoApplet = { remote_app: { id: "b", name: "chrome" }, platform: { name: "Website" }, asset: { name: "site" } };
    expect(isNativeRemoteAppSession(kokoRemoteApp)).toBe(true);
    expect(isNativeRemoteAppSession(kokoApplet)).toBe(false);
  });

  it("treats only logoff/disconnect notices as a normal end", () => {
    expect(isNormalSessionEnd()).toBe(true);
    expect(isNormalSessionEnd({ code: 0, message: "Disconnected." })).toBe(true);
    expect(isNormalSessionEnd({ code: 518, message: "Logged off." })).toBe(true);
    expect(isNormalSessionEnd({ code: 518, message: "Forcibly disconnected." })).toBe(false);
    expect(isNormalSessionEnd({ code: 769, message: "Authentication failure (invalid credentials?)" })).toBe(false);
    expect(isNormalSessionEnd({ code: 1005, message: "admin" })).toBe(false);
  });

  it("splits failed starts from closed applications by the threshold", () => {
    const connectedAt = 1_000_000;
    const threshold = REMOTEAPP_FAILED_START_SECONDS * 1000;
    expect(remoteAppEndMessageKey(connectedAt, connectedAt + threshold - 1)).toBe("RemoteAppFailedToStart");
    expect(remoteAppEndMessageKey(connectedAt, connectedAt + threshold)).toBe("RemoteAppClosed");
  });

  it("maps guacd authentication and security failures to their messages", () => {
    expect(ConvertGuacamoleError("Authentication failure (invalid credentials?)", 769)).toBe(
      "GuacamoleErrAuthenticationFailure"
    );
    expect(ConvertGuacamoleError("Security negotiation failed (wrong security type?)", 769)).toBe(
      "GuacamoleErrSecurityNegotiationFailed"
    );
    expect(ConvertGuacamoleError("Server refused connection (wrong security type?)", 519)).toBe(
      "GuacamoleErrServerRefusedConnectionBySecurityType"
    );
  });
});
