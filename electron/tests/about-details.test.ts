import assert from "node:assert/strict";
import test from "node:test";
import { aboutDetails } from "../src/desktop/about.ts";

test("About shows the server product, version and license company", () => {
  const details = aboutDetails(
    {
      __origin: "https://pam.example:8443",
      XPACK_LICENSE_IS_VALID: true,
      XPACK_LICENSE_INFO: { corporation: " Acme Corp ", edition: "Enterprise (50 users)" },
      INTERFACE: { login_title: "XPAM", version: "v5.0.0-ce", logo_logout: "/static/img/interface/logo.png" }
    },
    "JumpServer"
  );
  assert.deepEqual(details, {
    name: "XPAM",
    serverVersion: "v5.0.0",
    edition: "Enterprise (50 users)",
    company: "Acme Corp",
    server: "pam.example:8443",
    logo: "https://pam.example:8443/static/img/interface/logo.png"
  });
});

test("a changed license is reflected on the next call", () => {
  const base = { __origin: "https://pam.example", INTERFACE: { version: "v5.0.0-ce" } };
  assert.equal(aboutDetails({ ...base, XPACK_LICENSE_IS_VALID: false }, "XPAM").edition, "Community");
  const licensed = aboutDetails(
    { ...base, XPACK_LICENSE_IS_VALID: true, XPACK_LICENSE_INFO: { corporation: "New Owner Ltd" } },
    "XPAM"
  );
  assert.equal(licensed.company, "New Owner Ltd");
  assert.equal(licensed.edition, "Enterprise");
});

test("offline or foreign logo values fall back safely", () => {
  assert.deepEqual(aboutDetails(null, "XPAM"), {
    name: "XPAM", serverVersion: "", edition: "", company: "", server: "", logo: ""
  });
  const foreign = aboutDetails(
    { __origin: "https://pam.example", INTERFACE: { logo_index: "https://evil.example/x.png" } },
    "XPAM"
  );
  assert.equal(foreign.logo, "");
});
