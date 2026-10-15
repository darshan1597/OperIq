import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Empty } from "./components/Common.jsx";

export default function ApprovalsPage({
  data,
  customer,
  staff,
  badge,
  action,
  start,
}) {
  const [processingId, setProcessingId] = useState(null);
  useEffect(() => {
    if (!processingId) return undefined;
    const current = data.approvals.find((item) => item.id === processingId);
    if (current?.executionStatus === "Completed") setProcessingId(null);
    const timer = setTimeout(() => setProcessingId(null), 12000);
    return () => clearTimeout(timer);
  }, [data.approvals, processingId]);
  const decide = async (approval, decision) => {
    if (decision === "Approved") setProcessingId(approval.id);
    await action(`/approvals/${approval.id}/decision`, { decision });
    if (decision === "Rejected") setProcessingId(null);
  };
  const executionTypes = new Set([
    "Team invitation",
    "Booking cancellation",
    "Booking reschedule",
    "Schedule conflict resolution",
  ]);
  const actionLabel = (approval) => {
    if (approval.status === "Approved") return "Retry execution";
    if (approval.type === "Team invitation") return "Approve and send";
    if (approval.type === "Booking cancellation") return "Approve cancellation";
    if (approval.type === "Booking reschedule") return "Approve reschedule";
    if (approval.type === "Schedule conflict resolution")
      return "Approve resolution";
    return "Approve";
  };
  return (
    <section className="card min-w-0 rounded-xl border border-[#e9ebf0] bg-white p-5 shadow-[0_2px_6px_#14213a02] mobile:p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-navy wide:text-[15px]">
          Owner decisions
        </span>
        <span className="rounded-md bg-[#fff2e7] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[.7px] text-[#6c6470]">
          Workspace approvals
        </span>
      </div>
      <p className="my-4 text-xs leading-6 text-[#74829c]">
        Review decisions for your workspace. Approved AI proposals execute only
        after ArmorIQ authorizes the matching MCP action.
      </p>
      {!data.approvals.length ? (
        <Empty
          icon={ShieldCheck}
          title="You're all caught up"
          text="AI proposals will appear here when an action needs a workspace decision."
          button={() => start("complaint")}
        />
      ) : (
        data.approvals.map((approval) => {
          const expired =
            approval.expiresAt && Date.parse(approval.expiresAt) <= Date.now();
          const processing =
            processingId === approval.id ||
            approval.executionStatus === "Executing";
          return (
            <article
              className="flex items-start justify-between gap-5 border-t border-[#edf0f5] py-6 mobile:flex-col"
              key={approval.id}
            >
              <div className="min-w-0 flex-1">
                <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[1.5px] text-[#8892a5]">
                  {approval.type}
                </span>
                {approval.type === "Team invitation" ? (
                  <>
                    <h3 className="text-lg font-bold text-navy">
                      {approval.members.length} proposed team invitation
                      {approval.members.length === 1 ? "" : "s"}
                    </h3>
                    <div className="mt-3 space-y-2">
                      {approval.members.map((member) => (
                        <div
                          key={member.email}
                          className="flex items-center justify-between gap-4 rounded-lg border border-[#edf0f5] bg-[#fbfcfe] px-3 py-2.5"
                        >
                          <span className="truncate text-xs font-semibold text-navy">
                            {member.email}
                          </span>
                          <span className="shrink-0 rounded-md bg-[#fff1e7] px-2 py-1 text-[10px] font-semibold capitalize text-orange">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 max-w-2xl text-xs leading-6 text-[#667794]">
                      Prepared by OperIQ AI. No account or email is created
                      until the owner approves and ArmorIQ authorizes execution.
                    </p>
                  </>
                ) : [
                    "Booking cancellation",
                    "Booking reschedule",
                    "Schedule conflict resolution",
                  ].includes(approval.type) ? (
                  (() => {
                    const booking = data.appointments.find(
                      (item) => item.id === approval.bookingId,
                    );
                    return (
                      <>
                        <h3 className="text-lg font-bold text-navy">
                          {approval.type === "Booking cancellation"
                            ? "Cancel"
                            : approval.type === "Schedule conflict resolution"
                              ? "Resolve conflict for"
                              : "Reschedule"}{" "}
                          {booking?.service || "booking"}
                        </h3>
                        <p className="mt-2 text-xs leading-6 text-[#667794]">
                          {booking?.customer ||
                            customer(booking?.customerId)?.name ||
                            "Customer"}{" "}
                          · Current appointment:{" "}
                          {booking?.date || "Unknown date"} at{" "}
                          {booking?.time || "Unknown time"}
                        </p>
                        {[
                          "Booking reschedule",
                          "Schedule conflict resolution",
                        ].includes(approval.type) && (
                          <p className="mt-2 rounded-lg border border-[#edf0f5] bg-[#fbfcfe] px-3 py-2.5 text-xs font-semibold text-navy">
                            Proposed time: {approval.date} at {approval.time}
                            {approval.type === "Schedule conflict resolution" &&
                            approval.staffId
                              ? ` with ${staff(approval.staffId)?.name || "available staff"}`
                              : ""}
                          </p>
                        )}
                        {approval.reason && (
                          <p className="mt-2 text-xs leading-6 text-[#667794]">
                            Reason: {approval.reason}
                          </p>
                        )}
                        <p className="mt-3 max-w-2xl text-xs leading-6 text-[#667794]">
                          The booking changes only after owner approval and
                          ArmorIQ authorization.
                        </p>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-navy">
                      ₹{approval.amount} · {customer(approval.customerId)?.name}
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-[#667794]">
                      {approval.reason}
                    </p>
                  </>
                )}
                {approval.result && (
                  <small className="mt-3 block text-[11px] text-[#71809b]">
                    {approval.result}
                  </small>
                )}
                {approval.armorDecision && (
                  <small className="mt-1 block text-[11px] text-[#71809b]">
                    ArmorIQ execution: {approval.armorDecision}
                  </small>
                )}
              </div>
              <div className="shrink-0 mobile:w-full">
                {badge(
                  expired
                    ? "Expired"
                    : processing
                      ? "Processing"
                      : approval.status,
                )}
                {!expired &&
                  !processing &&
                  (approval.status === "Pending" ||
                    (executionTypes.has(approval.type) &&
                      approval.status === "Approved" &&
                      approval.executionStatus !== "Completed")) && (
                    <div className="mt-4 flex items-center gap-2.5">
                      {approval.status === "Pending" && (
                        <button
                          className="rounded-lg border border-[#ffd9c3] bg-[#fffaf6] px-3 py-2.5 text-xs text-[#cf440a]"
                          onClick={() => decide(approval, "Rejected")}
                        >
                          Reject
                        </button>
                      )}
                      <button
                        className="rounded-lg border border-orange bg-orange px-4 py-3 text-xs font-semibold text-white shadow-[0_3px_7px_#ff550b0b] hover:shadow-[0_5px_15px_#ff550b25]"
                        onClick={() => decide(approval, "Approved")}
                      >
                        {actionLabel(approval)}
                      </button>
                    </div>
                  )}
                {approval.status === "Awaiting customer" && (
                  <p className="max-w-[210px] text-right text-[11px] leading-5 text-[#71809b]">
                    OperIQ proposed a valid replacement. Waiting for the
                    customer to confirm it.
                  </p>
                )}
                {processing && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#fff2e8] px-4 py-3 text-xs font-semibold text-[#cf440a]">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#ffb98f] border-t-orange" />
                    Approving and executing…
                  </div>
                )}
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
