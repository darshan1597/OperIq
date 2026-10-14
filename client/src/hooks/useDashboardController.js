import { useEffect, useState } from "react";
import { apiClient, apiError, clearAuthToken, readAuthToken, storeAuthToken } from "../api/client.js";
import { pagesByRole } from "../pages/components/Sidebar.jsx";
import { agents, avatar, badge, prompts, routeByPage } from "../pages/components/dashboard-config.jsx";

export default function useDashboardController({ location, routerNavigate }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState("Overview");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [probe, setProbe] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState("auto");
  const [askAnswer, setAskAnswer] = useState("");
  const [token, setToken] = useState(readAuthToken);

  const api = async (path, body, method = "POST", config = {}) => (
    await apiClient.request({ url: path, method: body ? method : "GET", data: body, ...config })
  ).data;

  const logout = () => {
    clearAuthToken();
    setToken("");
    setData(null);
    setError("");
    routerNavigate("/");
  };

  const load = async (showProgress = true) => {
    try {
      setData(await api("/workspace", undefined, "GET", { trackProgress: showProgress, progressLabel: "Loading your workspace…" }));
      setError("");
    } catch (requestError) {
      if (requestError.response?.status === 401) logout();
      else setError(apiError(requestError));
    }
  };

  useEffect(() => {
    const match = Object.entries(routeByPage).find(([, path]) => path === location.pathname);
    if (match) setPage(match[0]);
  }, [location.pathname]);

  useEffect(() => {
    if (!token) return undefined;
    load();
    const timer = setInterval(() => load(false), 4000);
    return () => clearInterval(timer);
  }, [token]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const navigate = (name, search = "") => {
    setPage(name);
    setQuery(search);
    routerNavigate(routeByPage[name] || "/");
  };

  const authenticated = ({ token: nextToken }) => {
    storeAuthToken(nextToken);
    setToken(nextToken);
    setData(null);
  };

  const action = async (path, body, method) => {
    try {
      await api(path, body, method, { progressLabel: "Saving the workspace change…" });
      await load(false);
      setNotice("Workspace updated");
    } catch (requestError) {
      setNotice(apiError(requestError));
    }
  };

  const run = async () => {
    setBusy(true);
    try {
      if (selectedWorkflow === "auto" && !probe) {
        const quick = await api("/ask", { question: goal }, "POST", { progressLabel: "Reading workspace data and preparing the answer…" });
        if (quick.kind === "answer") {
          setAskAnswer(quick.answer);
          return;
        }
      }
      const result = await api("/runs", { goal, workflow: selectedWorkflow, securityProbe: probe }, "POST", { progressLabel: "Planning and running the governed workflow…" });
      await load(false);
      setModal(false);
      const preparedInvitation = result.steps?.some((step) => step.action === "prepare_member_invites");
      navigate(preparedInvitation ? "Approvals" : "Agent activity");
      setNotice(preparedInvitation && result.status === "Completed"
        ? "Invitation proposal prepared. Review it before any email is sent."
        : result.status === "Held"
          ? "ArmorIQ is holding a platform action for administrator review."
          : "Workflow finished. Review the execution records.");
    } catch (requestError) {
      setNotice(apiError(requestError));
      await load(false);
    } finally {
      setBusy(false);
    }
  };

  const start = (workflow) => {
    setGoal(prompts[workflow]);
    setSelectedWorkflow(workflow);
    setAskAnswer("");
    setProbe(false);
    setModal(true);
  };

  const ask = (request) => {
    setGoal(request || "");
    setSelectedWorkflow("auto");
    setAskAnswer("");
    setProbe(false);
    setModal(true);
  };

  const customer = (id) => data?.customers.find((item) => item.id === id);
  const staff = (id) => data?.staff.find((item) => item.id === id);
  const pending = data?.approvals.filter((item) => item.status === "Pending") || [];
  const filtered = (rows) => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  const appointments = data ? filtered(data.appointments).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)) : [];
  const allowedPages = data ? pagesByRole[data.user.role] || pagesByRole.staff : [];
  const canUseAgents = data ? ["owner", "manager"].includes(data.user.role) : false;
  const pageProps = data ? { data, appointments, customer, staff, filtered, badge, avatar, pending, action, start, ask, navigate, setGoal, setModal, agents, busy, api, setNotice, logout, query, setQuery, load } : {};

  return {
    data, page, query, modal, goal, busy, notice, error, probe, selectedWorkflow, askAnswer, token,
    setQuery, setModal, setGoal, setNotice, setProbe, setSelectedWorkflow, setAskAnswer,
    api, load, action, run, start, ask, navigate, authenticated, logout,
    pending, appointments, allowedPages, canUseAgents, pageProps,
  };
}
