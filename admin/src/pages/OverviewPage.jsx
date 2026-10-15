import { useOutletContext } from "react-router-dom";
import GovernanceTable from "../components/GovernanceTable.jsx";
import MetricsGrid from "../components/MetricsGrid.jsx";
import SecurityAlerts from "../components/SecurityAlerts.jsx";

export default function OverviewPage() {
  const { data } = useOutletContext();
  return (
    <>
      <MetricsGrid data={data} />
      <SecurityAlerts alerts={data?.securityAlerts || []} />
      <GovernanceTable
        title="Recent governed actions"
        actions={(data?.actions || []).slice(0, 5)}
        data={data}
      />
    </>
  );
}
