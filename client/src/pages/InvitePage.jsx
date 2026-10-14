import React, { useEffect, useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { apiClient, apiError } from "../api/client.js";
import { BrandWordmark } from "./components/Brand.jsx";

export default function InvitePage({ token, onAuthenticated }) {
  const [invitation, setInvitation] = useState(null),
    [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", password: "" }),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    apiClient
      .get(`/auth/invitations/${token}`)
      .then(({ data }) => setInvitation(data.invitation))
      .catch((requestError) => setError(apiError(requestError)));
  }, [token]);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await apiClient.post(
        `/auth/invitations/${token}/accept`,
        form,
      );
      onAuthenticated(data);
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-[#fffaf7] p-5">
      <section className="w-full max-w-md rounded-3xl border border-[#eee4dc] bg-white p-8 shadow-xl">
        <BrandWordmark />
        <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#fff1e7] px-3 py-2 text-[10px] font-bold uppercase text-orange">
          <KeyRound size={13} /> Workspace invitation
        </span>
        {error ? (
          <p className="mt-6 rounded-xl bg-[#ffefeb] p-4 text-sm text-[#b54747]">
            {error}
          </p>
        ) : !invitation ? (
          <p className="mt-6 text-sm text-[#71809b]">Opening invitation…</p>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-bold text-navy">
              Join {invitation.businessName}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#687790]">
              You were invited as{" "}
              <strong className="capitalize text-navy">
                {invitation.role}
              </strong>{" "}
              using {invitation.email}.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <input
                required
                minLength={2}
                className="w-full rounded-xl border border-[#dfe4ed] px-4 py-3 text-sm"
                placeholder="Your full name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
              <input
                required
                minLength={8}
                type="password"
                className="w-full rounded-xl border border-[#dfe4ed] px-4 py-3 text-sm"
                placeholder="Create a password"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
              <button
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange px-5 py-3.5 text-sm font-semibold text-white"
              >
                {busy ? "Joining workspace…" : "Accept invitation"}
                <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
