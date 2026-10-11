import React from "react";
import {
  ShieldCheck,
} from "lucide-react";
import { Empty } from "./components/Common.jsx";

export default function ApprovalsPage(props) {
  const {
    data,
    customer,
    badge,
    action,
    start,
  } = props;
  return (
    <section className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4">
      <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
        <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
          Owner decisions
        </span>
        <span className="pill text-micro tracking-[.7px] font-600 text-[#9ba393] border border-[#e7ebdf] rounded-sm py-[5px] px-1.5 whitespace-nowrap phone:text-[6px] phone:whitespace-normal phone:text-right phone:max-w-[145px] !bg-[#fff2e7] !text-[#6c6470] ![border:none] !rounded-md !text-micro">
          SANDBOX COMPENSATION · NO PAYMENTS
        </span>
      </div>
      <p className="section-description text-[#96a288] text-tiny leading-loose my-[15px] mx-0 !text-[#74829c]">
        These are application approval requests. ArmorIQ holds appear separately
        in Agent activity and must be resolved in ArmorIQ.
      </p>
      {!data.approvals.length ? (
        <Empty
          icon={ShieldCheck}
          title="You’re all caught up"
          text="Compensation requests will appear here when a resolution workflow needs your decision."
          button={() => start("complaint")}
        />
      ) : (
        data.approvals.map((a) => (
          <article
            className="approval-card border-t border-[#e9eee1] py-[23px] px-0 flex gap-5 justify-between [align-items:start] [&_h3]:text-lg [&_p]:text-[#8a987c] [&_p]:text-xs [&_p]:leading-loose [&_p]:mt-2.5 [&_p]:max-w-[650px] [&_.button-row]:mt-[15px] phone:flex-col !border-[#edf0f5] [&_p]:!text-[#667794] [&_h3]:!text-navy"
            key={a.id}
          >
            <div>
              <span className="eyebrow text-caption tracking-[1.8px] font-650 text-[#929b8b] mb-[11px] !text-[#8892a5]">
                {a.type}
              </span>
              <h3>
                ₹{a.amount} · {customer(a.customerId)?.name}
              </h3>
              <p>{a.reason}</p>
              {a.result && <small>{a.result}</small>}
            </div>
            <div>
              {badge(a.status)}
              {a.status === "Pending" && (
                <div className="button-row flex gap-2.5 items-center">
                  <button
                    className="secondary inline-flex items-center justify-center gap-1.5 bg-white text-[#47613b] border border-[#dce5d7] rounded-md py-2.5 px-3.5 text-xs !text-[#cf440a] !border-[#ffd9c3] !rounded-lg !bg-[#fffaf6] compact py-2 px-2.5 text-tiny"
                    onClick={() =>
                      action(`/approvals/${a.id}/decision`, {
                        decision: "Rejected",
                      })
                    }
                  >
                    Reject
                  </button>
                  <button
                    className="primary inline-flex items-center justify-center gap-2 bg-[var(--forest)] text-white border border-[var(--forest)] py-3 px-4 rounded-lg text-tiny font-500 whitespace-nowrap !bg-orange !border-orange !rounded-lg !text-xs !py-3 !px-4 !shadow-[0_3px_7px_#ff550b0b] [&:hover:not(:disabled)]:!shadow-[0_5px_15px_#ff550b25] compact py-2 px-2.5 text-tiny"
                    onClick={() =>
                      action(`/approvals/${a.id}/decision`, {
                        decision: "Approved",
                      })
                    }
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
