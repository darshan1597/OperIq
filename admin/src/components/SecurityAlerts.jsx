import { ShieldAlert } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";

const date = (value) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

export default function SecurityAlerts({ alerts = [] }) {
  if (!alerts.length) return null;
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-[#ffd7c2] bg-white">
      <div className="flex items-center gap-3 border-b border-[#ffe4d5] bg-[#fff8f3] p-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0e5] text-[#dc500a]"><ShieldAlert size={20} /></span>
        <div>
          <h2 className="m-0 text-[17px] font-bold">Suspicious activity</h2>
          <p className="mt-1 text-[11px] text-[#7c889d]">Repeated ArmorIQ-blocked actions and their governed response.</p>
        </div>
      </div>
      {alerts.map((alert) => (
        <article key={`${alert.workspaceId}-${alert.triggeredAt}`} className="grid gap-3 border-b border-[#edf0f4] px-5 py-4 last:border-0 md:grid-cols-[1fr_auto]">
          <div>
            <strong className="text-[13px] text-[#172641]">{alert.businessName}</strong>
            <p className="mb-0 mt-2 text-[11px] leading-5 text-[#52627a]">{alert.reason}</p>
            <small className="mt-2 block text-[10px] text-[#7a879b]">Detected {date(alert.triggeredAt)} · customer rate limit until {date(alert.rateLimitedUntil)}</small>
            {alert.delegationId && <code className="mt-2 block break-all text-[9px] text-[#64738b]">Delegation: {alert.delegationId}</code>}
          </div>
          <div className="flex items-start gap-2">
            <StatusBadge status={alert.status} />
            {alert.pauseExecuted && <span className="rounded-full bg-[#fff0df] px-2.5 py-1.5 text-[9px] font-bold text-[#c55212]">AI paused</span>}
          </div>
        </article>
      ))}
    </section>
  );
}
