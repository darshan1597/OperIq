import { Bell } from "lucide-react";
import { GlobalSearch } from "./OverviewHero.jsx";

export default function DashboardHeader({ data, page, pending, navigate }) {
  return (
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
  );
}
