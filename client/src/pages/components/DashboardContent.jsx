import { OverviewHero } from "./OverviewHero.jsx";
import { AlertCircle, Sparkles, X } from "lucide-react";
import { pageDescriptions } from "./dashboard-config.jsx";

function PausedAssistantBanner({ profile }) {
  if (profile?.platformStatus !== "paused") return null;
  return (
    <div
      className="mb-5 flex items-start gap-3 rounded-2xl border border-[#f3b9ad] bg-[#fff1ee] p-4 text-[#9f2f20] shadow-sm"
      role="alert"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ffdcd5]">
        <AlertCircle size={19} />
      </span>
      <div>
        <strong className="block text-sm">Business AI paused by OperIQ</strong>
        <p className="mt-1 text-xs leading-5 text-[#a44b3f]">
          Your public assistant and customer AI actions are temporarily
          unavailable.
          {profile.platformStatusReason
            ? ` Reason: ${profile.platformStatusReason}`
            : ""}
        </p>
        {profile.platformStatusChangedAt && (
          <small className="mt-1 text-[#a76a61]">
            Paused {new Date(profile.platformStatusChangedAt).toLocaleString()}
          </small>
        )}
      </div>
    </div>
  );
}

function PageHeader({ page, businessName, canUseAgents, onAsk }) {
  const overview = page === "Overview";
  return (
    <div className="page-heading flex items-center justify-between gap-5 mb-[30px] wide:mb-[38px] phone:items-start phone:flex-col phone:gap-[18px] !mt-4 !mx-0 !mb-[30px] [&_h1]:!text-[#0b1835] [&_h1]:!font-750 [&_h1]:!text-3xl [&_p]:!text-13 [&_p]:!text-[#71809b]">
      <div>
        <div className="eyebrow text-caption tracking-[1.8px] font-650 mb-[11px] text-[#8892a5]">
          {overview ? "YOUR BUSINESS, IN MOTION" : businessName.toUpperCase()}
        </div>
        <h1>{overview ? "A little clarity. A lot of progress." : page}</h1>
        <p className="mt-2.5">
          {overview
            ? "Here’s what’s happening across your business today."
            : pageDescriptions[page]}
        </p>
      </div>
      {canUseAgents && (
        <button
          className="primary inline-flex items-center justify-center gap-2 bg-orange text-white border border-orange rounded-lg text-xs py-3 px-4 shadow-[0_3px_7px_#ff550b0b]"
          onClick={onAsk}
        >
          <Sparkles size={16} /> Ask OperIQ{" "}
          <span className="shortcut py-[3px] px-1 border border-[#ffffff55] rounded-[3px] text-[#fff2e8] text-caption ml-[9px] desktop:hidden">
            ⌘ K
          </span>
        </button>
      )}
    </div>
  );
}

export function NotificationToast({ notice, onDismiss }) {
  if (!notice) return null;
  return (
    <div
      className="toast fixed bottom-[25px] left-[calc(50%_+_100px)] [transform:translateX(-50%)] z-[70] flex items-center gap-3 bg-[#142342] text-white py-[15px] px-5 rounded-[11px] shadow-[0_8px_35px_#11213c25] text-xs max-w-[80vw] tablet:left-1/2 phone:w-[90%] phone:max-w-[90vw] phone:bottom-[15px] phone:text-tiny"
      role="status"
    >
      <AlertCircle size={17} />
      {notice}
      <button
        className="bg-transparent text-[#b9c4d7] flex"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function DashboardContent({ controller, children }) {
  const { data, page, error, canUseAgents, ask, start } = controller;
  return (
    <div className="content max-w-[1660px] m-auto pt-[15px] px-10 pb-0 wide:pt-[7px] wide:px-[55px] laptop:pt-[15px] laptop:px-[26px] mobile:pt-[17px] mobile:px-4">
      <PausedAssistantBanner profile={data.aiProfile} />
      {page === "Overview" && (
        <OverviewHero
          user={data.user}
          onRequest={ask}
          onWorkflow={start}
          canUseAgents={canUseAgents}
        />
      )}
      <PageHeader
        page={page}
        businessName={data.business.name}
        canUseAgents={canUseAgents}
        onAsk={() => ask("")}
      />
      {error && (
        <div className="p-3 bg-[#ffefeb] text-[#c44b2d] rounded-md mb-5">
          {error}
        </div>
      )}
      {children}
      <footer>
        <span>
          <span className="status-dot inline-block w-[5px] h-[5px] shrink-0 bg-[#00a35b] rounded-full" />
          All your operations. One clear view.
        </span>
        <span>Built with intention. Governed with ArmorIQ.</span>
      </footer>
    </div>
  );
}
