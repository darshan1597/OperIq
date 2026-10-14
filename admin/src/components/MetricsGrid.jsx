import { Ban, Building2, CheckCircle2, Clock3, Hourglass, TriangleAlert } from "lucide-react";
import Metric from "./Metric.jsx";

export default function MetricsGrid({ data }) {
  const metrics = data?.metrics;
  return <section className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
    <Metric icon={Building2} label="Workspaces" value={metrics?.workspaces ?? "—"}/>
    <Metric icon={CheckCircle2} label="Allowed" value={metrics?.allowed ?? "—"}/>
    <Metric icon={Clock3} label="Held by ArmorIQ" value={metrics?.held ?? "—"} accent/>
    <Metric icon={Ban} label="Blocked" value={metrics?.blocked ?? "—"}/>
    <Metric icon={TriangleAlert} label="Failed" value={metrics?.failed ?? "—"}/>
    <Metric icon={Hourglass} label="Pending approvals" value={metrics?.pendingApprovals ?? "—"}/>
  </section>;
}
