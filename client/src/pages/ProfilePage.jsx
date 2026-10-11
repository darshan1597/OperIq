import React, { useState } from "react";
import { Building2, CheckCircle2, LogOut, Mail, Save, UserRound } from "lucide-react";
import { apiError } from "../api/client.js";

const inputClass = "mt-2 w-full rounded-xl border border-[#dfe4ed] bg-white px-4 py-3 text-sm text-navy outline-none focus:border-orange focus:ring-4 focus:ring-[#ff550b10]";

export default function ProfilePage({ data, api, setNotice, logout }) {
  const [form, setForm] = useState({ name: data.user.name, email: data.user.email, businessName: data.business.name });
  const [saving, setSaving] = useState(false);
  const initials = form.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/profile", form, "PATCH");
      data.user.name = form.name.trim();
      data.user.email = form.email.trim().toLowerCase();
      data.user.businessName = form.businessName.trim();
      data.business.name = form.businessName.trim();
      data.business.owner = form.name.trim();
      setNotice("Profile updated successfully");
    } catch (error) { setNotice(apiError(error)); }
    finally { setSaving(false); }
  };
  return <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 compact:grid-cols-1">
    <form onSubmit={save} className="rounded-2xl border border-border bg-white p-7 mobile:p-5">
      <div className="flex items-center gap-4 border-b border-[#edf0f5] pb-6"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#fff0df] text-xl font-bold text-orange">{initials}</span><div><h2 className="text-xl font-bold text-navy">Personal profile</h2><p className="mt-1 text-xs text-[#71809b]">Manage your identity and workspace details.</p></div></div>
      <div className="mt-6 grid grid-cols-2 gap-5 mobile:grid-cols-1">
        <label className="text-xs font-semibold text-[#30415f]">Full name<div className="relative"><UserRound className="absolute left-4 top-[22px] text-[#8190a8]" size={17}/><input className={`${inputClass} pl-11`} value={form.name} onChange={(e)=>update("name",e.target.value)} required/></div></label>
        <label className="text-xs font-semibold text-[#30415f]">Email address<div className="relative"><Mail className="absolute left-4 top-[22px] text-[#8190a8]" size={17}/><input type="email" className={`${inputClass} pl-11`} value={form.email} onChange={(e)=>update("email",e.target.value)} required/></div></label>
      </div>
      <label className="mt-5 block text-xs font-semibold text-[#30415f]">Business name<div className="relative"><Building2 className="absolute left-4 top-[22px] text-[#8190a8]" size={17}/><input className={`${inputClass} pl-11`} value={form.businessName} onChange={(e)=>update("businessName",e.target.value)} required/></div></label>
      <div className="mt-7 flex items-center justify-between border-t border-[#edf0f5] pt-5 mobile:flex-col mobile:items-stretch mobile:gap-3"><button type="button" onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ffd8cf] bg-[#fff8f6] px-4 py-3 text-xs font-semibold text-[#c3472d]"><LogOut size={16}/>Sign out</button><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange px-5 py-3 text-xs font-semibold text-white disabled:opacity-60"><Save size={16}/>{saving?"Saving…":"Save changes"}</button></div>
    </form>
    <aside className="h-fit rounded-2xl border border-[#ffe2d0] bg-gradient-to-br from-[#fff8f2] to-white p-6"><CheckCircle2 className="text-orange" size={25}/><h3 className="mt-4 text-base font-bold text-navy">Your business identity</h3><p className="mt-2 text-xs leading-6 text-[#6f7d94]">Your business name appears in the owner dashboard and customer portal. AI knowledge, services, and publishing controls remain under Teach your AI.</p><div className="mt-5 rounded-xl bg-white p-4 text-xs text-[#68758c] shadow-sm"><strong className="block text-navy">Account created</strong><span className="mt-1 block">{data.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : "Account active"}</span></div></aside>
  </div>;
}
