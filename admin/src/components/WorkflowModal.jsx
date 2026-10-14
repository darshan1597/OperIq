import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Clock3, TriangleAlert, X } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";

const date = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

export default function WorkflowModal({ workflow, close }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => event.key === "Escape" && close();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [close]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09152eb8] p-6 backdrop-blur-sm max-sm:p-3"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-[#dfe4ec] bg-white shadow-[0_30px_100px_#09152e66]"
        role="dialog"
        aria-modal="true"
        aria-label="Administrator workflow timeline"
      >
        <header className="flex items-start justify-between gap-5 border-b border-[#e7ebf1] p-6">
          <div>
            <span className="text-[9px] font-black uppercase tracking-[1.7px] text-[#f05a12]">
              {workflow.businessName}
            </span>
            <h2 className="my-1.5 text-xl font-bold capitalize">
              {String(workflow.workflow || "agent").replaceAll("_", " ")}{" "}
              workflow
            </h2>
            <p className="m-0 text-[11px] text-[#71809b]">
              Privacy-safe agent and ArmorIQ execution metadata.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={workflow.status} />
            <button
              onClick={close}
              aria-label="Close timeline"
              className="grid h-10 w-10 place-items-center rounded-xl border border-[#dfe4ec] bg-[#f7f9fc] text-[#53627c]"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="mx-6 mt-5 grid gap-3 rounded-xl border border-[#dfe6f0] bg-[#f7f9fc] px-4 py-3 text-[11px] leading-5 text-[#53627c] sm:grid-cols-2">
          <div>
            <strong className="block text-[9px] uppercase tracking-wide text-[#8793a7]">
              Outcome
            </strong>
            {workflow.status === "Waiting for owner approval"
              ? "OperIQ prepared the change. No business record changes until the owner approves it."
              : workflow.summary || `Workflow status: ${workflow.status}`}
          </div>
          {workflow.events[0]?.targetBusinessName && (
            <div>
              <strong className="block text-[9px] uppercase tracking-wide text-[#8793a7]">
                Target business
              </strong>
              {workflow.events[0].targetBusinessName}
            </div>
          )}
          {workflow.events[0]?.explanation && (
            <div className="sm:col-span-2">
              <strong className="block text-[9px] uppercase tracking-wide text-[#8793a7]">
                Requested operation
              </strong>
              {workflow.events[0].explanation}
            </div>
          )}
        </div>
        <div className="max-h-[calc(88vh-170px)] overflow-y-auto px-6 pb-6 pt-1">
          {workflow.events.length === 0 ? (
            <div className="grid min-h-48 place-items-center text-xs text-[#8995a8]">
              No execution steps were recorded.
            </div>
          ) : (
            workflow.events.map((event, index) => (
              <article
                className="grid grid-cols-[30px_1fr] gap-3 border-b border-[#edf0f4] py-[18px] last:border-0"
                key={event.id}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full ${event.status === "Completed" ? "bg-[#e9f7ef] text-[#15784b]" : ["Blocked", "Failed"].includes(event.status) ? "bg-[#fff0f1] text-[#b93f4a]" : "bg-[#fff0df] text-[#d4580e]"}`}
                >
                  {event.status === "Completed" ? (
                    <CheckCircle2 size={15} />
                  ) : event.status === "Held" ? (
                    <Clock3 size={15} />
                  ) : (
                    <TriangleAlert size={15} />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-xs capitalize">
                      Step {event.step || index + 1}:{" "}
                      {String(event.action || "action").replaceAll("_", " ")}
                    </strong>
                    <StatusBadge status={event.status} />
                  </div>
                  <small className="mt-1 block text-[9px] text-[#7a879b]">
                    {event.agent} agent · {event.source || "OperIQ"} ·{" "}
                    {date(event.createdAt)}
                  </small>
                  {event.targetBusinessName && (
                    <p className="mb-0 mt-2 text-[11px] font-bold text-[#34455f]">
                      Target: {event.targetBusinessName}
                    </p>
                  )}
                  <p className="my-2.5 text-[11px] leading-5 text-[#64738b]">
                    Policy decision:{" "}
                    {event.reason ||
                      "No additional decision reason was supplied."}
                  </p>
                  {event.delegationId && (
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-[9px] font-extrabold">
                      <span className="rounded-full bg-[#fff0df] px-2 py-1 text-[#d4580e]">
                        1. Held
                      </span>
                      <span className="text-[#9aa5b6]">→</span>
                      {event.resumedAt ? (
                        <>
                          <span className="rounded-full bg-[#eef2f8] px-2 py-1 text-[#52627a]">
                            2. Approved
                          </span>
                          <span className="text-[#9aa5b6]">→</span>
                          <span className="rounded-full bg-[#e9f7ef] px-2 py-1 text-[#15784b]">
                            3. Resumed and executed
                          </span>
                        </>
                      ) : (
                        <span className="rounded-full bg-[#eef2f8] px-2 py-1 text-[#52627a]">
                          Waiting for decision
                        </span>
                      )}
                    </div>
                  )}
                  <div className="space-y-1 text-[9px] text-[#52627a]">
                    <code className="block break-all">
                      Final result:{" "}
                      {event.executed
                        ? "protected tool executed"
                        : "protected tool did not execute"}
                    </code>
                    {event.requestId && (
                      <code className="block break-all">
                        Request: {event.requestId}
                      </code>
                    )}
                    {event.delegationId && (
                      <code className="block break-all">
                        Delegation: {event.delegationId}
                      </code>
                    )}
                    {event.resumedAt && (
                      <code className="block">
                        Approved execution resumed: {date(event.resumedAt)}
                      </code>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
