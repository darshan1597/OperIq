import React, { useState } from "react";
import { ArrowUpRight, Plus, Users } from "lucide-react";
import { apiError } from "../api/client.js";
import { Empty, SearchBox } from "./components/Common.jsx";

export default function CustomersPage(props) {
  const {
    data,
    filtered,
    badge,
    avatar,
    setGoal,
    setModal,
    query,
    setQuery,
    api,
    setNotice,
    load,
  } = props;
  const [form, setForm] = useState({ name: "", email: "", service: "" });
  const add = async (e) => {
    e.preventDefault();
    try {
      await api("/customers", form);
      setForm({ name: "", email: "", service: "" });
      await load();
      setNotice("Customer added");
    } catch (error) {
      setNotice(apiError(error));
    }
  };
  const customers = filtered(data.customers);
  return (
    <section className="card bg-white border border-border rounded-lg p-5 min-w-0 phone:p-4 !rounded-xl !p-5 !border-[#e9ebf0] !shadow-[0_2px_6px_#14213a02] mobile:!p-4">
      <form
        onSubmit={add}
        className="mb-5 grid grid-cols-[1fr_1fr_1fr_auto] gap-3 rounded-xl bg-[#f8f9fc] p-3 compact:grid-cols-1"
      >
        <input
          className="rounded-lg border border-border px-3 py-2.5 text-xs"
          placeholder="Customer name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="rounded-lg border border-border px-3 py-2.5 text-xs"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="rounded-lg border border-border px-3 py-2.5 text-xs"
          placeholder="Preferred service (optional)"
          value={form.service}
          onChange={(e) => setForm({ ...form, service: e.target.value })}
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-xs font-semibold text-white">
          <Plus size={15} />
          Add
        </button>
      </form>
      <div className="section-heading flex justify-between items-center gap-[15px] mb-5 [&_h3]:text-sm [&_h3]:font-650 [&_h3]:tracking-[-.2px] [&_p]:text-tiny [&_p]:text-[#969d93] [&_p]:mt-[7px] phone:[&_.muted]:hidden phone:[&_h3]:text-13 phone:gap-2 !mb-4 [&_h3]:!text-base [&_h3]:!text-navy [&_p]:!text-xs [&_p]:!text-[#71809b]">
        <span className="section-title flex items-center gap-2 text-xs font-600 phone:text-tiny !text-[#0d1a3c] !text-sm !font-700 wide:!text-[15px]">
          Customer directory{" "}
          <span className="count bg-[#f1f4ec] text-[#839476] text-2xs rounded-[5px] py-[3px] px-[7px] font-500 !bg-[#fff0e0] !text-[#ee590d] !rounded-md">
            {data.customers.length}
          </span>
        </span>
        <SearchBox query={query} setQuery={setQuery} />
      </div>
      {!customers.length ? (
        <Empty
          icon={Users}
          title={query ? "No customers match your search" : "No customers yet"}
          text={
            query
              ? "Try another name, email address, or service."
              : "Customer records will appear here once they are added to your workspace."
          }
        />
      ) : (
        <div className="table-scroll overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Preferred service</th>
                <th>Visits</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="person-cell flex items-center gap-3 [&_strong]:text-[#465b3d] [&_strong]:text-xs phone:[&_strong]:text-2xs [&_strong]:!text-navy">
                      {avatar(c)}
                      <div>
                        <strong>{c.name}</strong>
                        <small>{c.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{c.service}</td>
                  <td>{c.visits}</td>
                  <td>{badge(c.status)}</td>
                  <td>
                    <button
                      className="text-button inline-flex items-center gap-1.5 bg-transparent p-0 text-[#829274] text-2xs whitespace-nowrap !text-[#f4510c] !text-tiny"
                      onClick={() => {
                        setGoal(
                          `Review ${c.name}'s history and draft a thoughtful follow-up. Do not change confirmed bookings.`,
                        );
                        setModal(true);
                      }}
                    >
                      Ask agent <ArrowUpRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
