import { useOutletContext } from "react-router-dom";
import MetricsGrid from "../components/MetricsGrid.jsx";
import GovernanceTable from "../components/GovernanceTable.jsx";

export default function HoldsPage() {
    const { data } = useOutletContext();
    return (
        <>
            <MetricsGrid data={data} />
            <GovernanceTable
                title="Waiting for platform review"
                actions={(data?.actions || []).filter((item) => item.status === "Held")}
                data={data}
            />
        </>
    );
}
