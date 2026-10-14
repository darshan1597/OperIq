import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api, messageFor, saveToken } from "../api.js";
import Brand from "../components/Brand.jsx";

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      saveToken(data.token);
      onLogin();
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_15%_10%,#fff0e7,transparent_28%)] p-6">
      <section className="w-full max-w-[440px] rounded-3xl border border-[#e6e9f0] bg-white p-10 shadow-[0_25px_80px_#12213b17]">
        <Brand />
        <span className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#fff1e8] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#d84d08]">
          <ShieldCheck size={14} /> Platform administration
        </span>
        <h1 className="mb-2 mt-5 text-3xl font-bold tracking-[-1.2px]">
          Review governed actions
        </h1>
        <p className="m-0 text-[13px] leading-6 text-[#6e7b92]">
          Sign in with an account listed in <code>OPERIQ_ADMIN_EMAILS</code>.
        </p>
        <form className="mt-7 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-[11px] font-bold text-[#53627a]">
            Email
            <input
              required
              type="email"
              className="w-full rounded-xl border border-[#dce2eb] p-3 outline-none focus:border-[#ff7e42] focus:ring-4 focus:ring-[#ff5a0a12]"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-[11px] font-bold text-[#53627a]">
            Password
            <input
              required
              type="password"
              className="w-full rounded-xl border border-[#dce2eb] p-3 outline-none focus:border-[#ff7e42] focus:ring-4 focus:ring-[#ff5a0a12]"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
          </label>
          {error && (
            <div className="rounded-xl border border-[#ffd4d4] bg-[#fff1f1] p-3 text-xs text-[#b73b45]">
              {error}
            </div>
          )}
          <button
            disabled={busy}
            className="rounded-xl border-0 bg-orange p-3.5 text-xs font-extrabold text-white disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in to admin"}
          </button>
        </form>
      </section>
    </main>
  );
}
