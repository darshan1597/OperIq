import { Activity, CalendarDays, ChevronDown, KeyRound, LayoutDashboard, ListTodo, LogOut, MessageSquare, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";
import { BrandWordmark } from "./Brand.jsx";

export const navigation = [
  ["Overview", LayoutDashboard], ["Customers", Users], ["Schedule", CalendarDays],
  ["Team & tasks", ListTodo], ["Conversations", MessageSquare], ["Approvals", ShieldCheck],
  ["Agent activity", Activity], ["Teach your AI", Sparkles], ["Team access", KeyRound], ["Profile", UserRound],
];

export const pagesByRole = {
  owner: navigation.map(([name]) => name),
  manager: ["Overview", "Customers", "Schedule", "Team & tasks", "Conversations", "Approvals", "Agent activity"],
  receptionist: ["Overview", "Customers", "Schedule", "Team & tasks", "Conversations"],
  staff: ["Overview", "Schedule", "Team & tasks"],
};

export default function Sidebar({ data, page, pending, allowedPages, navigate, logout }) {
  return (
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
  );
}
