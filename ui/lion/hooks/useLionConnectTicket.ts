import { isDesktopRuntime } from "~/utils/runtime";

export async function createLionConnectTicket(baseUrl: string, tokenId = "") {
  const { createKokoTicket } = useWorkspaceConnectors();

  try {
    const result = await createKokoTicket({ baseUrl, tokenId });
    if (result.ticket) return String(result.ticket);
  } catch (error) {
    if (!isDesktopRuntime()) {
      console.warn("[lion] connect ticket unavailable, falling back to cookie authentication", error);
      return "";
    }
    throw error;
  }

  if (isDesktopRuntime()) throw new Error("SecureConnection did not return a remote desktop connect ticket");
  return "";
}
