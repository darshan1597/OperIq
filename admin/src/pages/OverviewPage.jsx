import { useOutletContext } from "react-router-dom";
import GovernanceTable from "../components/GovernanceTable.jsx";
import MetricsGrid from "../components/MetricsGrid.jsx";
import PendingApprovals from "../components/PendingApprovals.jsx";
import SecurityAlerts from "../components/SecurityAlerts.jsx";

export default function OverviewPage() {
  const { data } = useOutletContext();
  return (
    <>
      <MetricsGrid data={data} />
      <SecurityAlerts alerts={data?.securityAlerts || []} />
      <PendingApprovals
        approvals={(data?.pendingApprovals || []).slice(0, 8)}
      />
      <GovernanceTable
        title="Recent governed actions"
        actions={(data?.actions || []).slice(0, 5)}
        data={data}
      />
    </>
  );
}
