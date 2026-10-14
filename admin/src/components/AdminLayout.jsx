import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  Clock3,
  Database,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { api, messageFor } from "../api.js";
import Brand from "./Brand.jsx";

const pages = [
  ["/", "Overview", LayoutDashboard],
  ["/ask", "Ask OperIQ", MessageSquare],
  ["/holds", "ArmorIQ holds", Clock3],
  ["/workspaces", "Workspaces", Building2],
  ["/governance", "Governance audit", Database],
];

const titles = {
  "/": "Platform overview",
  "/ask": "Ask OperIQ",
  "/holds": "ArmorIQ hold queue",
  "/workspaces": "Business workspaces",
  "/governance": "Governance audit",
};

const descriptions = {
  "/ask": "Use the ArmorIQ-governed platform agent.",
  "/workspaces": "Operational account health without customer records.",
};

export default function AdminLayout({ onLogout }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const location = useLocation();
  const load = async (showProgress = true) => {
    setBusy(true);
    try {
      setData(
        (
          await api.get("/admin/overview", {
            trackProgress: showProgress,
            progressLabel: "Loading platform governance data…",
          })
        ).data,
      );
      setError("");
    } catch (requestError) {
      if (requestError.response?.status === 401) return onLogout();
      setError(messageFor(requestError));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    load();
    const timer = setInterval(() => load(false), 5000);
    return () => clearInterval(timer);
  }, []);
  const path = pages.some(([route]) => route === location.pathname)
    ? location.pathname
    : "/";
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[245px_1fr]">
      <aside className="flex items-center border-b border-[#e4e8ef] bg-white p-5 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:w-[245px] lg:flex-col lg:items-stretch lg:border-b-0 lg:border-r lg:p-6">
        <Brand />
        <nav className="ml-auto flex gap-1 lg:ml-0 lg:mt-9 lg:block">
          {pages.map(([route, label, Icon]) => (
            <NavLink
              key={route}
              to={route}
              end={route === "/"}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold no-underline lg:mb-1 lg:w-full ${isActive ? "bg-[#fff0e7] text-[#e2520b]" : "text-[#60708a] hover:bg-[#f7f8fb]"}`
              }
            >
              <Icon size={18} />
              <span className="hidden lg:inline">{label}</span>
              {route === "/holds" && data?.metrics.held ? (
                <b className="ml-auto rounded-full bg-[#fff0df] px-2 py-0.5 text-[9px] text-[#d4580e]">
                  {data.metrics.held}
                </b>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden gap-2.5 rounded-xl bg-[#f3f6fb] p-3.5 text-[#53647e] lg:flex">
          <ShieldCheck size={18} />
          <div>
            <strong className="text-[11px]">ArmorIQ governed</strong>
            <p className="mt-1 text-[10px] leading-4">
              Decisions remain inside ArmorIQ.
            </p>
          </div>
        </div>
        <button
          className="ml-2 flex items-center gap-2 rounded-xl border border-[#f0d7d7] bg-transparent p-3 text-xs font-bold text-[#bd4b55] lg:ml-0 lg:mt-3 lg:w-full"
          onClick={onLogout}
        >
          <LogOut size={17} />
          <span className="hidden lg:inline">Sign out</span>
        </button>
      </aside>
      <main className="p-5 lg:col-start-2 lg:px-11 lg:pb-6 lg:pt-10">
        <header className="flex items-start justify-between gap-6 max-sm:block">
          <div>
            <span className="text-[9px] font-black tracking-[1.7px] text-[#f05a12]">
              OPERIQ CONTROL PLANE
            </span>
            <h1 className="mb-1 mt-2 text-3xl font-bold tracking-[-1.4px]">
              {titles[path]}
            </h1>
            <p className="m-0 text-[13px] text-[#738098]">
              {descriptions[path] ||
                "Monitor governed actions without exposing business records."}
            </p>
          </div>
          <div className="flex gap-2.5 max-sm:mt-4">
            {data?.armorDashboardUrl && (
              <a
                className="inline-flex items-center gap-2 rounded-xl border border-[#ffceb6] bg-[#fff7f2] px-3.5 py-3 text-[11px] font-extrabold text-[#d84d08] no-underline"
                href={data.armorDashboardUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open ArmorIQ <ArrowUpRight size={15} />
              </a>
            )}
            <button
              onClick={load}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dfe4ec] bg-white px-3.5 py-3 text-[11px] font-extrabold text-[#34455f]"
            >
              <RefreshCw className={busy ? "animate-spin" : ""} size={16} />{" "}
              Refresh
            </button>
          </div>
        </header>
        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#ffd4d4] bg-[#fff1f1] p-3 text-xs text-[#b73b45]">
            <TriangleAlert size={17} />
            {error}
          </div>
        )}
        <Outlet context={{ data, load }} />
        <footer className="px-0.5 py-5 text-[10px] text-[#8a96a8]">
          Last synchronized{" "}
          {data?.refreshedAt
            ? new Date(data.refreshedAt).toLocaleString()
            : "—"}{" "}
          · Approval decisions are made in ArmorIQ and reflected here
          automatically.
        </footer>
      </main>
    </div>
  );
}
