<script setup lang="ts">
// XPAM: MFA check before a just-in-time account is used (asked by the policy).
import type { MfaBackend } from "~/composables/useJitMfa";

const { t } = useI18n();
const state = useJitMfaState();
const backends = ref<MfaBackend[]>([]);
const backend = ref("");
const code = ref("");
const loading = ref(false);
const sending = ref(false);
const error = ref("");
const noMfa = ref(false);

const open = computed(() => state.value.open);
const current = computed(() => backends.value.find((b) => b.name === backend.value));
const canSendCode = computed(() => ["sms", "email"].includes(backend.value));
const backendItems = computed(() =>
  backends.value.filter((b) => !b.disabled).map((b) => ({ label: b.display_name, value: b.name }))
);

watch(open, async (value) => {
  if (!value) return;
  code.value = "";
  error.value = "";
  noMfa.value = false;
  loading.value = true;
  try {
    const res = await getMfaBackends();
    backends.value = res.content || [];
    backend.value = backendItems.value[0]?.value || "";
    noMfa.value = !backend.value;
  } catch {
    noMfa.value = true;
  } finally {
    loading.value = false;
  }
});

const send = async () => {
  sending.value = true;
  error.value = "";
  try {
    await sendMfaCode(backend.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    sending.value = false;
  }
};

const verify = async () => {
  if (!code.value.trim()) return;
  loading.value = true;
  error.value = "";
  try {
    await confirmMfa(backend.value, code.value.trim());
    finishJitMfa(true);
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || t("Access.MfaFailed");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <UModal
    :open="open"
    :title="t('Access.MfaTitle')"
    :ui="{
      content: 'w-[calc(100vw-3rem)] max-w-[420px] bg-[var(--workspace-surface-panel)] ring-[var(--app-border)]',
      title: 'text-sm leading-5',
      footer: 'justify-end gap-2'
    }"
    @update:open="(value) => !value && finishJitMfa(false)"
  >
    <template #body>
      <div class="flex flex-col gap-3 text-sm">
        <p class="text-[var(--app-text-muted)]">{{ t("Access.MfaHelp") }}</p>
        <UAlert
          v-if="noMfa"
          color="warning"
          variant="subtle"
          icon="i-lucide-shield-alert"
          :title="t('Access.MfaNotSetUp')"
        />
        <template v-else>
          <USelect v-if="backendItems.length > 1" v-model="backend" :items="backendItems" class="w-full" />
          <div class="flex gap-2">
            <UInput
              v-model="code"
              autofocus
              class="flex-1"
              :placeholder="current?.placeholder || t('Access.MfaCode')"
              autocomplete="one-time-code"
              @keydown.enter="verify"
            />
            <UButton v-if="canSendCode" color="neutral" variant="outline" :loading="sending" @click="send">
              {{ t("Access.MfaSendCode") }}
            </UButton>
          </div>
        </template>
        <p v-if="error" class="text-[var(--ui-error)]">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" @click="finishJitMfa(false)">{{ t("Common.Cancel") }}</UButton>
      <UButton :loading="loading" :disabled="noMfa || !code.trim()" @click="verify">
        {{ t("Access.MfaVerify") }}
      </UButton>
    </template>
  </UModal>
</template>
