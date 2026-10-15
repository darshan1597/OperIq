import { ShieldAlert } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";

const date = (value) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

export default function SecurityAlerts({ alerts = [] }) {
  if (!alerts.length) return null;
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-[#ffd7c2] bg-[#fffaf6]">
      <div className="flex items-center gap-2.5 border-b border-[#ffe4d5] px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff0e5] text-[#dc500a]">
          <ShieldAlert size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-[14px] font-bold">Suspicious activity</h2>
          <p className="m-0 mt-0.5 text-[10px] text-[#7c889d]">
            A business-wide AI pause request needs review in ArmorIQ.
          </p>
        </div>
      </div>
      {alerts.map((alert) => (
        <article
          key={`${alert.workspaceId}-${alert.triggeredAt}`}
          className="flex items-center justify-between gap-4 border-b border-[#edf0f4] px-4 py-3 last:border-0 max-sm:flex-col max-sm:items-start"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-[12px] text-[#172641]">{alert.businessName}</strong>
              <span className="text-[10px] text-[#52627a]">{alert.reason}</span>
            </div>
            <small className="mt-1 block text-[9px] text-[#7a879b]">
              Detected {date(alert.triggeredAt)} · restricted until {date(alert.rateLimitedUntil)}
            </small>
          </div>
          <div className="flex shrink-0 items-center">
            <StatusBadge status={alert.status} />
          </div>
        </article>
      ))}
    </section>
  );
}
