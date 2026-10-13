# XPAM WebLite

A standalone Electron browser that XPAM uses to open **Website** assets on a Windows publishing
host. Tinker still starts it as a RemoteApp; the browser reuses `packages/web-proxy` for autofill,
login scripts, the interactive area, the success selector and secure input, the same code the
desktop client uses. The applet manifest lives in core (`apps/terminal/applets/weblite`); this
folder only builds the installer.

Run `weblite.exe` directly, without Tinker's launch pipe, and it opens a lightweight browsing mode:
the address bar accepts HTTP/HTTPS addresses, with back, forward and refresh. That mode reads no
credentials and records nothing. With launch parameters from Tinker the address bar is read-only
and the asset's allowlist and secure-login rules apply.

The applet manifest declares `exec_type: exe` and `stdin: true` and passes generic `AppletArgs`
JSON. WebLite takes the address from `asset.address`, opens it and shows it in the address bar. If
it starts with an editable address bar instead, it fell back to standalone mode: check that
`stdin: true` is in effect and that Tinker supports the JSON launch pipe. On Windows, Electron
replaces `process.stdin` with an empty stream, so WebLite reads the inherited descriptor `0`
directly.

The application language is English (`--lang=en-US`), independent of the host's Windows language.

## Connection path

```text
Core connection token → Tinker claims and consumes the token
                             ↓ generic AppletArgs JSON over stdin
                        WebLite → website asset reachable from the publishing host
                             ↑
                    existing RemoteApp / RDP display and recording
```

WebLite connects directly: it does not talk to SecureConnection, does not record by itself and
does not create a second audit session. The publishing host must reach the asset and any SSO
address used during login.

- **Login configuration.** `asset.spec_info` first, then the platform's protocol settings. Safe
  mode comes from the platform; the anonymous account `@ANON` turns autofill off. Data arrives
  over the pipe, never on the command line or in environment variables. Credentials can be
  claimed once, only on the origin the asset or script names, and are released on close, failure
  or completed login. Each start uses its own temporary profile and in-memory session.
- **Allowlist.** `allowed_urls` is optional. Empty allows every site; otherwise navigation is
  limited to the asset's site and the listed HTTP/HTTPS origins. It covers links, redirects,
  pop-ups and `open` in login scripts, not sub-resources.
- **Certificates.** Self-signed and private-CA certificates are accepted only for hosts named by
  the asset address, the allowlist or the login script, and only inside that session.
- **License.** The allowlist, script mode, success selector and interactive area need a valid
  license; core rejects connections that rely on them without one. Basic autofill does not.

Older `target_url` / `login` JSON input is still accepted for staged upgrades. Old proxy and
recording fields are ignored.

## Build and check

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm weblite:test
pnpm --dir applets/weblite typecheck
pnpm weblite:build
pnpm --dir applets/weblite test:runtime
pnpm --dir electron test:web-proxy:interaction
pnpm weblite:package
```

`test:runtime` starts a real Electron against a local test site (address handling, read-only
address bar, anonymous and no-autofill starts, platform fallback, basic and scripted login, IPC
isolation, window exit, HTTPS with a temporary self-signed certificate; needs `openssl`). Set
`WEBLITE_EXECUTABLE` to a packaged `weblite.exe` to run the same checks against the installer's
contents.

The Windows x64 installer is written to `release/weblite/XPAM-WebLite-<version>-x64.msi`. It is a
per-machine MSI that installs the whole runtime into `C:\Program Files\JumpServer\WebLite\` with a
single `weblite.exe` (no `app-<version>` folder, no launcher). The folder keeps its upstream name
because the applet manifest and Tinker use that path. The UpgradeCode is stable, so it upgrades an
existing deployment; close all WebLite sessions first. No Chrome, ChromeDriver or Python needed.

## Releasing

1. Publish the MSI on the XPAM server under `/download/applets/` (folder
   `<data folder>/web/applets/`), where publishing hosts fetch it.
2. Ship the matching core (applet manifest with `stdin: true`) and a Tinker that supports it.
3. Publish the applet to the host again and test with a new connection.

Not migrated from the old Chrome applet: `select_frame` and logins in a separate pop-up; scripts
that need them fail with a clear message. Direct mode does not tunnel through an asset gateway.
