<script setup lang="ts">
import { getPublicSettings } from "~/composables/useApiRequest";
import { useUserInfoStore } from "~/store/modules/userInfo";
import { isDefaultInterfaceLogo } from "~/utils/interfaceLogo";

const userInfo = useUserInfoStore();
const customLogo = ref("");
watch(
  () => userInfo.currentSite,
  async (site, _previous, onCleanup) => {
    let active = true;
    onCleanup(() => {
      active = false;
    });
    customLogo.value = "";
    if (isDesktopRuntime() && !site) return;
    try {
      const settings = await getPublicSettings();
      const logo = settings.INTERFACE?.logo_logout?.trim();
      if (!active || !logo || isDefaultInterfaceLogo(logo)) return;
      if (isDesktopRuntime()) {
        const siteUrl = new URL(site);
        customLogo.value = new URL(withWebSitePrefix(logo, siteUrl.pathname), siteUrl.origin).href;
      } else {
        customLogo.value = withWebSitePrefix(logo);
      }
    } catch {
      // Keep local branding when the site settings are unavailable.
    }
  },
  { immediate: true }
);

// Shared across header remounts, but reset when the app reloads.
const introPlayed = useState("brand-logo-intro-played", () => false);
const animate = !introPlayed.value;
introPlayed.value = true;
</script>

<template>
  <img v-if="customLogo" :src="customLogo" alt="XPAM" class="object-contain" @error="customLogo = ''" />
  <svg
    v-else
    class="brand-logo"
    :class="{ 'is-animating': animate }"
    viewBox="40 40 432 432"
    shape-rendering="geometricPrecision"
    fill="currentColor"
    role="img"
    aria-label="XPAM"
    focusable="false"
  >
    <!-- XPAM mark: vault ring and bolts, the X (wheel spokes), hub with keyhole. -->
    <defs>
      <mask id="xpam-brand-hub">
        <rect x="0" y="0" width="512" height="512" fill="#fff" />
        <circle cx="256" cy="256" r="66" fill="#000" />
      </mask>
    </defs>
    <g class="logo-symbol-layer">
      <circle cx="256" cy="256" r="168" fill="none" stroke="currentColor" stroke-width="14" stroke-opacity=".6" />
      <rect x="243" y="50" width="26" height="40" rx="11" />
      <rect x="243" y="422" width="26" height="40" rx="11" />
      <rect x="50" y="243" width="40" height="26" rx="11" />
      <rect x="422" y="243" width="40" height="26" rx="11" />
    </g>
    <g class="logo-symbol-layer" mask="url(#xpam-brand-hub)" fill="none" stroke="currentColor" stroke-width="68" stroke-linecap="round">
      <line x1="146" y1="146" x2="366" y2="366" />
      <line x1="366" y1="146" x2="146" y2="366" />
    </g>
    <g class="logo-symbol-layer">
      <circle cx="256" cy="256" r="52" fill="none" stroke="currentColor" stroke-width="9" />
      <circle cx="256" cy="242" r="18" />
      <path d="M246 250h20l8 42h-36z" />
    </g>
  </svg>
</template>

<style scoped>
.brand-logo {
  display: block;
  color: var(--ui-primary);
}

.is-animating .logo-symbol-layer {
  animation: logo-layer-enter 480ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.is-animating .logo-symbol-layer:nth-of-type(2) {
  animation-delay: 100ms;
}

.is-animating .logo-symbol-layer:nth-of-type(3) {
  animation-delay: 200ms;
}

@keyframes logo-layer-enter {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-animating .logo-symbol-layer {
    animation: none;
  }
}
</style>
