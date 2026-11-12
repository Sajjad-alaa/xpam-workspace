import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { CertificatePins } from "../src/desktop/certificate-pins.ts";

test("a certificate Chromium accepts is left to Chromium", () => {
  const pins = new CertificatePins(mkdtempSync(path.join(tmpdir(), "pins-")));
  assert.equal(pins.decide("xpam.example", 0, "AA"), -3);
});

test("an unverifiable certificate is never trusted silently the first time", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pins-"));
  const pins = new CertificatePins(dir);
  assert.equal(pins.decide("xpam.example", -202, "AA"), "first");
  assert.equal(pins.get("xpam.example"), undefined);
  pins.set("xpam.example", "AA"); // (the user confirmed it)
  assert.equal(pins.decide("xpam.example", -202, "AA"), 0);
  assert.equal(new CertificatePins(dir).decide("XPAM.example", -202, "AA"), 0);
  assert.equal(pins.decide("xpam.example", -202, "BB"), "ask");
  assert.equal(pins.decide("xpam.example", -202, ""), -2);
});
