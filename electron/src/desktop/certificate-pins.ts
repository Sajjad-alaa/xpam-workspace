import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// XPAM: trust on first use for the XPAM server's certificate. A certificate that Chromium accepts
// is always fine. A self-signed (or otherwise unverifiable) one is remembered per host the first
// time; later it is accepted only while it stays the same, so a network attacker cannot silently
// swap it. A changed certificate needs the user's explicit confirmation.

type Pins = Record<string, string>;

export class CertificatePins {
  private readonly file: string;
  private pins: Pins = {};

  constructor(userDataDir: string) {
    this.file = path.join(userDataDir, "certificate-pins.json");
    try {
      const data = JSON.parse(readFileSync(this.file, "utf8"));
      if (data && typeof data === "object") this.pins = data;
    } catch {
      this.pins = {};
    }
  }

  get(host: string): string | undefined {
    return this.pins[host.toLowerCase()];
  }

  set(host: string, fingerprint: string) {
    this.pins[host.toLowerCase()] = fingerprint;
    try {
      writeFileSync(this.file, JSON.stringify(this.pins, null, 2), { mode: 0o600 });
    } catch {
      // the pin still applies for this run
    }
  }

  // 0 = accept, -2 = reject, -3 = let Chromium decide; "ask" = the certificate changed
  decide(host: string, errorCode: number, fingerprint: string): 0 | -2 | -3 | "ask" {
    if (errorCode === 0) return -3;
    if (!fingerprint) return -2;
    const pinned = this.get(host);
    if (!pinned) {
      this.set(host, fingerprint);
      return 0;
    }
    return pinned === fingerprint ? 0 : "ask";
  }
}
