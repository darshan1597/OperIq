import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { clearToken, readToken } from "./api.js";
import AdminLayout from "./components/AdminLayout.jsx";
import AskOperIQPage from "./pages/AskOperIQPage.jsx";
import GovernancePage from "./pages/GovernancePage.jsx";
import HoldsPage from "./pages/HoldsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import WorkspacesPage from "./pages/WorkspacesPage.jsx";

export default function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(readToken()));
  const logout = () => { clearToken(); setAuthenticated(false); };
  return <Routes>
    <Route path="/login" element={authenticated ? <Navigate to="/" replace/> : <LoginPage onLogin={()=>setAuthenticated(true)}/>}/>
    <Route element={authenticated ? <AdminLayout onLogout={logout}/> : <Navigate to="/login" replace/>}>
      <Route index element={<OverviewPage/>}/>
      <Route path="ask" element={<AskOperIQPage/>}/>
      <Route path="holds" element={<HoldsPage/>}/>
      <Route path="workspaces" element={<WorkspacesPage/>}/>
      <Route path="governance" element={<GovernancePage/>}/>
    </Route>
    <Route path="*" element={<Navigate to={authenticated ? "/" : "/login"} replace/>}/>
  </Routes>;
}
