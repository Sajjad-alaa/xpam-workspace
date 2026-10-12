// XPAM: the About window shows the connected server's product, version and license, like the
// workspace About page, so a new license is reflected the next time About is opened.
export function aboutDetails(settings: Record<string, any> | null, fallbackName: string) {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const licensed = settings?.XPACK_LICENSE_IS_VALID === true;
  const license = settings?.XPACK_LICENSE_INFO || {};
  let version = text(settings?.INTERFACE?.version);
  if (licensed) version = version.replace(/-ce$/i, "");

  let server = "";
  let logo = "";
  try {
    const origin = new URL(text(settings?.__origin));
    server = origin.host;
    const logoPath = text(settings?.INTERFACE?.logo_logout) || text(settings?.INTERFACE?.logo_index);
    // Only same-server logos: the About page must not load arbitrary third-party URLs
    if (logoPath) {
      const url = new URL(logoPath, origin);
      if (url.origin === origin.origin) logo = url.toString();
    }
  } catch {
    // No server connected: show the bundled logo and client details only
  }

  return {
    name: text(settings?.INTERFACE?.login_title) || (licensed ? "XPAM" : fallbackName),
    serverVersion: version,
    edition: settings ? (licensed ? text(license.edition) || "Enterprise" : "Community") : "",
    company: text(license.corporation),
    server,
    logo
  };
}
