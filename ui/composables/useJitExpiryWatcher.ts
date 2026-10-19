// XPAM: warn the user in the workspace shortly before time-boxed access ends (with "Extend 1 h").
export function useJitExpiryWatcher() {
  const { t } = useI18n();
  const toast = useToast();
  const localePath = useLocalePath();
  const warned = new Set<string>();
  let lastGrants: string | null = null;
  let lastApprovals = 0;

  async function check() {
    let data;
    try {
      data = await getJitAccess();
    } catch {
      return;
    }
    const grants = data.grants.map((g) => `${g.id}:${g.date_expired}`).join();
    if (lastGrants !== null && lastGrants !== grants) useEventBus().emit("accessChanged", undefined);
    lastGrants = grants;
    const waiting = data.approvals_waiting || 0;
    if (waiting > lastApprovals) {
      toast.add({
        title: t("Access.ApprovalsWaiting", { n: waiting }),
        color: "info",
        icon: "i-lucide-inbox",
        actions: [{ label: t("Access.Review"), onClick: () => navigateTo(localePath({ path: "/access" })) }]
      });
    }
    lastApprovals = waiting;
    const skew = Date.parse(data.server_time) - Date.now();
    for (const grant of data.grants) {
      const key = `${grant.id}:${grant.date_expired}`;
      const left = (Date.parse(grant.date_expired) - (Date.now() + skew)) / 1000;
      const warnAt = (grant.policy?.warn_minutes || 15) * 60;
      if (!grant.active || left > warnAt || warned.has(key)) continue;
      warned.add(key);
      toast.add({
        title: t("Access.EndingSoon", { time: formatJitTimeLeft(left) }),
        description: grant.assets.map((a) => a.name).join(", "),
        color: "warning",
        icon: "i-lucide-alarm-clock",
        duration: 0,
        actions: [
          {
            label: t("Access.ExtendBy", { h: 1 }),
            onClick: async () => {
              try {
                const ticket = await extendJitAccess(grant.id, 1, "");
                toast.add({
                  title: ticket.state === "approved" ? t("Access.Extended", { h: 1 }) : t("Access.ExtendSent"),
                  color: ticket.state === "approved" ? "success" : "info"
                });
              } catch (e: any) {
                toast.add({
                  title: t("Access.RequestFailed"),
                  description: e?.data?.detail || e?.message,
                  color: "error"
                });
              }
            }
          },
          {
            label: t("Access.Open"),
            color: "neutral",
            variant: "outline",
            onClick: () => navigateTo(localePath({ path: "/access" }))
          }
        ]
      });
    }
  }

  const { pause, resume } = useIntervalFn(() => void check(), 60000, { immediate: false });
  return {
    start: () => {
      void check();
      resume();
    },
    stop: pause
  };
}
