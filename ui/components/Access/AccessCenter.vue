<script setup lang="ts">
// XPAM zero standing privilege: the user's time-boxed access, requests and extensions in one place.
import type { AssetItem } from "~/types";
import type { JitAccessOverview, JitGrant, JitRequestableAsset } from "~/composables/useJitAccess";

const { t } = useI18n();
const toast = useToast();
const localePath = useLocalePath();
const { openSetupSession } = useWorkspaceTabs();

const overview = ref<JitAccessOverview | null>(null);
const loading = ref(false);
const skew = ref(0);
const now = ref(Date.now());

const search = ref("");
const searching = ref(false);
const requestable = ref<JitRequestableAsset[]>([]);
const selected = ref<string[]>([]);
const hours = ref(1);
const reason = ref("");
const submitting = ref(false);
const confirmEnd = ref("");
const busy = ref("");

const PRESETS = [1, 2, 4, 8];
const categoryIcon = (category: string) =>
  category === "database" ? "i-lucide-database" : category === "device" ? "i-lucide-router" : "i-lucide-server";

const errorText = (e: any) => e?.data?.detail || e?.message || String(e);

async function load() {
  loading.value = true;
  try {
    const data = await getJitAccess();
    const before = (overview.value?.grants || []).map((g) => `${g.id}:${g.date_expired}`).join();
    const after = data.grants.map((g) => `${g.id}:${g.date_expired}`).join();
    if (overview.value && before !== after) useEventBus().emit("accessChanged", undefined);
    overview.value = data;
    skew.value = Date.parse(data.server_time) - Date.now();
  } catch (e) {
    toast.add({ title: t("Access.LoadFailed"), description: errorText(e), color: "error" });
  } finally {
    loading.value = false;
  }
}

async function find() {
  searching.value = true;
  try {
    requestable.value = await getJitRequestable(search.value.trim());
  } catch (e) {
    requestable.value = [];
    toast.add({ title: t("Access.LoadFailed"), description: errorText(e), color: "error" });
  } finally {
    searching.value = false;
  }
}

const findDebounced = useDebounceFn(find, 300);
watch(search, () => findDebounced());

const secondsLeft = (grant: JitGrant) =>
  Math.max(0, (Date.parse(grant.date_expired) - (now.value + skew.value)) / 1000);
const progress = (grant: JitGrant) => {
  const total = Date.parse(grant.date_expired) - Date.parse(grant.date_start);
  return total > 0 ? Math.min(100, Math.max(0, (secondsLeft(grant) * 1000 * 100) / total)) : 0;
};
const warnSoon = (grant: JitGrant) => secondsLeft(grant) <= (grant.policy?.warn_minutes || 15) * 60;

const selectedAssets = computed(() => requestable.value.filter((a) => selected.value.includes(a.id)));
const maxHours = computed(() =>
  selectedAssets.value.length ? Math.min(...selectedAssets.value.map((a) => a.policy.max_hours)) : 8
);
const presets = computed(() => PRESETS.filter((h) => h <= maxHours.value));
const reasonRequired = computed(() => selectedAssets.value.some((a) => a.policy.require_reason));
const instant = computed(
  () =>
    selectedAssets.value.length > 0 &&
    selectedAssets.value.every((a) => a.policy.auto_approve && hours.value <= a.policy.auto_approve_max_hours)
);
const canSubmit = computed(
  () =>
    selectedAssets.value.length > 0 &&
    hours.value > 0 &&
    hours.value <= maxHours.value &&
    (!reasonRequired.value || reason.value.trim().length > 0)
);

watch(maxHours, (max) => {
  if (hours.value > max) hours.value = max;
});

function toggle(id: string) {
  const asset = requestable.value.find((a) => a.id === id);
  const first = selectedAssets.value[0];
  if (!selected.value.includes(id) && first && asset && first.org_id !== asset.org_id) {
    toast.add({ title: t("Access.OneOrg"), color: "warning" });
    return;
  }
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id];
}

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    const ticket = await requestJitAccess(selected.value, hours.value, reason.value.trim());
    if (ticket.state === "approved") {
      toast.add({
        title: t("Access.ApprovedNow"),
        description: t("Access.ApprovedNowHelp", { policy: ticket.approved_automatically_by }),
        color: "success"
      });
    } else {
      toast.add({ title: t("Access.Sent"), description: t("Access.SentHelp"), color: "info" });
    }
    selected.value = [];
    reason.value = "";
    await load();
  } catch (e) {
    toast.add({ title: t("Access.RequestFailed"), description: errorText(e), color: "error" });
  } finally {
    submitting.value = false;
  }
}

async function extend(grant: JitGrant, h: number) {
  busy.value = grant.id;
  try {
    const ticket = await extendJitAccess(grant.id, h, "");
    toast.add({
      title: ticket.state === "approved" ? t("Access.Extended", { h }) : t("Access.ExtendSent"),
      color: ticket.state === "approved" ? "success" : "info"
    });
    await load();
  } catch (e) {
    toast.add({ title: t("Access.RequestFailed"), description: errorText(e), color: "error" });
  } finally {
    busy.value = "";
  }
}

async function endNow(grant: JitGrant) {
  if (confirmEnd.value !== grant.id) {
    confirmEnd.value = grant.id;
    setTimeout(() => {
      if (confirmEnd.value === grant.id) confirmEnd.value = "";
    }, 4000);
    return;
  }
  confirmEnd.value = "";
  busy.value = grant.id;
  try {
    await endJitAccess(grant.id);
    toast.add({ title: t("Access.Ended"), color: "success" });
    await load();
  } catch (e) {
    toast.add({ title: t("Access.RequestFailed"), description: errorText(e), color: "error" });
  } finally {
    busy.value = "";
  }
}

async function cancel(id: string) {
  busy.value = id;
  try {
    await cancelJitRequest(id);
    await load();
  } catch (e) {
    toast.add({ title: t("Access.RequestFailed"), description: errorText(e), color: "error" });
  } finally {
    busy.value = "";
  }
}

async function connect(grant: JitGrant, asset: JitGrant["assets"][number]) {
  const item: AssetItem = {
    id: asset.id,
    name: asset.name,
    address: asset.address,
    org_id: grant.org_id,
    platform: asset.type,
    zone: "",
    isActive: true,
    category: asset.category,
    type: asset.type
  };
  openSetupSession(item, { newTab: true });
  await navigateTo(localePath({ path: "/" }));
}

const extendItems = (grant: JitGrant) =>
  [1, 2, 4].map((h) => ({ label: t("Access.ExtendBy", { h }), onSelect: () => extend(grant, h) }));
const connectItems = (grant: JitGrant) =>
  grant.assets.map((a) => ({ label: a.name, icon: categoryIcon(a.category), onSelect: () => connect(grant, a) }));

const formatTime = (value: string) => (value ? new Date(value).toLocaleString() : "");

useIntervalFn(() => (now.value = Date.now()), 1000);
useIntervalFn(() => void load(), 60000);
onMounted(() => {
  void load();
  void find();
});
</script>

<template>
  <div class="h-full min-h-0 overflow-auto bg-[var(--app-surface-panel)] text-[var(--app-fg)]">
    <div class="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:p-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold">{{ t("Access.Title") }}</h1>
          <p class="text-sm text-[var(--app-text-muted)]">{{ t("Access.Subtitle") }}</p>
        </div>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="load"
        >
          {{ t("Common.Refresh") }}
        </UButton>
      </div>

      <div class="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <!-- my access -->
        <section class="flex flex-col gap-3">
          <h2 class="text-sm font-semibold">{{ t("Access.MyAccess") }}</h2>
          <div
            v-if="overview && !overview.grants.length"
            class="rounded-[var(--app-radius)] border border-dashed border-[var(--app-border)] p-6 text-center text-sm text-[var(--app-text-muted)]"
          >
            {{ t("Access.NoAccess") }}
          </div>
          <div
            v-for="grant of overview?.grants || []"
            :key="grant.id"
            class="flex flex-col gap-3 rounded-[var(--app-radius)] border border-[var(--app-border)] bg-[var(--app-card-bg-soft)] p-4"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-for="a of grant.assets.slice(0, 6)"
                :key="a.id"
                class="inline-flex items-center gap-1 rounded-md bg-[var(--app-hover-soft)] px-2 py-0.5 text-sm"
              >
                <UIcon :name="categoryIcon(a.category)" class="size-3.5" />
                {{ a.name }}
              </span>
              <span v-if="grant.assets.length > 6" class="text-xs text-[var(--app-text-muted)]">
                +{{ grant.assets.length - 6 }}
              </span>
              <UBadge v-if="!grant.active" color="neutral" variant="subtle" size="sm">
                {{ t("Access.StartsAt", { time: formatTime(grant.date_start) }) }}
              </UBadge>
            </div>
            <div class="flex items-baseline justify-between gap-2">
              <div class="text-2xl font-semibold" :class="warnSoon(grant) ? 'text-[var(--ui-warning)]' : ''">
                {{ formatJitTimeLeft(secondsLeft(grant)) }}
                <span class="text-sm font-normal text-[var(--app-text-muted)]">{{ t("Access.Left") }}</span>
              </div>
              <div class="text-xs text-[var(--app-text-muted)]">
                {{ t("Access.EndsAt", { time: formatTime(grant.date_expired) }) }}
              </div>
            </div>
            <UProgress :model-value="progress(grant)" size="sm" :color="warnSoon(grant) ? 'warning' : 'primary'" />
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                v-if="grant.assets.length === 1"
                size="sm"
                icon="i-lucide-plug-zap"
                :disabled="!grant.active"
                @click="connect(grant, grant.assets[0]!)"
              >
                {{ t("Access.Connect") }}
              </UButton>
              <UDropdownMenu v-else :items="connectItems(grant)">
                <UButton
                  size="sm"
                  icon="i-lucide-plug-zap"
                  trailing-icon="i-lucide-chevron-down"
                  :disabled="!grant.active"
                >
                  {{ t("Access.Connect") }}
                </UButton>
              </UDropdownMenu>
              <UDropdownMenu :items="extendItems(grant)">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-clock-plus"
                  trailing-icon="i-lucide-chevron-down"
                  :loading="busy === grant.id"
                >
                  {{ t("Access.Extend") }}
                </UButton>
              </UDropdownMenu>
              <UButton
                size="sm"
                :color="confirmEnd === grant.id ? 'error' : 'neutral'"
                :variant="confirmEnd === grant.id ? 'solid' : 'ghost'"
                icon="i-lucide-power"
                @click="endNow(grant)"
              >
                {{ confirmEnd === grant.id ? t("Access.EndConfirm") : t("Access.EndNow") }}
              </UButton>
              <span v-if="grant.policy" class="ml-auto text-xs text-[var(--app-text-muted)]">
                {{ grant.policy.name }}
              </span>
            </div>
          </div>

          <div v-if="overview?.accounts.length" class="flex flex-col gap-1">
            <h3 class="text-xs font-semibold uppercase text-[var(--app-text-muted)]">{{ t("Access.LiveAccounts") }}</h3>
            <div
              v-for="acc of overview.accounts"
              :key="acc.id"
              class="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-[var(--app-hover-soft)]"
            >
              <span>
                <span class="font-mono">{{ acc.username }}</span>
                @ {{ acc.asset }}
              </span>
              <UBadge size="sm" variant="subtle" :color="acc.status === 'ready' ? 'success' : 'neutral'">
                {{ t(`Access.Status.${acc.status}`) }}
              </UBadge>
            </div>
          </div>
        </section>

        <!-- request access -->
        <section class="flex flex-col gap-3">
          <h2 class="text-sm font-semibold">{{ t("Access.Request") }}</h2>
          <div class="flex flex-col gap-3 rounded-[var(--app-radius)] border border-[var(--app-border)] p-4">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              :placeholder="t('Access.SearchPlaceholder')"
              :loading="searching"
            />
            <div class="max-h-72 overflow-auto rounded-md border border-[var(--app-border)]">
              <div v-if="!requestable.length" class="p-4 text-center text-sm text-[var(--app-text-muted)]">
                {{ searching ? t("Access.Searching") : t("Access.NothingToRequest") }}
              </div>
              <button
                v-for="a of requestable"
                :key="a.id"
                type="button"
                class="flex w-full items-center gap-2 border-b border-[var(--app-border)] px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[var(--app-hover-soft)]"
                :class="selected.includes(a.id) ? 'bg-[var(--app-selected-soft)]' : ''"
                @click="toggle(a.id)"
              >
                <UCheckbox :model-value="selected.includes(a.id)" tabindex="-1" class="pointer-events-none" />
                <UIcon :name="categoryIcon(a.category)" class="size-4 shrink-0 text-[var(--app-text-muted)]" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate">{{ a.name }}</span>
                  <span class="block truncate text-xs text-[var(--app-text-muted)]">
                    {{ a.address }} · {{ a.policy.name }}
                  </span>
                </span>
                <UBadge v-if="a.policy.auto_approve" size="sm" color="success" variant="subtle">
                  {{ t("Access.InstantUpTo", { h: a.policy.auto_approve_max_hours }) }}
                </UBadge>
                <UBadge v-else size="sm" color="neutral" variant="subtle">{{ t("Access.NeedsApproval") }}</UBadge>
              </button>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-xs text-[var(--app-text-muted)]">{{ t("Access.HowLong", { max: maxHours }) }}</span>
              <div class="flex flex-wrap items-center gap-2">
                <UButton
                  v-for="h of presets"
                  :key="h"
                  size="xs"
                  :color="hours === h ? 'primary' : 'neutral'"
                  :variant="hours === h ? 'solid' : 'outline'"
                  @click="hours = h"
                >
                  {{ h }} h
                </UButton>
                <UInputNumber v-model="hours" :min="1" :max="maxHours" size="xs" class="w-28" />
              </div>
            </div>
            <UTextarea
              v-model="reason"
              :rows="2"
              autoresize
              :placeholder="reasonRequired ? t('Access.ReasonRequired') : t('Access.ReasonOptional')"
            />
            <UButton
              block
              :disabled="!canSubmit"
              :loading="submitting"
              :icon="instant ? 'i-lucide-zap' : 'i-lucide-send'"
              @click="submit"
            >
              {{ instant ? t("Access.GetNow") : t("Access.SendRequest") }}
            </UButton>
            <p v-if="selectedAssets.length" class="text-xs text-[var(--app-text-muted)]">
              {{ instant ? t("Access.InstantHelp") : t("Access.ApprovalHelp") }}
            </p>
          </div>

          <div v-if="overview?.pending.length" class="flex flex-col gap-1">
            <h3 class="text-xs font-semibold uppercase text-[var(--app-text-muted)]">{{ t("Access.Waiting") }}</h3>
            <div
              v-for="p of overview.pending"
              :key="p.id"
              class="flex items-center justify-between gap-2 rounded-md border border-[var(--app-border)] px-3 py-2 text-sm"
            >
              <span class="min-w-0">
                <span class="block truncate">{{ p.assets.join(", ") }}</span>
                <span class="block text-xs text-[var(--app-text-muted)]">
                  {{ formatTime(p.date_start) }} – {{ formatTime(p.date_expired) }}
                </span>
              </span>
              <UButton size="xs" color="neutral" variant="ghost" :loading="busy === p.id" @click="cancel(p.id)">
                {{ t("Common.Cancel") }}
              </UButton>
            </div>
          </div>

          <div v-if="overview?.recent.length" class="flex flex-col gap-1">
            <h3 class="text-xs font-semibold uppercase text-[var(--app-text-muted)]">{{ t("Access.Recent") }}</h3>
            <div v-for="r of overview.recent" :key="r.id" class="flex items-center justify-between gap-2 px-1 text-sm">
              <span class="truncate">{{ r.title }}</span>
              <UBadge
                size="sm"
                variant="subtle"
                :color="r.state === 'approved' ? 'success' : r.state === 'rejected' ? 'error' : 'neutral'"
              >
                {{ r.auto ? t("Access.AutoApproved") : t(`Access.State.${r.state}`) }}
              </UBadge>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
