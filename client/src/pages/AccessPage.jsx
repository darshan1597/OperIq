import React, { useEffect, useState } from "react";
import { KeyRound, MailCheck, Trash2, UserCog } from "lucide-react";
import { apiError } from "../api/client.js";

const roleCopy = {
  owner: "Full workspace control",
  manager: "Operations, workflows, approvals, and reports",
  receptionist: "Customers, schedules, messages, and bookings",
  staff: "Schedule, assigned work, and availability",
};

export default function AccessPage({ api, setNotice, start, data }) {
  const [members, setMembers] = useState([]);
  const refresh = async () => {
    try {
      setMembers((await api("/members")).members);
    } catch (error) {
      setNotice(apiError(error));
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  const changeRole = async (id, role) => {
    try {
      await api(`/members/${id}`, { role }, "PATCH");
      await refresh();
      setNotice("Member role updated");
    } catch (error) {
      setNotice(apiError(error));
    }
  };
  const remove = async (id) => {
    try {
      await api(`/members/${id}`, {}, "DELETE");
      await refresh();
      setNotice("Dashboard access removed");
    } catch (error) {
      setNotice(apiError(error));
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-6 compact:grid-cols-1">
      <section className="rounded-2xl border border-border bg-white p-6 mobile:p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0e5] text-orange">
            <UserCog size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-navy">
              People with dashboard access
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#71809b]">
              Roles are enforced by the API. Changing the interface cannot
              bypass them.
            </p>
          </div>
          <button
            onClick={() => start("access")}
            className="rounded-xl bg-orange px-4 py-3 text-xs font-semibold text-white"
          >
            Ask AI to onboard
          </button>
        </div>
        <div className="mt-6 divide-y divide-[#edf0f5]">
          {members.map((member) => (
            <article
              key={member.id}
              className="flex items-center gap-4 py-4 mobile:flex-col mobile:items-start"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eef2f8] text-xs font-bold text-navy">
                {member.name
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-navy">
                  {member.name}
                </strong>
                <span className="block truncate text-[11px] text-[#74829a]">
                  {member.email}
                </span>
                <small className="mt-1 block text-[10px] text-[#929bad]">
                  {roleCopy[member.role]}
                </small>
              </div>
              {member.role === "owner" ? (
                <span className="rounded-lg bg-[#fff1e7] px-3 py-2 text-[10px] font-bold uppercase text-orange">
                  Owner
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(event) =>
                      changeRole(member.id, event.target.value)
                    }
                    className="rounded-lg border border-[#dfe4ed] bg-white px-3 py-2 text-xs text-navy"
                  >
                    <option value="manager">Manager</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="staff">Staff</option>
                  </select>
                  <button
                    onClick={() => remove(member.id)}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-[#ffd8d8] text-[#d34d55]"
                    aria-label={`Remove ${member.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
        {data.invitations?.length > 0 && (
          <div className="mt-7">
            <h3 className="text-sm font-bold text-navy">Invitations</h3>
            <div className="mt-3 divide-y divide-[#edf0f5] rounded-xl border border-[#e5e9f0] px-4">
              {data.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-navy">
                      {invitation.email}
                    </strong>
                    <span className="mt-1 block text-[10px] capitalize text-[#71809b]">
                      {invitation.role} · {invitation.status} · Email{" "}
                      {invitation.deliveryStatus || "not sent"}
                    </span>
                    {invitation.deliveryStatus === "Failed" && (
                      <small className="mt-1 block text-[10px] text-[#c14c4c]">
                        {invitation.deliveryError}
                      </small>
                    )}
                  </div>
                  {invitation.status === "Pending" && invitation.token && (
                    <button
                      onClick={() =>
                        navigator.clipboard
                          .writeText(
                            `${window.location.origin}/invite/${invitation.token}`,
                          )
                          .then(() => setNotice("Invitation link copied"))
                      }
                      className="rounded-lg border border-[#ffd7bd] bg-[#fff8f2] px-3 py-2 text-[10px] font-semibold text-orange"
                    >
                      Copy invite link
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <aside className="h-fit rounded-2xl border border-[#ffe0cc] bg-[#fff9f5] p-5">
        <div className="flex items-center gap-3">
          <KeyRound className="text-orange" size={21} />
          <div>
            <h3 className="text-sm font-bold text-navy">Governed onboarding</h3>
            <p className="mt-1 text-[10px] leading-5 text-[#7b8799]">
              New dashboard access is created only through an approved
              invitation.
            </p>
          </div>
        </div>
        <ol className="mt-5 space-y-3 text-[11px] leading-5 text-[#66758e]">
          <li className="rounded-xl bg-white p-3">
            <strong className="block text-navy">1. Ask the Access agent</strong>
            Provide the email addresses and any roles you want to assign.
          </li>
          <li className="rounded-xl bg-white p-3">
            <strong className="block text-navy">2. Approve in ArmorIQ</strong>
            The database and Gmail action remain held until authorization.
          </li>
          <li className="rounded-xl bg-white p-3">
            <strong className="flex items-center gap-2 text-navy">
              <MailCheck size={14} className="text-orange" />
              3. Invitations are emailed
            </strong>
            Each person creates their own password from a seven-day secure link.
          </li>
        </ol>
      </aside>
    </div>
  );
}
