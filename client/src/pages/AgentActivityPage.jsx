import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, Check, Activity, Download, X } from "lucide-react";
import { Empty } from "./components/Common.jsx";

const visibleParams = (params = {}) => Object.fromEntries(
  Object.entries(params)
    .filter(([key]) => key !== "workspaceId" && !/email|phone|customerId|message/i.test(key))
    .map(([key, value]) => [key, typeof value === "string" && value.length > 120 ? `${value.slice(0, 117)}...` : value]),
);

const workflowState = (status) => ({
  Planning: "Planning the agent steps",
  Running: "Agents are executing this workflow",
  Held: "Waiting for ArmorIQ approval",
  "Waiting for owner approval": "Waiting for the business owner",
  Completed: "Every required step completed",
  Blocked: "ArmorIQ stopped the protected action",
  Failed: "The workflow could not finish",
  "Needs attention": "A step failed or was rejected",
}[status] || status);

export default function AgentActivityPage({ data, badge, start, api, setNotice }) {
  const [selectedRunId, setSelectedRunId] = useState(data.runs[0]?.id || "");
  const [timelineOpen, setTimelineOpen] = useState(false);

  useEffect(() => {
    if (!data.runs.some((run) => run.id === selectedRunId))
      setSelectedRunId(data.runs[0]?.id || "");
  }, [data.runs, selectedRunId]);

  useEffect(() => {
    if (!timelineOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => event.key === "Escape" && setTimelineOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [timelineOpen]);

  const selectedRun = data.runs.find((run) => run.id === selectedRunId) || data.runs[0];
  const timeline = useMemo(() => (data.events || [])
    .filter((event) => event.runId === selectedRun?.id)
    .sort((left, right) => {
      if (left.step && right.step && left.step !== right.step) return left.step - right.step;
      return String(left.createdAt).localeCompare(String(right.createdAt));
    }),
  [data.events, selectedRun?.id]);

  const workflowLabel = selectedRun?.workflow
    ? `${selectedRun.workflow.replaceAll("_", " ")} workflow`
    : "Agent workflow";

  const selectRun = (runId) => {
    setSelectedRunId(runId);
    setTimelineOpen(true);
  };

  const exportRecords = async () => {
    try {
      const records = await api("/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(records, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "operiq-execution-records.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(error.message);
    }
  };

  return <>
    <section className="card min-w-0 rounded-xl border border-[#e9ebf0] bg-white p-5 shadow-[0_2px_6px_#14213a02] mobile:p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div><h3 className="text-base font-bold text-navy">Workflow runs</h3><p className="mt-1 text-xs text-[#71809b]">Choose a run to inspect its complete agent and governance trail.</p></div>
        <button className="inline-flex items-center gap-1.5 bg-transparent p-0 text-[11px] text-[#f4510c]" onClick={exportRecords}><Download size={15}/> Export records</button>
      </div>
      {!data.runs.length ? <Empty icon={Activity} title="Your first workflow is waiting" text="Start with a customer enquiry, staff disruption, or complaint." button={() => start("enquiry")}/> : (
        <div className="space-y-2">
          {data.runs.map((run) => <article
            key={run.id}
            className={`flex items-start justify-between gap-5 rounded-xl border p-4 transition phone:flex-col ${selectedRun?.id === run.id ? "border-[#ffcba9] bg-[#fff8f3] shadow-sm" : "border-[#edf0f5] hover:bg-[#fafbfc]"}`}
          >
            <div className="min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#8892a5]">{run.mode} · {new Date(run.createdAt).toLocaleString()}</span>
              <h3 className="mt-2 text-[13px] font-semibold leading-6 text-navy">{run.goal}</h3>
              <p className="mt-1 text-xs leading-5 text-[#667794]">{run.summary || run.error || workflowState(run.status)}</p>
              {run.steps?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{run.steps.map((step, index) => <span key={`${step.action}-${index}`} className="rounded-lg border border-[#e5e9f0] bg-white px-2.5 py-2 text-[10px] font-semibold text-[#53627c]">{index + 1}. {step.agent} → {step.action.replaceAll("_", " ")}</span>)}</div>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 phone:items-start">
              {badge(run.status)}
              <button className="rounded-lg border border-[#ffd4bd] bg-white px-3 py-2 text-[10px] font-semibold text-[#e45112]" onClick={() => selectRun(run.id)}>
                View timeline
              </button>
            </div>
          </article>)}
        </div>
      )}
    </section>

    {timelineOpen && selectedRun && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09152eb8] p-6 backdrop-blur-sm mobile:p-3" onMouseDown={(event) => event.target === event.currentTarget && setTimelineOpen(false)}>
    <section role="dialog" aria-modal="true" aria-label="Workflow execution timeline" className="card max-h-[88vh] w-full max-w-5xl min-w-0 overflow-hidden rounded-2xl border border-[#e9ebf0] bg-white shadow-[0_30px_100px_#09152e55]">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0"><h3 className="text-base font-bold capitalize text-navy">{workflowLabel}</h3><p className="mt-1 max-w-3xl truncate text-xs text-[#71809b]">Customer input: {selectedRun.goal}</p></div>
        <div className="flex shrink-0 items-center gap-3"><div className="text-right"><div>{badge(selectedRun.status)}</div><small className="mt-1 text-[10px] text-[#71809b]">{workflowState(selectedRun.status)}</small></div><button aria-label="Close timeline" onClick={() => setTimelineOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e3e8f2] bg-[#f8f9fc] text-[#53627c]"><X size={17}/></button></div>
      </div>
      <div className="max-h-[calc(88vh-100px)] overflow-y-auto border-t border-[#edf0f5] px-5 pb-5">
      <div className="mt-5 rounded-xl border border-[#dfe6f0] bg-[#f7f9fc] px-4 py-3 text-xs leading-5 text-[#53627c]">
        {selectedRun.status === "Waiting for owner approval"
          ? "OperIQ checked the request and prepared the change. The appointment has not changed yet; it is waiting for the business owner to approve it."
          : workflowState(selectedRun.status)}
      </div>
      {timeline.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#dfe4ec] bg-[#fafbfc] p-6 text-center text-xs text-[#71809b]">{selectedRun.status === "Planning" ? "The agent is preparing the execution plan." : "No execution steps were recorded for this workflow."}</div>
      ) : <div>{timeline.map((event, index) => <div className="relative flex items-start gap-4 border-t border-[#edf0f5] py-5 first:border-t-0" key={event.id}>
        <span className={`z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full ${event.status === "Completed" ? "bg-[#e7f6ed] text-[#009956]" : event.status === "Blocked" || event.status === "Failed" ? "bg-[#ffe9eb] text-[#ec3f49]" : "bg-[#fff0de] text-[#d35009]"}`}>{event.status === "Completed" ? <Check size={14}/> : <ShieldCheck size={14}/>}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3"><div><strong className="block text-xs capitalize text-navy">Step {event.step || index + 1}: {event.action.replaceAll("_", " ")}</strong><small className="mt-1 block text-[10px] text-[#78849c]">{event.agent} agent · {event.source || "OperIQ"} · {new Date(event.createdAt).toLocaleString()}</small></div>{badge(event.status)}</div>
          <p className="mt-2 text-[11px] leading-5 text-[#72809b]">{event.reason || event.explanation || "No additional decision reason was supplied."}</p>
          <div className="mt-2 space-y-1 text-[10px] text-[#53627c]">
            {event.allowedActions?.length > 0 && <code className="block break-all">Delegated scope: {event.allowedActions.join(", ")}</code>}
            {event.params && Object.keys(visibleParams(event.params)).length > 0 && <code className="block break-all">Safe parameters: {JSON.stringify(visibleParams(event.params))}</code>}
            {event.requestId && <code className="block break-all">Execution request: {event.requestId}</code>}
            {event.delegationId && <code className="block break-all">ArmorIQ delegation: {event.delegationId}</code>}
            <code className="block">Result: {/ArmorIQ/i.test(event.source || "") ? (event.executed ? "protected tool executed" : "protected tool did not execute") : (event.status === "Completed" ? "step completed" : "step did not complete")}</code>
          </div>
          {selectedRun.status === "Waiting for owner approval" && event.step === event.totalSteps && event.status === "Completed" && <p className="mt-3 rounded-lg border border-[#cfdced] bg-[#f2f7fd] px-3 py-2 text-[11px] text-[#365b86]">This step created the reschedule proposal only. The existing booking remains unchanged until the owner approves it.</p>}
          {event.status === "Held" && <p className="mt-3 rounded-lg border border-[#ffd8bd] bg-[#fff6ee] px-3 py-2 text-[11px] text-[#a64b20]">Waiting for an ArmorIQ approval decision. The workflow will continue from this step after approval.</p>}
        </div>
      </div>)}</div>}
      </div>
    </section>
    </div>, document.body)}
  </>;
}
