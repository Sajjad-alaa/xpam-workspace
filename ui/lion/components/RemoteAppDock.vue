<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

defineProps<{ appName: string; assetName?: string }>();
const emit = defineEmits<{ bringToFront: []; endSession: [] }>();

const COLLAPSE_DELAY_MS = 3000;

const { t } = useI18n();
const expanded = ref(true);
let collapseTimer: ReturnType<typeof setTimeout> | undefined;

function cancelCollapse() {
  clearTimeout(collapseTimer);
  collapseTimer = undefined;
}

// The dock overlays the remote application, so it shrinks to a small handle when not in use.
function scheduleCollapse() {
  cancelCollapse();
  collapseTimer = setTimeout(() => {
    expanded.value = false;
  }, COLLAPSE_DELAY_MS);
}

function expand() {
  cancelCollapse();
  expanded.value = true;
}

function collapse() {
  cancelCollapse();
  expanded.value = false;
}

function handleFocusOut(event: FocusEvent) {
  const dock = event.currentTarget as HTMLElement | null;
  if (!dock?.contains(event.relatedTarget as Node | null)) scheduleCollapse();
}

onMounted(scheduleCollapse);
onBeforeUnmount(cancelCollapse);
</script>

<template>
  <div
    class="absolute bottom-3 left-1/2 z-20 max-w-[calc(100%-2rem)] -translate-x-1/2"
    @pointerenter="expand"
    @pointerleave="scheduleCollapse"
    @focusin="expand"
    @focusout="handleFocusOut"
  >
    <div
      v-if="expanded"
      role="toolbar"
      :aria-label="t('RemoteAppControls')"
      class="flex items-center gap-1 rounded-full bg-[var(--app-surface-overlay)] py-1 pr-1 pl-3 text-sm shadow-[var(--theme-shadow-soft)] ring-1 ring-[var(--app-border)] backdrop-blur-md"
    >
      <UIcon name="i-lucide-app-window" class="size-4 shrink-0 text-muted" />
      <span class="min-w-0 max-w-48 truncate font-medium text-highlighted" :title="assetName || appName">
        {{ appName }}
      </span>
      <span class="mx-1 h-4 w-px shrink-0 bg-[var(--app-border)]" />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-layers"
        class="shrink-0 rounded-full"
        :label="t('RemoteAppBringToFront')"
        @click="emit('bringToFront')"
      />
      <UButton
        size="xs"
        color="error"
        variant="ghost"
        icon="i-lucide-power"
        class="shrink-0 rounded-full"
        :label="t('RemoteAppEndSession')"
        @click="emit('endSession')"
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-chevron-down"
        class="shrink-0 rounded-full"
        :aria-label="t('RemoteAppHideControls')"
        @click="collapse"
      />
    </div>
    <button
      v-else
      type="button"
      :aria-label="t('RemoteAppShowControls')"
      :title="appName"
      class="flex items-center gap-1 rounded-full bg-[var(--app-surface-overlay)] px-3 py-0.5 text-muted opacity-70 shadow-[var(--theme-shadow-soft)] ring-1 ring-[var(--app-border)] backdrop-blur-md transition-opacity hover:text-highlighted hover:opacity-100"
      @click="expand"
    >
      <UIcon name="i-lucide-app-window" class="size-3.5" />
      <UIcon name="i-lucide-chevron-up" class="size-3.5" />
    </button>
  </div>
</template>
