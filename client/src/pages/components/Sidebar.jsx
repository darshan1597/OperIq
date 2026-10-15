import { useState } from "react";
import { Activity, CalendarDays, ChevronDown, KeyRound, LayoutDashboard, ListTodo, LogOut, Menu, MessageSquare, ShieldCheck, Sparkles, UserRound, Users, X } from "lucide-react";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const goTo = (name) => {
    navigate(name);
    setMobileOpen(false);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        className="fixed left-4 top-[13px] z-50 hidden h-10 w-10 place-items-center rounded-xl border border-[#e4e8ef] bg-white text-navy shadow-sm mobile:grid"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 hidden bg-[#0b183566] backdrop-blur-[2px] mobile:block"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}
    <aside className={`sidebar fixed [inset:0_auto_0_0] z-40 flex w-[238px] flex-col overflow-y-auto border-r border-border bg-white px-[19px] pb-[18px] pt-8 transition-transform duration-200 desktop:w-[205px] desktop:px-[15px] tablet:w-18 tablet:px-3 tablet:pb-[15px] tablet:pt-6 mobile:!inset-y-0 mobile:!left-0 mobile:!h-screen mobile:!w-[min(84vw,300px)] mobile:!overflow-y-auto mobile:!border-r mobile:!bg-white mobile:!px-4 mobile:!pb-5 mobile:!pt-16 mobile:[&_nav_button]:!h-11 mobile:[&_nav_button]:!w-full mobile:[&_nav_button]:!justify-start mobile:[&_nav_button]:!gap-3 mobile:[&_nav_button]:!px-3 mobile:[&_nav_button]:!text-[13px] ${mobileOpen ? "mobile:!translate-x-0" : "mobile:!-translate-x-full"} !w-[250px] !bg-[#ffffffed] !px-[21px] !pb-[18px] !pt-6 wide:!w-[260px] wide:!px-[22px] wide:!py-[23px] laptop:!w-[220px] laptop:!px-4 tablet:!w-18 tablet:!px-3 tablet:!pb-[15px] tablet:!pt-6 mobile:!w-[min(84vw,300px)] mobile:!px-4 mobile:!pb-5 mobile:!pt-16`}>
      <a
        className="brand flex items-center gap-2.5 font-display text-[27px] font-800 tracking-[-1.3px] mt-0 mx-[13px] mb-[34px] tablet:text-[0] tablet:mt-0 tablet:mx-1.5 tablet:mb-[30px] tablet:gap-0 mobile:!flex mobile:!gap-2.5 mobile:!text-[28px] !font-ui !text-[#09152e] !text-[28px] !tracking-[-1.5px] !mt-0 !mx-[3px] !mb-4 tablet:!text-[0] tablet:!mt-0 tablet:!mx-[5px] tablet:!mb-[25px] mobile:!mx-1 mobile:!mb-5 mobile:!text-[28px]"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          goTo("Overview");
        }}
      >
        <BrandWordmark />
      </a>
      <button
        className="workspace flex items-center gap-2.5 w-full py-3 px-[9px] border border-border rounded-[9px] bg-white text-left text-[#2c3c34] mb-[33px] [&>span:nth-child(2)]:[flex:1] [&_strong]:text-xs [&_small]:text-2xs [&_small]:mt-1 tablet:hidden mobile:!flex !py-[13px] !px-[9px] !rounded-[11px] !mb-3 [&_strong]:!text-xs [&_strong]:!text-navy [&_small]:!text-[#738099] [&_small]:!text-tiny"
        onClick={() => goTo(data.user.role === "owner" ? "Profile" : "Overview")}
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
      <nav className="mobile:!flex mobile:!w-full mobile:!flex-col mobile:!items-stretch mobile:!gap-1">
        {navigation.filter(([name]) => allowedPages.includes(name)).map(([name, Icon]) => (
          <button
            key={name}
            title={name}
            aria-label={name}
            aria-current={page === name ? "page" : undefined}
            className={page === name ? "active" : ""}
            onClick={() => goTo(name)}
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
          onClick={() => { setMobileOpen(false); logout(); }}
          aria-label="Log out"
        >
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </aside>
    </>
  );
}
