import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Clock3,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { apiClient, apiError } from "../api/client.js";

export default function BusinessPortalPage({ slug }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [messages, setMessages] = useState([]),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    apiClient
      .get(`/public/businesses/${slug}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(apiError(e)));
  }, [slug]);
  const send = async (text = message) => {
    if (!text.trim() || busy) return;
    setMessages((v) => [...v, { role: "user", text }]);
    setMessage("");
    setBusy(true);
    try {
      const { data: reply } = await apiClient.post(
        `/public/businesses/${slug}/chat`,
        { message: text },
      );
      setMessages((v) => [
        ...v,
        { role: "assistant", text: reply.answer, source: reply.source },
      ]);
    } catch (e) {
      setMessages((v) => [...v, { role: "assistant", text: apiError(e) }]);
    } finally {
      setBusy(false);
    }
  };
  if (error)
    return (
      <div className="grid min-h-screen place-items-center bg-[#fffaf6] p-6">
        <div className="max-w-md rounded-3xl bg-white p-9 text-center shadow-xl">
          <Bot className="mx-auto text-orange" size={35} />
          <h1 className="mt-4 text-xl font-bold text-navy">
            Assistant unavailable
          </h1>
          <p className="mt-2 text-sm text-[#71809b]">{error}</p>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="grid min-h-screen place-items-center bg-[#fffaf6] text-sm text-[#71809b]">
        Opening business assistant…
      </div>
    );
  const { business, assistant, services, faqs } = data;
  return (
    <div className="min-h-screen bg-[#fffaf6] font-ui text-navy">
      <header className="border-b border-[#f0e8e2] bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange text-lg font-bold text-white">
              {business.name[0]}
            </span>
            <div>
              <strong className="block text-sm">{business.name}</strong>
              <span className="text-[11px] text-[#7c889d]">
                {business.industry}
              </span>
            </div>
          </div>
          <a
            href="#assistant"
            className="rounded-xl bg-orange px-4 py-2.5 text-xs font-semibold text-white"
          >
            Ask our AI
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="grid grid-cols-[1fr_430px] gap-10 compact:grid-cols-1">
          <div className="py-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ffd8c0] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#b94c17]">
              <Sparkles size={13} /> AI-powered customer care
            </span>
            <h1 className="mt-5 max-w-2xl text-5xl font-bold leading-tight tracking-[-2px] mobile:text-4xl">
              How can we help you today?
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#63718b]">
              {business.description}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {business.openingHours && (
                <Info icon={Clock3} text={business.openingHours} />
              )}{" "}
              {business.phone && <Info icon={Phone} text={business.phone} />}{" "}
              {business.address && (
                <Info icon={MapPin} text={business.address} />
              )}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 mobile:grid-cols-1">
              {services.slice(0, 4).map((service) => (
                <button
                  key={service.id}
                  onClick={() => send(`Tell me about ${service.name}`)}
                  className="group rounded-2xl border border-[#ece8e3] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-sm">{service.name}</strong>
                    <ArrowRight size={15} className="text-orange" />
                  </div>
                  <p className="mt-2 text-xs text-[#7a8699]">
                    {[service.duration, service.price]
                      .filter(Boolean)
                      .join(" · ") || "Ask for details"}
                  </p>
                </button>
              ))}
            </div>
            <BookingCard slug={slug} services={services} />
          </div>
          <section
            id="assistant"
            className="flex min-h-[570px] flex-col overflow-hidden rounded-3xl border border-[#eadfd7] bg-white shadow-[0_25px_80px_#8f5d3b18]"
          >
            <div className="flex items-center gap-3 border-b border-[#edf0f4] p-5">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0e4] text-orange">
                <MessageSquare size={21} />
              </span>
              <div>
                <strong className="block text-sm">
                  {business.name} assistant
                </strong>
                <span className="flex items-center gap-1.5 text-[11px] text-[#66758d]">
                  <i className="h-1.5 w-1.5 rounded-full bg-[#12a663]" /> Online
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-[#fbfcfe] p-5">
              <Bubble text={assistant.greeting} />
              {messages.map((item, index) => (
                <Bubble key={index} {...item} />
              ))}
              {busy && <Bubble text="Thinking…" />}
            </div>
            <div className="border-t border-[#edf0f4] bg-white p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  "What services do you offer?",
                  "What are your opening hours?",
                  "What is your cancellation policy?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full bg-[#f5f6f9] px-3 py-2 text-[10px] text-[#53627c]"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-[#dfe4ed] px-4 py-3 text-sm outline-none focus:border-orange"
                  placeholder="Ask a question…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button
                  onClick={() => send()}
                  className="grid h-12 w-12 place-items-center rounded-xl bg-orange text-white"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-[#9aa4b4]">
                <ShieldCheck size={12} /> Powered by OperIQ · Governed by
                ArmorIQ
              </div>
            </div>
          </section>
        </section>
        {faqs.length > 0 && (
          <section className="mt-16">
            <p className="text-xs font-bold uppercase tracking-widest text-orange">
              Helpful answers
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Frequently asked questions
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 mobile:grid-cols-1">
              {faqs.slice(0, 6).map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => send(faq.question)}
                  className="rounded-2xl border border-[#eee7e1] bg-white p-5 text-left"
                >
                  <strong className="text-sm">{faq.question}</strong>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#748098]">
                    {faq.answer}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
      <footer className="mt-12 border-t border-[#eee5df] py-7 text-center text-[11px] text-[#929cab]">
        © {new Date().getFullYear()} {business.name} · Customer assistance
        powered by OperIQ
      </footer>
    </div>
  );
}
function Info({ icon: Icon, text }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-[#5e6d85] shadow-sm">
      <Icon size={15} className="text-orange" />
      {text}
    </span>
  );
}
function Bubble({ role = "assistant", text, source }) {
  return (
    <div
      className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-5 ${role === "user" ? "ml-auto rounded-br-md bg-orange text-white" : "rounded-bl-md border border-[#edf0f4] bg-white text-[#465671]"}`}
    >
      <p>{text}</p>
      {source && (
        <span className="mt-1 block text-[9px] opacity-60">From {source}</span>
      )}
    </div>
  );
}

function BookingCard({ slug, services }) {
  const [form,setForm]=useState({name:"",email:"",code:"",serviceId:services[0]?.id||"",date:""});
  const [challenge,setChallenge]=useState(null),[token,setToken]=useState(""),[slots,setSlots]=useState([]),[note,setNote]=useState(""),[busy,setBusy]=useState(false);
  const update=(key,value)=>setForm(v=>({...v,[key]:value}));
  const request=async()=>{setBusy(true);try{const {data}=await apiClient.post(`/public/businesses/${slug}/verification/request`,{name:form.name,email:form.email});setChallenge(data.challengeId);if(data.developmentCode){update("code",data.developmentCode);setNote(`Development code: ${data.developmentCode}`);}else setNote("Check your email for the verification code.");}catch(e){setNote(apiError(e));}finally{setBusy(false)}};
  const verify=async()=>{setBusy(true);try{const {data}=await apiClient.post(`/public/businesses/${slug}/verification/confirm`,{challengeId:challenge,code:form.code});setToken(data.verificationToken);setNote(`Verified as ${data.customer.name}`);}catch(e){setNote(apiError(e));}finally{setBusy(false)}};
  const availability=async()=>{setBusy(true);try{const {data}=await apiClient.get(`/public/businesses/${slug}/availability`,{params:{serviceId:form.serviceId,date:form.date}});setSlots(data.slots);setNote(data.slots.length?"Choose an available time.":"No available times found.");}catch(e){setNote(apiError(e));}finally{setBusy(false)}};
  const book=async(slot)=>{setBusy(true);try{await apiClient.post(`/public/businesses/${slug}/bookings`,{verificationToken:token,serviceId:form.serviceId,staffId:slot.staffId,date:form.date,time:slot.time});setSlots([]);setNote(`Booking confirmed for ${form.date} at ${slot.time} with ${slot.staffName}.`);}catch(e){setNote(apiError(e));}finally{setBusy(false)}};
  return <div className="mt-6 rounded-2xl border border-[#eadfd7] bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CalendarDays size={18} className="text-orange"/><strong className="text-sm">Book an appointment</strong></div><p className="mt-1 text-[11px] text-[#7a8699]">Verify your email, find a valid time, and book securely.</p>
    {!token&&<div className="mt-4 grid grid-cols-2 gap-2 mobile:grid-cols-1"><input className="rounded-xl border border-[#dfe4ed] px-3 py-2.5 text-xs" placeholder="Your name" value={form.name} onChange={e=>update("name",e.target.value)}/><input className="rounded-xl border border-[#dfe4ed] px-3 py-2.5 text-xs" placeholder="Email" value={form.email} onChange={e=>update("email",e.target.value)}/>{challenge?<><input className="rounded-xl border border-[#dfe4ed] px-3 py-2.5 text-xs" placeholder="6-digit code" value={form.code} onChange={e=>update("code",e.target.value)}/><button disabled={busy} onClick={verify} className="rounded-xl bg-orange px-3 py-2.5 text-xs font-semibold text-white">Verify</button></>:<button disabled={busy} onClick={request} className="col-span-2 rounded-xl bg-orange px-3 py-2.5 text-xs font-semibold text-white mobile:col-span-1">Send verification code</button>}</div>}
    {token&&<div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2 mobile:grid-cols-1"><select className="rounded-xl border border-[#dfe4ed] px-3 py-2.5 text-xs" value={form.serviceId} onChange={e=>update("serviceId",e.target.value)}>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><input type="date" min={new Date().toISOString().slice(0,10)} className="rounded-xl border border-[#dfe4ed] px-3 py-2.5 text-xs" value={form.date} onChange={e=>update("date",e.target.value)}/><button disabled={busy} onClick={availability} className="rounded-xl bg-orange px-4 py-2.5 text-xs font-semibold text-white">Find times</button></div>}
    {slots.length>0&&<div className="mt-3 flex flex-wrap gap-2">{slots.map(slot=><button key={`${slot.staffId}-${slot.time}`} disabled={busy} onClick={()=>book(slot)} className="rounded-lg border border-[#ffd4ba] bg-[#fff7f1] px-3 py-2 text-[10px] font-semibold text-orange">{slot.time} · {slot.staffName}</button>)}</div>}{note&&<p className="mt-3 text-[11px] text-[#65738b]">{note}</p>}
  </div>;
}
