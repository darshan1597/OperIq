import React from "react";
import {
  ShieldCheck,
  Check,
  Activity,
  Download,
} from "lucide-react";
import { Empty } from "./components/Common.jsx";

export default function AgentActivityPage(props) {
  const {
    data,
    badge,
    start,
    api,
    setNotice,
  } = props;
  return (
    <>
      <section className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4">
        <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
          <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
            Workflow runs
          </span>
          <button
            className="text-button inline-flex items-center gap-1.5 bg-transparent p-0 text-[#829274] text-2xs whitespace-nowrap !text-[#f4510c] !text-tiny"
            onClick={async () => {
              try {
                const records = await api("/export");
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(records, null, 2)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "opsdesk-execution-records.json";
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                setNotice(e.message);
              }
            }}
          >
            <Download size={15} />
            Export records
          </button>
        </div>
        {!data.runs.length ? (
          <Empty
            icon={Activity}
            title="Your first workflow is waiting"
            text="Start with a customer enquiry, staff disruption, or complaint."
            button={() => start("enquiry")}
          />
        ) : (
          data.runs.map((r) => (
            <article
              className="run-card border-t border-[#e9eee1] py-[23px] px-0 flex gap-5 justify-between [align-items:start] [&_p]:text-[#8a987c] [&_p]:text-xs [&_p]:leading-loose [&_p]:mt-2.5 [&_p]:max-w-[650px] [&_h3]:text-13 [&_h3]:leading-loose [&_h3]:max-w-[750px] [&_.eyebrow]:text-micro phone:flex-col !border-[#edf0f5] [&_p]:!text-[#667794] [&_h3]:!text-navy"
              key={r.id}
            >
              <div>
                <span className="eyebrow text-caption tracking-[1.8px] font-650 text-[#929b8b] mb-[11px] !text-[#8892a5]">
                  {r.mode} ·{" "}
                  {new Date(r.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <h3>{r.goal}</h3>
                <p>{r.summary || r.error || "Preparing plan…"}</p>
              </div>
              {badge(r.status)}
            </article>
          ))
        )}
      </section>
      <section className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4 activity-card mt-[22px]">
        <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
          <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
            Execution timeline
          </span>
        </div>
        {data.events.map((e) => (
          <div
            className="event flex items-start gap-[15px] border-t border-[#edf0e6] py-5 px-0 [&>div]:[flex:1] [&_strong]:capitalize [&_strong]:text-xs [&_small]:mt-[7px] [&_small]:text-2xs [&_p]:mt-2.5 [&_p]:text-tiny [&_p]:text-[#8c987e] [&_p]:leading-loose [&_code]:block [&_code]:mt-2.5 [&_code]:[overflow-wrap:anywhere] [&_code]:text-2xs phone:gap-2.5 phone:[&_.badge]:text-[7px] phone:[&_p]:text-2xs !border-[#edf0f5] [&_strong]:!text-navy [&_p]:!text-[#72809b]"
            key={e.id}
          >
            <span
              className={`event-dot bg-[#edf4e2] text-[#86a46d] rounded-full w-6 h-6 grid place-items-center [&.blocked]:bg-[#f9ebe4] [&.blocked]:text-[#bc8d75] !bg-[#e7f6ed] !text-[#009956] [&.blocked]:!bg-[#ffe9eb] [&.blocked]:!text-[#ec3f49] ${e.status === "Blocked" ? "blocked" : ""}`}
            >
              {e.status === "Completed" ? (
                <Check size={14} />
              ) : (
                <ShieldCheck size={14} />
              )}
            </span>
            <div>
              <strong>{e.action.replaceAll("_", " ")}</strong>
              <small>
                {e.agent} · {e.source}
              </small>
              <p>{e.reason || e.explanation}</p>
              {e.delegationId && (
                <code>ArmorIQ delegation: {e.delegationId}</code>
              )}
            </div>
            {badge(e.status)}
          </div>
        ))}
      </section>
    </>
  );
}
