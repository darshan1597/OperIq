import { useOutletContext } from "react-router-dom";
import MetricsGrid from "../components/MetricsGrid.jsx";
import WorkspaceList from "./WorkspaceList.jsx";
export default function WorkspacesPage(){const {data}=useOutletContext();return <><MetricsGrid data={data}/><WorkspaceList workspaces={data?.workspaces||[]}/></>;}
