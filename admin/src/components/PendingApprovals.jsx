import { Hourglass } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";

const date = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export default function PendingApprovals({ approvals = [] }) {
  return <section className="mt-5 overflow-hidden rounded-2xl border border-[#e2e6ed] bg-white">
    <div className="border-b border-[#e8ebf0] p-5"><h2 className="m-0 text-[17px] font-bold">Pending business decisions</h2><p className="mt-1 text-[11px] text-[#7c889d]">Approval metadata only. Customer identity and booking details are hidden.</p></div>
    {approvals.length === 0 ? <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-xs text-[#8995a8]"><Hourglass size={25}/><strong>No business approvals are waiting</strong></div> : <div>{approvals.map((item) => <article key={`${item.workspaceId}-${item.id}`} className="grid gap-3 border-b border-[#edf0f4] px-5 py-4 last:border-0 md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_130px_160px] md:items-center"><div><strong className="block text-xs text-[#172641]">{item.businessName}</strong><small className="mt-1 block text-[9px] text-[#7a879b]">Requested by {item.requestedBy}</small></div><span className="text-[11px] font-semibold text-[#52627a]">{item.type}</span><StatusBadge status={item.status}/><small className="text-[10px] text-[#7a879b]">Created {date(item.createdAt)}</small></article>)}</div>}
  </section>;
}
