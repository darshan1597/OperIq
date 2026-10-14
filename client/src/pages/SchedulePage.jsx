import React from "react";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { Empty, SearchBox } from "./components/Common.jsx";

export default function SchedulePage(props) {
  const {
    appointments,
    customer,
    staff,
    badge,
    action,
    query,
    setQuery,
    start,
  } = props;
  return (
    <section className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4">
      <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
        <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
          Appointments
        </span>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#ffd9c3] bg-[#fffaf6] px-3 py-2.5 text-xs font-semibold text-[#cf440a]" onClick={() => start("conflict")}>
            <ShieldCheck size={15} /> Scan conflicts
          </button>
          <SearchBox query={query} setQuery={setQuery} />
        </div>
      </div>
      {!appointments.length ? <Empty icon={CalendarDays} title={query ? "No appointments match your search" : "No appointments scheduled"} text={query ? "Try searching with a different customer, service, or date." : "Appointments will appear here after they are added or proposed."} /> : <div className="table-scroll overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Date & time</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Staff</th>
              <th>Status</th>
              <th>Customer response · sandbox</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((b) => (
              <tr key={b.id}>
                <td>
                  <strong>{b.time}</strong>
                  <small>{b.date}</small>
                </td>
                <td>{customer(b.customerId)?.name}</td>
                <td>{b.service}</td>
                <td>{staff(b.staffId)?.name}</td>
                <td>{badge(b.status)}</td>
                <td>
                  {b.status === "Awaiting customer" ? (
                    <div className="button-row flex gap-2.5 items-center">
                      <button
                        className="secondary inline-flex items-center justify-center gap-1.5 bg-white text-[#47613b] border border-[#dce5d7] rounded-md py-2.5 px-3.5 text-xs !text-[#cf440a] !border-[#ffd9c3] !rounded-lg !bg-[#fffaf6] compact py-2 px-2.5 text-tiny"
                        onClick={() =>
                          action(`/appointments/${b.id}/respond`, {
                            accept: true,
                          })
                        }
                      >
                        Accept
                      </button>
                      <button
                        className="text-button inline-flex items-center gap-1.5 bg-transparent p-0 text-[#829274] text-2xs whitespace-nowrap !text-[#f4510c] !text-tiny"
                        onClick={() =>
                          action(`/appointments/${b.id}/respond`, {
                            accept: false,
                          })
                        }
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span className="muted text-[#9ba391] text-caption tracking-[1px] !text-[#8a95ab]">
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  );
}
