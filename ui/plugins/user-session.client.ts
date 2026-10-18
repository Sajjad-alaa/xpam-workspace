import { getWebApiHeaders, getWebApiMutationHeaders, isDesktopRuntime } from "~/utils/runtime";

// XPAM: tell the server that this page is open, as the admin console does. When sessions end with the
// browser, closing the console tab (or leaving it for the workspace) would otherwise sign out a user
// who still has the workspace open.
export default defineNuxtPlugin(() => {
  if (isDesktopRuntime()) return;
  const url = "/api/v1/authentication/user-session/";
  void fetch(url, { method: "GET", credentials: "same-origin", headers: getWebApiHeaders() }).catch(() => {});

  let closing = false;
  window.addEventListener("beforeunload", () => {
    if (closing) return;
    closing = true;
    void fetch(url, {
      method: "DELETE",
      credentials: "same-origin",
      keepalive: true,
      headers: getWebApiMutationHeaders()
    }).catch(() => {});
  });
});
