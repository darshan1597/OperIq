import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  LayoutDashboard,
  Users,
  CalendarDays,
  ListTodo,
  ShieldCheck,
  UserRound,
  Search,
  Bell,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  CheckCheck,
  Clock,
  MoreHorizontal,
  MessageSquare,
  Activity,
  Command,
  Send,
  X,
  Download,
  AlertCircle,
  Briefcase,
  PanelLeftClose,
  LogOut,
  KeyRound,
} from "lucide-react";
import { LogoMark, BrandWordmark } from "./pages/components/Brand.jsx";
import {
  OverviewHero,
  GlobalSearch,
  TaskPreview,
  BriefingActivity,
} from "./pages/components/OverviewHero.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AgentActivityPage from "./pages/AgentActivityPage.jsx";
import ApprovalsPage from "./pages/ApprovalsPage.jsx";
import ConversationsPage from "./pages/ConversationsPage.jsx";
import TeamTasksPage from "./pages/TeamTasksPage.jsx";
import SchedulePage from "./pages/SchedulePage.jsx";
import CustomersPage from "./pages/CustomersPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import AISetupPage from "./pages/AISetupPage.jsx";
import BusinessPortalPage from "./pages/BusinessPortalPage.jsx";
import AccessPage from "./pages/AccessPage.jsx";
import InvitePage from "./pages/InvitePage.jsx";
import {
  apiClient,
  apiError,
  clearAuthToken,
  readAuthToken,
  storeAuthToken,
} from "./api/client.js";
const routeByPage = {
  Overview: "/app",
  Customers: "/app/customers",
  Schedule: "/app/schedule",
  "Team & tasks": "/app/team-tasks",
  Conversations: "/app/conversations",
  Approvals: "/app/approvals",
  "Agent activity": "/app/agent-activity",
  Profile: "/app/profile",
  "Teach your AI": "/app/ai-setup",
  "Team access": "/app/access",
};
const nav = [
  ["Overview", LayoutDashboard],
  ["Customers", Users],
  ["Schedule", CalendarDays],
  ["Team & tasks", ListTodo],
  ["Conversations", MessageSquare],
  ["Approvals", ShieldCheck],
  ["Agent activity", Activity],
  ["Teach your AI", Sparkles],
  ["Team access", KeyRound],
  ["Profile", UserRound],
];
const pagesByRole = {
  owner: nav.map(([name]) => name),
  manager: ["Overview", "Customers", "Schedule", "Team & tasks", "Conversations", "Approvals", "Agent activity"],
  receptionist: ["Overview", "Customers", "Schedule", "Team & tasks", "Conversations"],
  staff: ["Overview", "Schedule", "Team & tasks"],
};
const prompts = {
  enquiry:
    "Review the current customer enquiries, identify an available staff member, and prepare the appropriate follow-up.",
  absence:
    "Coordinate coverage for an unavailable staff member and prepare alternative arrangements for affected customers. Do not change confirmed bookings without customer consent.",
  complaint:
    "Review an open customer complaint, prepare a response, assign a follow-up task, and request approval for any proposed compensation.",
  access:
    "Invite the listed email addresses to this workspace. Respect any roles I specify. For emails without a role, balance manager, receptionist, and staff counts as evenly as possible. Never assign owner access.",
  conflict:
    "Inspect the current schedule for overlapping appointments or unavailable assigned staff. Suggest the safest valid alternative and prepare one resolution for owner approval. Do not change any booking yet.",
};
const agents = [
  {
    name: "Coordinator",
    role: "Plans & delegates",
    icon: Command,
    color: "lavender",
  },
  {
    name: "Customer agent",
    role: "Conversations & follow-ups",
    icon: MessageSquare,
    color: "peach",
  },
  {
    name: "Operations agent",
    role: "Schedules & staff tasks",
    icon: CalendarDays,
    color: "mint",
  },
  {
    name: "Resolution agent",
    role: "Complaints & exceptions",
    icon: ShieldCheck,
    color: "blue",
  },
];
export default function App() {
  const [data, setData] = useState(null),
    [page, setPage] = useState("Overview"),
    [query, setQuery] = useState(""),
    [modal, setModal] = useState(false),
    [goal, setGoal] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [probe, setProbe] = useState(false),
    [selectedWorkflow, setSelectedWorkflow] = useState("auto"),
    [askAnswer, setAskAnswer] = useState(""),
    [token, setToken] = useState(readAuthToken);
  const routerNavigate = useNavigate();
  const location = useLocation();
  const api = async (path, body, method = "POST", config = {}) => (await apiClient.request({url:path,method:body?method:"GET",data:body,...config})).data;
  const load = async (showProgress = true) => {
    try {
      setData(await api("/workspace", undefined, "GET", { trackProgress: showProgress, progressLabel: "Loading your workspace…" }));
      setError("");
    } catch (e) {
      if (e.response?.status === 401) logout();
      else setError(apiError(e));
    }
  };
  useEffect(() => {
    const match = Object.entries(routeByPage).find(
      ([, path]) => path === location.pathname,
    );
    if (match) setPage(match[0]);
  }, [location.pathname]);
  useEffect(() => {
    if (!token) return;
    load();
    const timer = setInterval(() => load(false), 4000);
    return () => clearInterval(timer);
  }, [token]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const action = async (path, body, method) => {
    try {
      await api(path, body, method, { progressLabel: "Saving the workspace change…" });
      await load(false);
      setNotice("Workspace updated");
    } catch (e) {
      setNotice(apiError(e));
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
      const result = await api("/runs", {
        goal,
        workflow: selectedWorkflow,
        securityProbe: probe,
      }, "POST", { progressLabel: "Planning and running the governed workflow…" });
      await load(false);
      setModal(false);
      const preparedInvitation = result.steps?.some(
        (step) => step.action === "prepare_member_invites",
      );
      navigate(preparedInvitation ? "Approvals" : "Agent activity");
      setNotice(preparedInvitation && result.status === "Completed"
        ? "Invitation proposal prepared. Review it before any email is sent."
        : result.status === "Held"
          ? "ArmorIQ is holding a platform action for administrator review."
          : "Workflow finished. Review the execution records.");
    } catch (e) {
      setNotice(apiError(e));
      await load(false);
    } finally {
      setBusy(false);
    }
  };
  const start = (w) => {
    setGoal(prompts[w]);
    setSelectedWorkflow(w);
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
  const navigate = (name, search = "") => {
    setPage(name);
    setQuery(search);
    routerNavigate(routeByPage[name] || "/");
  };
  const authenticated = ({token:nextToken}) => {storeAuthToken(nextToken);setToken(nextToken);setData(null);};
  const logout = () => {clearAuthToken();setToken("");setData(null);setError("");routerNavigate("/");};
  const customer = (id) => data?.customers.find((c) => c.id === id);
  const staff = (id) => data?.staff.find((c) => c.id === id);
  const pending = data?.approvals.filter((a) => a.status === "Pending") || [];
  const filtered = (rows) =>
    rows.filter((r) =>
      JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
    );
  const badge = (text) => (
    <span
      className={`badge inline-flex items-center rounded-sm py-1 px-1.5 text-caption whitespace-nowrap font-500 !text-caption !font-500 !rounded-md !py-1.5 !px-2 ${/Blocked|Failed|Rejected|Unavailable|Expired/.test(text) ? "red bg-[#fbeae6] text-[#b27365] !bg-[#ffe9eb] !text-[#e83f4c]" : /Confirmed|Completed|Active|Approved|Available|Done|Reviewed/.test(text) ? "green bg-[#f0f5e9] text-[#81956b] !bg-[#e7f5ec] !text-[#087344]" : /Pending|Awaiting|Follow-up|Held|Processing/.test(text) ? "amber bg-[#faf2df] text-[#ac9253] !bg-[#fff0de] !text-[#d35009]" : "neutral bg-[#f2f2ee] text-[#929783] !bg-[#eff1f5] !text-[#586780]"}`}
    >
      {text}
    </span>
  );
  const avatar = (c) => (
    <span
      className={`avatar w-8 h-8 [flex-shrink:0] rounded-full inline-flex items-center justify-center font-600 text-2xs text-[#5a6557] !w-9 !h-9 !text-2xs ${(c?.color || "mint") === "mint" ? "mint bg-[#eaf0e1] text-[#7e9869] !bg-[#e9f5eb] !text-[#00843c]" : (c?.color || "mint") === "lavender" ? "lavender bg-[#eeeaf6] text-[#8876a8] !bg-[#f0e7ff] !text-[#7b35f5]" : (c?.color || "mint") === "peach" ? "peach bg-[#faece1] text-[#b98c66] !bg-[#fff0df] !text-[#ff640d]" : ""}`}
    >
      {c?.initials || "OD"}
    </span>
  );
  const pathPortal = location.pathname.match(/^\/b\/([a-z0-9-]+)\/?$/i)?.[1];
  const hostParts = window.location.hostname.toLowerCase().split(".");
  const hostPortal = window.location.hostname.endsWith(".operiq.tech") && !["www", "app"].includes(hostParts[0]) ? hostParts[0] : "";
  const portalSlug = pathPortal || hostPortal;
  if (portalSlug) return <BusinessPortalPage slug={portalSlug} />;
  const inviteToken = location.pathname.match(/^\/invite\/([a-f0-9-]+)\/?$/i)?.[1];
  if (inviteToken) return token ? <Navigate to="/app" replace /> : <InvitePage token={inviteToken} onAuthenticated={authenticated} />;
  if (location.pathname === "/") return <LandingPage navigate={routerNavigate} authenticated={Boolean(token)} />;
  if (["/login", "/signup"].includes(location.pathname)) return token ? <Navigate to="/app" replace /> : <AuthPage mode={location.pathname.slice(1)} onAuthenticated={authenticated} navigate={routerNavigate} />;
  if (!token) return <Navigate to="/login" replace />;
  if (!data)
    return (
      <div className="loading min-h-screen flex items-center justify-center flex-col gap-5 [&_h2]:text-2xl [&_p]:text-[#8d9d7c] [&_input]:p-3 [&_input]:w-[300px] [&_input]:border [&_input]:border-border [&_input]:rounded-md [&_button]:py-3 [&_button]:px-5 [&_button]:bg-[var(--forest)] [&_button]:text-white [&_button]:rounded-md [&_p]:!text-[#71809b] [&_input]:!bg-white [&_input]:!text-navy">
        <LogoMark />
        <h2>Opening OperIQ</h2>
        <p>{error || "Preparing your workspace…"}</p>
        {error && <><button onClick={load}>Retry connection</button><button onClick={logout}>Sign out</button></>}
      </div>
    );
  const appointments = filtered(data.appointments).sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
  );
  const title =
    page === "Overview" ? "A little clarity. A lot of progress." : page;
  const allowedPages = pagesByRole[data.user.role] || pagesByRole.staff;
  const canUseAgents = ["owner", "manager"].includes(data.user.role);
  const pageProps = {
    data,
    appointments,
    customer,
    staff,
    filtered,
    badge,
    avatar,
    pending,
    action,
    start,
    ask,
    navigate,
    setGoal,
    setModal,
    agents,
    busy,
    api,
    setNotice,
    logout,
    query,
    setQuery,
    load,
  };
  return (
    <div
      className={`app [&_button]:[font:inherit] [&_input]:[font:inherit] [&_textarea]:[font:inherit] [&_select]:[font:inherit] [&_button]:[-webkit-tap-highlight-color:transparent] [&_a]:[-webkit-tap-highlight-color:transparent] [&_input]:[-webkit-tap-highlight-color:transparent] [&_textarea]:[-webkit-tap-highlight-color:transparent] [&_select]:[-webkit-tap-highlight-color:transparent] [&_button]:cursor-pointer [&_button]:[transition:background_.18s,transform_.18s,box-shadow_.18s] [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-60 [&_button:focus-visible]:[outline:3px_solid_#9fc36f] [&_button:focus-visible]:[outline-offset:4px] [&_a:focus-visible]:[outline:3px_solid_#9fc36f] [&_a:focus-visible]:[outline-offset:4px] [&_button:hover:not(:disabled)]:[filter:brightness(.97)] [&_a]:text-[inherit] [&_a]:[text-decoration:none] [&_button]:[border:0] [&_button_svg]:[flex-shrink:0] [&_input]:[outline:none] [&_textarea]:[outline:none] [&_select]:[outline:none] [&_input:focus]:!border-[#86a67a] [&_input:focus]:shadow-[0_0_0_3px_#b6d49b24] [&_textarea:focus]:!border-[#86a67a] [&_textarea:focus]:shadow-[0_0_0_3px_#b6d49b24] [&_select:focus]:!border-[#86a67a] [&_select:focus]:shadow-[0_0_0_3px_#b6d49b24] [&_h1]:m-0 [&_h2]:m-0 [&_h3]:m-0 [&_h4]:m-0 [&_p]:m-0 [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_h4]:font-display [&_strong]:font-600 [&_small]:block [&_small]:text-muted [&_small]:text-xs flex min-h-screen [&_nav]:flex [&_nav]:flex-col [&_nav]:gap-1.5 [&_nav_button]:h-11 [&_nav_button]:flex [&_nav_button]:items-center [&_nav_button]:gap-3 [&_nav_button]:bg-[none] [&_nav_button]:text-[#7b847e] [&_nav_button]:rounded-lg [&_nav_button]:py-0 [&_nav_button]:px-[13px] [&_nav_button]:text-left [&_nav_button]:text-xs [&_nav_button]:font-500 [&_nav_button.active]:bg-[#eaf1e4] [&_nav_button.active]:text-[#284734] [&_nav_button.active]:font-650 [&_nav_button.active:before]:[content:''] [&_nav_button.active:before]:absolute [&_nav_button.active:before]:left-0 [&_nav_button.active:before]:w-0.5 [&_nav_button.active:before]:h-6 [&_nav_button.active:before]:bg-[#6b8c4d] [&_nav_button.active:before]:rounded-[0_2px_2px_0] [&_nav_button:nth-last-child(1)]:mt-[21px] [&_main]:ml-[238px] [&_main]:[flex:1] [&_main]:min-w-0 [&_footer]:flex [&_footer]:justify-between [&_footer]:py-[25px] [&_footer]:px-0 [&_footer]:text-caption [&_footer]:text-[#a6ae9e] [&_footer]:gap-3.5 [&_footer>span:first-child]:flex [&_footer>span:first-child]:items-center [&_footer>span:first-child]:gap-1.5 [&_table]:w-full [&_table]:[border-collapse:collapse] [&_table]:text-left [&_table]:text-xs [&_th]:uppercase [&_th]:font-500 [&_th]:text-caption [&_th]:tracking-[.7px] [&_th]:text-[#99a18f] [&_th]:py-3.5 [&_th]:px-3 [&_th]:bg-[#fafbf7] [&_td]:py-4 [&_td]:px-3 [&_td]:border-t [&_td]:border-[#edf0e7] [&_td]:text-[#78836f] [&_td_small]:mt-[5px] [&_td_small]:text-2xs [&_select]:border [&_select]:border-[#e3e9da] [&_select]:rounded-md [&_select]:bg-[#fafcf6] [&_select]:text-[#758b62] [&_select]:text-tiny [&_select]:p-2 [&_select]:max-w-full [&_to]:[transform:rotate(360deg)] desktop:[&_main]:ml-[205px] tablet:[&_nav_button]:text-[0] tablet:[&_nav_button]:p-0 tablet:[&_nav_button]:justify-center tablet:[&_nav_button]:gap-0 tablet:[&_nav_button_svg]:w-5 tablet:[&_nav_button_svg]:h-5 tablet:[&_main]:ml-18 phone:[&_footer]:text-micro phone:[&_footer]:leading-loose phone:[&_footer]:flex-col phone:[&_footer]:gap-2 [&_h1]:!font-ui [&_h2]:!font-ui [&_h3]:!font-ui [&_h4]:!font-ui [&_button:focus-visible]:![outline-color:#ffaf80] [&_a:focus-visible]:![outline-color:#ffaf80] [&_input:focus]:!border-[#ff9864] [&_input:focus]:!shadow-[0_0_0_3px_#ff550b12] [&_textarea:focus]:!border-[#ff9864] [&_textarea:focus]:!shadow-[0_0_0_3px_#ff550b12] [&_select:focus]:!border-[#ff9864] [&_select:focus]:!shadow-[0_0_0_3px_#ff550b12] [&_nav]:!gap-1 [&_nav_button]:!h-10 [&_nav_button]:!text-[#40506f] [&_nav_button]:!text-13 [&_nav_button]:!gap-3 [&_nav_button]:!rounded-lg [&_nav_button.active]:!bg-[linear-gradient(90deg,#fff2e7,#fff0e1)] [&_nav_button.active]:!text-orange [&_nav_button.active]:!font-600 [&_nav_button.active:before]:!hidden [&_nav_button:hover:not(.active)]:!bg-[#f6f7fa] [&_nav_button:nth-last-child(1)]:!mt-0 [&_main]:!ml-[250px] [&_footer]:![order:5] [&_footer]:!text-[#94a0b3] [&_footer]:!text-2xs [&_th]:!text-[#71809b] [&_th]:!bg-[#f8f9fc] [&_th]:!text-2xs [&_th]:!py-3.5 [&_th]:!px-3 [&_td]:!text-[#576884] [&_td]:!border-[#edf0f5] [&_td]:!py-5 [&_td]:!px-3 [&_td_strong]:!text-navy [&_small]:!text-[#78849c] [&_select]:!text-[#4b5f80] [&_select]:!bg-[#f8f9fc] [&_select]:!border-[#e3e8f2] [&_select]:!rounded-lg wide:[&_main]:!ml-[260px] laptop:[&_main]:!ml-[220px] tablet:[&_main]:!ml-18 tablet:[&_nav_button]:!text-[0] tablet:[&_nav_button]:!gap-0 tablet:[&_nav_button]:!justify-center mobile:[&_footer]:!text-micro box-border [&_*]:box-border [&_*::before]:box-border [&_*::after]:box-border ${page === "Overview" ? "overview-page [&_.content]:!flex [&_.content]:!flex-col [&_.page-heading]:!hidden" : ""}`}
    >
      <aside className="sidebar fixed [inset:0_auto_0_0] overflow-y-auto w-[238px] bg-white [border-right:1px_solid_var(--border)] flex flex-col pt-8 px-[19px] pb-[18px] z-[20] desktop:w-[205px] desktop:pl-[15px] desktop:pr-[15px] tablet:w-18 tablet:pt-6 tablet:px-3 tablet:pb-[15px] !w-[250px] !pt-6 !px-[21px] !pb-[18px] !bg-[#ffffffed] wide:!w-[260px] wide:!py-[23px] wide:!px-[22px] laptop:!w-[220px] laptop:!pl-4 laptop:!pr-4 tablet:!w-18 tablet:!pt-6 tablet:!px-3 tablet:!pb-[15px]">
        <a
          className="brand flex items-center gap-2.5 font-display text-[27px] font-800 tracking-[-1.3px] mt-0 mx-[13px] mb-[34px] tablet:text-[0] tablet:mt-0 tablet:mx-1.5 tablet:mb-[30px] tablet:gap-0 !font-ui !text-[#09152e] !text-[28px] !tracking-[-1.5px] !mt-0 !mx-[3px] !mb-4 tablet:!text-[0] tablet:!mt-0 tablet:!mx-[5px] tablet:!mb-[25px]"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Overview");
          }}
        >
          <BrandWordmark />
        </a>
        <button
          className="workspace flex items-center gap-2.5 w-full py-3 px-[9px] border border-border rounded-[9px] bg-white text-left text-[#2c3c34] mb-[33px] [&>span:nth-child(2)]:[flex:1] [&_strong]:text-xs [&_small]:text-2xs [&_small]:mt-1 tablet:hidden !py-[13px] !px-[9px] !rounded-[11px] !mb-3 [&_strong]:!text-xs [&_strong]:!text-navy [&_small]:!text-[#738099] [&_small]:!text-tiny"
          onClick={() => navigate(data.user.role === "owner" ? "Profile" : "Overview")}
          aria-label={`Open ${data.business.name} profile`}
        >
          <span className="workspace-logo bg-[#f0eee6] text-[#746d55] rounded-[7px] font-display text-lg font-700 w-[33px] h-[34px] grid place-items-center !font-ui !bg-[#fff0df] !text-orange !w-[35px] !h-[35px]">
            {data.business.name.charAt(0).toUpperCase()}
          </span>
          <span>
            <strong>{data.business.name}</strong>
            <small>Business workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label text-caption font-700 tracking-[1.6px] text-[#9aa198] mt-0 mx-3.5 mb-3.5 tablet:hidden !hidden">
          WORKSPACE
        </div>
        <nav>
          {nav.filter(([name]) => allowedPages.includes(name)).map(([name, Icon]) => (
            <button
              key={name}
              title={name}
              aria-label={name}
              aria-current={page === name ? "page" : undefined}
              className={page === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              {name}
              {name === "Approvals" && pending.length > 0 && (
                <span className="nav-count ml-[auto] bg-[#e9dbb9] rounded-sm text-2xs py-0.5 px-1.5 text-[#766234] tablet:absolute tablet:ml-6 tablet:mt-[-20px] tablet:text-micro tablet:py-px tablet:px-1 !text-[#ff550b] !bg-[#ffe4cc] !rounded-3xl !py-0.5 !px-1.5 tablet:!py-px tablet:!px-1 tablet:!text-micro">
                  {pending.length}
                </span>
              )}
              {name === "Conversations" &&
                data.messages.filter((m) => m.status === "Draft").length >
                  0 && (
                  <span className="nav-count ml-[auto] bg-[#e9dbb9] rounded-sm text-2xs py-0.5 px-1.5 text-[#766234] tablet:absolute tablet:ml-6 tablet:mt-[-20px] tablet:text-micro tablet:py-px tablet:px-1 !text-[#ff550b] !bg-[#ffe4cc] !rounded-3xl !py-0.5 !px-1.5 tablet:!py-px tablet:!px-1 tablet:!text-micro conversation-count !bg-orange !text-white">
                    {data.messages.filter((m) => m.status === "Draft").length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom mt-[auto] pt-6 !pt-4">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#ffd9cd] bg-[#fff8f5] px-4 py-3 text-xs font-semibold text-[#c34a2b] hover:bg-[#fff0eb] tablet:px-0 tablet:text-[0]"
            onClick={logout}
            aria-label="Log out"
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar h-[77px] py-0 px-[38px] flex items-center justify-between bg-white border-b border-border desktop:py-0 desktop:px-6 phone:h-[62px] phone:py-0 phone:px-[15px] !h-[66px] ![border-bottom:none] !bg-transparent !py-0 !px-10 !gap-5 wide:!py-0 wide:!px-[55px] laptop:!py-0 laptop:!px-[26px] mobile:!py-0 mobile:!px-4 mobile:!h-[62px]">
          <div className="breadcrumb flex items-center gap-[13px] text-tiny text-[#969d97] [&_strong]:text-[#47534b] [&_strong]:font-500 [&_span]:text-[#d0d5ce] phone:text-2xs phone:gap-[7px] !text-tiny !text-[#8490a5] [&_strong]:!text-[#465775] laptop:!hidden">
            Workspace <span>/</span>
            <strong>{page}</strong>
          </div>
          <div className="top-actions flex items-center gap-[23px] phone:gap-3 phone:[&>.avatar]:hidden !gap-5 !ml-[auto] tablet:!w-full tablet:![justify-content:flex-end] tablet:!gap-4 mobile:!gap-[9px] mobile:[&>.sandbox]:!text-[0] mobile:[&>.sandbox]:!py-2 mobile:[&>.sandbox]:!px-1.5 mobile:[&>.sandbox]:!gap-0 mobile:[&>.sandbox]:!rounded-full mobile:[&>.sandbox>span]:!w-1.5 mobile:[&>.sandbox>span]:!h-1.5 mobile:[&>.avatar]:!hidden">
            <GlobalSearch data={data} onNavigate={navigate} />
            <span className="sandbox flex items-center gap-[7px] text-2xs text-[#7d856f] py-1.5 px-[9px] bg-[#f5f7ef] border border-[#e8ebdf] rounded-[5px] [&>span]:[display:inline-block] [&>span]:w-[5px] [&>span]:h-[5px] [&>span]:[flex-shrink:0] [&>span]:bg-[#8aa96b] [&>span]:rounded-full phone:text-micro phone:p-[5px] !bg-[#fff4e9] !border-[#ffead7] !text-[#b25d29] !text-caption [&>span]:!bg-orange">
              <span />
              {data.integration.mode === "live"
                ? "Live integration"
                : "Sandbox workspace"}
            </span>
            <button
              aria-label="View approvals"
              className="icon-button p-1 bg-[none] text-[#78847a] flex items-center justify-center notification relative [&_i]:w-1 [&_i]:h-1 [&_i]:bg-[#ae875b] [&_i]:rounded-full [&_i]:absolute [&_i]:top-1 [&_i]:right-1 !text-[#3e4d6d] [&_i]:!bg-orange [&_i]:![border:2px_solid_#fff] [&_i]:!w-2 [&_i]:!h-2 [&_i]:!top-0 [&_i]:!right-0.5"
              onClick={() => navigate("Approvals")}
            >
              <Bell size={18} />
              {pending.length > 0 && <i />}
            </button>
            <span className="avatar w-8 h-8 [flex-shrink:0] rounded-full inline-flex items-center justify-center font-600 text-2xs text-[#5a6557] !w-9 !h-9 !text-2xs small w-7 h-7 text-caption !w-8 !h-8 profile-avatar bg-[#eae7de] text-[#675f50] !bg-[#ffe9d0] !text-[#14213d]">
              {data.user.name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <div className="content max-w-[1490px] m-[auto] pt-[38px] px-[38px] pb-0 wide:pt-12 desktop:pt-7 desktop:px-6 desktop:pb-0 phone:pt-6 phone:px-[15px] phone:pb-0 !max-w-[1660px] !pt-[15px] !px-10 !pb-0 wide:!pt-[7px] wide:!px-[55px] wide:!pb-0 laptop:!pt-[15px] laptop:!px-[26px] laptop:!pb-0 mobile:!pt-[17px] mobile:!px-4 mobile:!pb-0">
          {data.aiProfile?.platformStatus === "paused" && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#f3b9ad] bg-[#fff1ee] p-4 text-[#9f2f20] shadow-sm" role="alert">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ffdcd5]">
                <AlertCircle size={19} />
              </span>
              <div>
                <strong className="block text-sm">Business AI paused by OperIQ</strong>
                <p className="mt-1 text-xs leading-5 text-[#a44b3f]">
                  Your public assistant and customer AI actions are temporarily unavailable.
                  {data.aiProfile.platformStatusReason ? ` Reason: ${data.aiProfile.platformStatusReason}` : ""}
                </p>
                {data.aiProfile.platformStatusChangedAt && (
                  <small className="mt-1 text-[#a76a61]">
                    Paused {new Date(data.aiProfile.platformStatusChangedAt).toLocaleString()}
                  </small>
                )}
              </div>
            </div>
          )}
          {page === "Overview" && (
            <OverviewHero user={data.user} onRequest={ask} onWorkflow={start} canUseAgents={canUseAgents} />
          )}
          <div className="page-heading flex items-center justify-between gap-5 mb-[30px] [&_h1]:text-[27px] [&_h1]:tracking-[-1.1px] [&_h1]:font-650 [&_h1]:leading-[1.3] [&_p]:text-xs [&_p]:text-[#92998f] [&_p]:mt-2.5 wide:mb-[38px] desktop:[&_h1]:text-[23px] tablet:[&_h1]:text-2xl phone:items-start phone:flex-col phone:gap-[18px] phone:[&_h1]:text-[25px] phone:[&_h1]:max-w-[270px] phone:[&_p]:leading-loose phone:[&_p]:text-tiny phone:[&_.primary]:py-2.5 phone:[&_.primary]:px-3.5 !mt-4 !mx-0 !mb-[30px] [&_h1]:!text-[#0b1835] [&_h1]:!font-750 [&_h1]:!text-3xl [&_p]:!text-13 [&_p]:!text-[#71809b]">
            <div>
              <div className="eyebrow text-caption tracking-[1.8px] font-650 text-[#929b8b] mb-[11px] !text-[#8892a5]">
                {page === "Overview"
                  ? "YOUR BUSINESS, IN MOTION"
                  : data.business.name.toUpperCase()}
              </div>
              <h1>{title}</h1>
              <p>
                {page === "Overview"
                  ? "Here’s what’s happening across your business today."
                  : {
                      Customers:
                        "People, preferences, and the context that matters.",
                      Schedule: "Keep your team and your customers in sync.",
                      "Team & tasks": "The right work, with the right people.",
                      Conversations:
                        "Thoughtful customer communication, ready for your review.",
                      Approvals: "You make the decisions that need a human.",
                      "Agent activity":
                        "Every request, decision, and outcome in one place.",
                      "Teach your AI":
                        "Add your knowledge, define its boundaries, and publish it for customers.",
                      "Team access":
                        "Control who can enter this workspace and what each person can do.",
                      Profile:
                        "Manage your account and business identity.",
                    }[page]}
              </p>
            </div>
            {canUseAgents && <button
              className="primary inline-flex items-center justify-center gap-2 bg-[var(--forest)] text-white border border-[var(--forest)] py-3 px-4 rounded-lg text-tiny font-500 whitespace-nowrap !bg-orange !border-orange !rounded-lg !text-xs !py-3 !px-4 !shadow-[0_3px_7px_#ff550b0b] [&:hover:not(:disabled)]:!shadow-[0_5px_15px_#ff550b25]"
              onClick={() => ask("")}
            >
              <Sparkles size={16} />
              Ask OperIQ{" "}
              <span className="shortcut py-[3px] px-1 border border-[#ffffff25] rounded-[3px] text-[#cad8c9] text-caption ml-[9px] desktop:hidden !text-[#fff2e8] !border-[#ffffff55]">
                ⌘ K
              </span>
            </button>}
          </div>
          {error && (
            <div className="error-banner p-3 bg-[#faeee7] text-[#ac7c63] rounded-md mb-5 !bg-[#ffefeb] !text-[#c44b2d]">
              {error}
            </div>
          )}
          {
            <Routes>
              <Route path="/app" element={<OverviewPage {...pageProps} />} />
              <Route
                path="/app/customers"
                element={allowedPages.includes("Customers") ? <CustomersPage {...pageProps} /> : <Navigate to="/app" replace />}
              />
              <Route
                path="/app/schedule"
                element={allowedPages.includes("Schedule") ? <SchedulePage {...pageProps} /> : <Navigate to="/app" replace />}
              />
              <Route
                path="/app/team-tasks"
                element={allowedPages.includes("Team & tasks") ? <TeamTasksPage {...pageProps} /> : <Navigate to="/app" replace />}
              />
              <Route
                path="/app/conversations"
                element={allowedPages.includes("Conversations") ? <ConversationsPage {...pageProps} /> : <Navigate to="/app" replace />}
              />
              <Route
                path="/app/approvals"
                element={allowedPages.includes("Approvals") ? <ApprovalsPage {...pageProps} /> : <Navigate to="/app" replace />}
              />
              <Route
                path="/app/agent-activity"
                element={allowedPages.includes("Agent activity") ? <AgentActivityPage {...pageProps} /> : <Navigate to="/app" replace />}
              />
              <Route
                path="/app/profile"
                element={allowedPages.includes("Profile") ? <ProfilePage {...pageProps} /> : <Navigate to="/app" replace />}
              />
              <Route
                path="/app/ai-setup"
                element={allowedPages.includes("Teach your AI") ? <AISetupPage {...pageProps} /> : <Navigate to="/app" replace />}
              />
              <Route path="/app/access" element={allowedPages.includes("Team access") ? <AccessPage {...pageProps} /> : <Navigate to="/app" replace />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          }
          {}
          {}
          {}
          {}
          {}
          {}
          {}
          <footer>
            <span>
              <span className="status-dot [display:inline-block] w-[5px] h-[5px] [flex-shrink:0] bg-[#8aa96b] rounded-full !bg-[#00a35b]" />
              All your operations. One clear view.
            </span>
            <span>Built with intention. Governed with ArmorIQ.</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div
          className="toast fixed bottom-[25px] left-[calc(50%_+_100px)] [transform:translateX(-50%)] z-[70] flex items-center gap-3 bg-[#203f30] text-[#f2f8e8] py-[15px] px-5 rounded-[9px] shadow-[0_8px_30px_#1c302830] text-xs max-w-[80vw] [&_button]:bg-transparent [&_button]:text-[#becdb1] [&_button]:flex tablet:left-1/2 phone:w-[90%] phone:max-w-[90vw] phone:bottom-[15px] phone:text-tiny !bg-[#142342] !text-white !shadow-[0_8px_35px_#11213c25] !rounded-[11px] [&_button]:!text-[#b9c4d7]"
          role="status"
        >
          <AlertCircle size={17} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop fixed [inset:0] bg-[#17271f66] [backdrop-filter:blur(5px)] z-[50] flex items-center justify-center p-5 !bg-[#111d3a66]"
          onClick={() => !busy && setModal(false)}
        >
          <section
            className="modal w-[590px] max-h-[90vh] overflow-auto p-[30px] bg-white border border-[#eef2e5] rounded-2xl shadow-[0_25px_100px_#152f2a25] [&_h2]:text-[26px] [&_h2]:tracking-[-1px] [&>p]:text-xs [&>p]:text-[#8f9b82] [&>p]:leading-loose [&>p]:mt-2.5 [&_textarea]:block [&_textarea]:mt-[9px] [&_textarea]:mx-0 [&_textarea]:mb-4 [&_textarea]:w-full [&_textarea]:min-h-[140px] [&_textarea]:resize-y [&_textarea]:bg-[#fafcf7] [&_textarea]:border [&_textarea]:border-[#e2e8d9] [&_textarea]:rounded-lg [&_textarea]:p-3.5 [&_textarea]:text-xs [&_textarea]:leading-loose [&_textarea]:text-[#526a43] phone:p-[22px] phone:[&_h2]:text-[23px] phone:[&_.workflow-tabs]:gap-1 !border-[#e9ecf3] !rounded-[18px] [&_h2]:!text-navy [&>p]:!text-[#75839c] [&_textarea]:!text-[#405675] [&_textarea]:!bg-[#fafbfe] [&_textarea]:!border-[#e4e9f2]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-top flex justify-between mb-5 [&_.sparkle-icon]:bg-[#edf4e2] [&_.sparkle-icon]:w-[45px] [&_.sparkle-icon]:h-[45px] [&_.sparkle-icon]:rounded-xl [&_.sparkle-icon]:!bg-[#fff0e2] [&_.sparkle-icon]:!text-orange">
              <span className="sparkle-icon inline-flex items-center justify-center text-[#759554] !text-orange">
                <Sparkles size={22} />
              </span>
              <button
                className="icon-button p-1 bg-[none] text-[#78847a] flex items-center justify-center"
                aria-label="Close dialog"
                disabled={busy}
                onClick={() => setModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="eyebrow text-caption tracking-[1.8px] font-650 text-[#929b8b] mb-[11px] !text-[#8892a5]">
              YOUR AI OPERATIONS TEAM
            </div>
            <h2 id="dialog-title">What needs to happen?</h2>
            <p>
              Give your team a goal. Keep control of the important decisions.
            </p>
            <div className="my-6 rounded-xl border border-[#e8ebf2] bg-[#f8f9fc] p-4">
              <span className="mb-3 block text-[10px] font-bold uppercase tracking-[1.3px] text-[#8792a7]">Try an activity</span>
              <div className="flex flex-wrap gap-2">
              {[
                ["enquiry", "Customer enquiry"],
                ["absence", "Staff disruption"],
                ["complaint", "Service recovery"],
                ["access", "Team onboarding"],
              ].map(([w, label]) => (
                <button
                  key={w}
                  disabled={busy}
                  className="rounded-full border border-[#e1e6ef] bg-white px-3 py-2 text-[10px] font-semibold text-[#66748e] transition hover:border-[#ffc9a8] hover:text-orange"
                  onClick={() => {
                    setGoal(prompts[w]);
                    setSelectedWorkflow(w);
                    setAskAnswer("");
                  }}
                >
                  {label}
                </button>
              ))}
              </div>
            </div>
            <label
              className="input-label text-2xs text-[#82926f] font-600 !text-[#536582]"
              htmlFor="goal"
            >
              Your request
            </label>
            <textarea
              id="goal"
              autoFocus
              value={goal}
              onChange={(e) => { setGoal(e.target.value); setAskAnswer(""); }}
              placeholder="Describe what you want OperIQ to handle…"
              disabled={busy}
            />
            {askAnswer && (
              <div className="mb-4 rounded-xl border border-[#dce9e1] bg-[#f3faf6] p-4 text-sm leading-6 text-[#244936]">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[1.2px] text-[#478262]">OperIQ answer</span>
                {askAnswer}
              </div>
            )}
            <div className="mode-note bg-[#f4f7ee] border border-[#e7eddc] p-3.5 flex items-start gap-2.5 rounded-[7px] text-2xs leading-loose text-[#94a082] [&_svg]:[flex-shrink:0] [&_svg]:mt-0.5 [&_svg]:text-[#89a16d] [&_strong]:block [&_strong]:text-tiny [&_strong]:text-[#687f50] [&_strong]:mb-1 !bg-[#fff8f1] !border-[#ffe5d0] !text-[#8d796d] [&_strong]:!text-[#a65429] [&_svg]:!text-orange">
              <ShieldCheck size={19} />
              <span>
                {data.integration.mode === "sandbox" ? (
                  <>
                    <strong>Sandbox rehearsal</strong>Runs a safe workflow using
                    the records currently in your workspace. No AI model or
                    ArmorIQ enforcement is claimed.
                  </>
                ) : (
                  <>
                    <strong>Live execution</strong>The model creates a plan and
                    permitted tools execute through ArmorIQ. Credentials and
                    registered MCP access are required.
                  </>
                )}
              </span>
            </div>
            <label className="probe-option flex items-center gap-2 text-2xs text-[#8b987d] my-[18px] mx-0 leading-loose [&_input]:[accent-color:#547740] !text-[#74829b] [&_input]:![accent-color:var(--orange)]">
              <input
                type="checkbox"
                checked={probe}
                disabled={data.integration.mode !== "live" || busy}
                onChange={(e) => setProbe(e.target.checked)}
              />
              Attempt an unplanned export to test real ArmorIQ enforcement
            </label>
            <button
              className="primary inline-flex items-center justify-center gap-2 bg-[var(--forest)] text-white border border-[var(--forest)] py-3 px-4 rounded-lg text-tiny font-500 whitespace-nowrap !bg-orange !border-orange !rounded-lg !text-xs !py-3 !px-4 !shadow-[0_3px_7px_#ff550b0b] [&:hover:not(:disabled)]:!shadow-[0_5px_15px_#ff550b25] run-button w-full p-3.5 [&_svg:last-child]:ml-[auto]"
              disabled={busy || goal.trim().length < 5}
              onClick={run}
            >
              {busy ? (
                <>
                  <span className="spinner w-[13px] h-[13px] [border:2px_solid_#ffffff50] [border-top-color:#fff] rounded-full [animation:spin_1s_linear_infinite]" />
                  Coordinating your workflow…
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  {selectedWorkflow === "auto" ? "Ask OperIQ" : "Run workflow"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
