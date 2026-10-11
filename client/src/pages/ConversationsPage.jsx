import React from "react";
import {
  Check,
  MessageSquare,
} from "lucide-react";
import { Empty } from "./components/Common.jsx";

export default function ConversationsPage(props) {
  const {
    data,
    customer,
    badge,
    avatar,
    action,
    start,
  } = props;
  return (
    <section className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4">
      <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
        <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
          Customer message drafts
        </span>
        <span className="pill text-micro tracking-[.7px] font-600 text-[#9ba393] border border-[#e7ebdf] rounded-sm py-[5px] px-1.5 whitespace-nowrap phone:text-[6px] phone:whitespace-normal phone:text-right phone:max-w-[145px] !bg-[#fff2e7] !text-[#6c6470] ![border:none] !rounded-md !text-micro">
          NO EXTERNAL MESSAGES SENT
        </span>
      </div>
      {data.messages.length === 0 ? (
        <Empty
          icon={MessageSquare}
          title="A thoughtful reply starts here"
          text="Run a workflow to prepare customer messages for review."
          button={() => start("enquiry")}
        />
      ) : (
        data.messages.map((m) => (
          <article
            className="message-card border-t border-[#e9eee1] py-[23px] px-0 [&_p]:text-13 [&_p]:leading-loose [&_p]:max-w-[700px] [&_p]:text-[#7d8d70] [&_p]:my-[18px] [&_p]:mx-0 phone:[&_.person-cell]:gap-2 !border-[#edf0f5] [&_p]:!text-[#667794]"
            key={m.id}
          >
            <div className="person-cell flex items-center gap-3 [&_strong]:text-[#465b3d] [&_strong]:text-xs phone:[&_strong]:text-2xs [&_strong]:!text-navy">
              {avatar(customer(m.customerId))}
              <strong>{customer(m.customerId)?.name}</strong>
              {badge(m.status)}
            </div>
            <p>{m.body}</p>
            {m.status === "Draft" && (
              <button
                className="secondary inline-flex items-center justify-center gap-1.5 bg-white text-[#47613b] border border-[#dce5d7] rounded-md py-2.5 px-3.5 text-xs !text-[#cf440a] !border-[#ffd9c3] !rounded-lg !bg-[#fffaf6] compact py-2 px-2.5 text-tiny"
                onClick={() => action(`/messages/${m.id}/review`, {})}
              >
                <Check size={14} />
                Mark reviewed
              </button>
            )}
          </article>
        ))
      )}
    </section>
  );
}
