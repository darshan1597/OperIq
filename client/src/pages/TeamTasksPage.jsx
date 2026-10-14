import React, { useState } from "react";
import { ListTodo, Plus, Users } from "lucide-react";
import { apiError } from "../api/client.js";
import { Empty } from "./components/Common.jsx";

export default function TeamTasksPage(props) {
  const {
    data,
    staff,
    avatar,
    action,
    api,
    setNotice,
    load,
  } = props;
  const [member,setMember]=useState({name:"",email:""});
  const addStaff=async(e)=>{e.preventDefault();try{await api("/staff",member);setMember({name:"",email:""});await load();setNotice("Team member added");}catch(error){setNotice(apiError(error));}};
  return (
    <>
      {["owner", "manager"].includes(data.user.role) && <form onSubmit={addStaff} className="mb-5 grid grid-cols-[1fr_1fr_auto] gap-3 rounded-xl border border-border bg-white p-4 compact:grid-cols-1"><input className="rounded-lg border border-border px-3 py-2.5 text-xs" placeholder="Staff name" value={member.name} onChange={e=>setMember({...member,name:e.target.value})}/><input className="rounded-lg border border-border px-3 py-2.5 text-xs" type="email" placeholder="Email" value={member.email} onChange={e=>setMember({...member,email:e.target.value})}/><button className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-xs font-semibold text-white"><Plus size={15}/>Add staff</button></form>}
      <div className="staff-grid grid grid-cols-3 gap-5 mb-[25px] tablet:gap-2.5 phone:[grid-template-columns:1fr]">
        {!data.staff.length && <section className="col-span-full card bg-white border border-border rounded-xl"><Empty icon={Users} title="No team members yet" text="Your staff directory will appear here after team members are added." /></section>}
        {data.staff.map((s) => (
          <section
            className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4 staff-card [&_.avatar]:w-11 [&_.avatar]:h-11 [&_h3]:text-[15px] [&_h3]:mt-3.5 [&_p]:text-xs [&_p]:text-[#8d9b81] [&_p]:mt-2 [&_p]:mx-0 [&_p]:mb-[15px] tablet:p-4 tablet:[&_h3]:text-13 [&_h3]:!text-navy [&_p]:!text-[#73809a]"
            key={s.id}
          >
            {avatar(s)}
            <h3>{s.name}</h3>
            <span className="my-3 inline-flex rounded-md bg-[#eef2f8] px-2.5 py-1.5 text-[10px] font-semibold capitalize text-[#51627f]">{s.role || "staff"}</span>
            <p className="mb-4 text-[11px] text-[#71809b]">Can perform all owner-listed services</p>
            <select
              aria-label={`${s.name} availability`}
              value={s.status}
              onChange={(e) =>
                action(
                  `/staff/${s.id}`,
                  {
                    status: e.target.value,
                  },
                  "PATCH",
                )
              }
            >
              <option>Available</option>
              <option>Unavailable</option>
            </select>
          </section>
        ))}
      </div>
      <div className="kanban grid grid-cols-3 gap-5 tablet:gap-2.5 phone:[grid-template-columns:1fr]">
        {["To do", "In progress", "Done"].map((status) => (
          <section
            className="kanban-column bg-[#edf1e7] rounded-[9px] p-[18px] min-h-[300px] [&>h3]:text-xs [&>h3]:flex [&>h3]:justify-between [&>h3]:mb-5 tablet:p-3 phone:min-h-[100px] !bg-[#f0f2f7] !rounded-xl !border !border-[#e7ebf1] [&>h3]:!text-[#2e4263]"
            key={status}
          >
            <h3>
              {status}
              <span className="count bg-[#f1f4ec] text-[#839476] text-2xs rounded-[5px] py-[3px] px-[7px] font-500 !bg-[#fff0e0] !text-[#ee590d] !rounded-md">
                {data.tasks.filter((t) => t.status === status).length}
              </span>
            </h3>
            {data.tasks
              .filter((t) => t.status === status)
              .map((t) => (
                <article
                  className="task-card bg-white border border-[#e2e9d8] rounded-[7px] p-[17px] mb-3 [&_h4]:text-xs [&_h4]:leading-relaxed [&_h4]:my-3 [&_h4]:mx-0 [&_small]:text-2xs [&_select]:block [&_select]:mt-[18px] [&_select]:w-full !border-[#e5eaf2] !rounded-[10px] [&_h4]:!text-navy"
                  key={t.id}
                >
                  <span className="task-label text-micro tracking-[1px] text-[#9ca98e] !text-[#ed681f]">
                    OPERATIONS
                  </span>
                  <h4>{t.title}</h4>
                  <small>{staff(t.assignedTo)?.name}</small>
                  <select
                    aria-label={`Status for ${t.title}`}
                    value={t.status}
                    onChange={(e) =>
                      action(
                        `/tasks/${t.id}`,
                        {
                          status: e.target.value,
                        },
                        "PATCH",
                      )
                    }
                  >
                    {["To do", "In progress", "Done"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </article>
              ))}
            {!data.tasks.some((task) => task.status === status) && <div className="py-8 text-center text-xs text-[#8591a7]"><ListTodo className="mx-auto mb-3 text-[#b0b8c7]" size={22}/><p>No {status.toLowerCase()} tasks.</p></div>}
          </section>
        ))}
      </div>
    </>
  );
}
