import type { WorkspaceMode } from "~/composables/useWorkspaceMode";

interface ResolveAiPanelTargetOptions {
  workspaceMode: WorkspaceMode;
  paneId: string;
  ownerFileTargetId: string;
  ownerFileTargetAllowed: boolean;
  globalFileTargetId: string;
}

export function resolveAiPanelTarget(options: ResolveAiPanelTargetOptions) {
  if (options.workspaceMode === "files") return options.globalFileTargetId;
  if (options.ownerFileTargetAllowed && options.ownerFileTargetId) return options.ownerFileTargetId;
  return options.paneId;
}
