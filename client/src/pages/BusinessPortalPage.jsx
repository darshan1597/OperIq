import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Menu,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { apiClient, apiError } from "../api/client.js";
import { getPortalPreset } from "./components/portal-presets.js";

const browserSecurityId = () => {
  const key = "operiq-security-client-id";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return window.crypto.randomUUID();
  }
};

export default function BusinessPortalPage({ slug }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [messages, setMessages] = useState([]),
    [busy, setBusy] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [showAllServices, setShowAllServices] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationChallengeId, setVerificationChallengeId] = useState("");
  const [activeFlow, setActiveFlow] = useState("");
  const [clientSessionId] = useState(browserSecurityId);
  useEffect(() => {
    apiClient
      .get(`/public/businesses/${slug}`, {
        progressLabel: "Loading the business assistant…",
      })
      .then((response) => setData(response.data))
      .catch((requestError) => setError(apiError(requestError)));
  }, [slug]);
  const send = async (text = message) => {
    if (!text.trim() || busy) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setMessage("");
    setBusy(true);
    try {
      const { data: reply } = await apiClient.post(
        `/public/businesses/${slug}/chat`,
        {
          message: text,
          clientSessionId,
          verificationToken: verificationToken || undefined,
          verificationChallengeId: verificationChallengeId || undefined,
          activeFlow: activeFlow || undefined,
          history: messages
            .slice(-10)
            .map(({ role, text: content }) => ({ role, text: content })),
        },
        {
          progressLabel:
            "Understanding your request and applying the required policy…",
        },
      );
      if (reply.verificationChallengeId)
        setVerificationChallengeId(reply.verificationChallengeId);
      if (reply.verificationToken)
        setVerificationToken(reply.verificationToken);
      if (reply.clearVerificationChallenge) setVerificationChallengeId("");
      if (reply.activeFlow) setActiveFlow(reply.activeFlow);
      if (reply.clearActiveFlow) setActiveFlow("");
      if (reply.diagnostics) {
        console.groupCollapsed(
          `[OperIQ/ArmorIQ] ${reply.diagnostics.requestId}`,
        );
        console.table(reply.diagnostics.audit || []);
        console.log("Response", {
          action: reply.action,
          permission: reply.permission,
          source: reply.source,
          governance: reply.governance,
        });
        console.groupEnd();
      }
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: reply.answer,
          source:
            reply.governance?.status &&
            reply.governance.status !== "Not required"
              ? `${reply.source} · ${reply.governance.status}`
              : reply.source,
          governanceReason: reply.governance?.reason,
        },
      ]);
    } catch (requestError) {
      console.error("[OperIQ/ArmorIQ] Chat request failed", {
        message: requestError.message,
        status: requestError.response?.status,
        response: requestError.response?.data,
      });
      setMessages((current) => [
        ...current,
        { role: "assistant", text: apiError(requestError) },
      ]);
    } finally {
      setBusy(false);
    }
  };
  if (error) return <Unavailable error={error} />;
  if (!data)
    return (
      <div className="grid min-h-screen place-items-center bg-[#fffaf6] text-sm text-[#71809b]">
        Opening business assistant…
      </div>
    );
  const { business, assistant, services, faqs } = data;
  const preset = getPortalPreset(business.industry);
  const initials = business.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const links = [
    ["Home", "home"],
    ["Services", "services"],
    ["About", "about"],
    ["FAQs", "faqs"],
    ["Contact", "contact"],
  ];
  const accentColor = /^#[0-9a-f]{6}$/i.test(business.accentColor || "")
    ? business.accentColor
    : "#ff550b";
  const portalTheme = {
    "--portal-accent": accentColor,
    "--portal-pale": `color-mix(in srgb, ${accentColor} 8%, white)`,
    "--portal-soft": `color-mix(in srgb, ${accentColor} 16%, white)`,
    "--portal-border": `color-mix(in srgb, ${accentColor} 28%, white)`,
  };

  return (
    <div
      style={portalTheme}
      className="min-h-screen bg-[#fffaf7] font-ui text-navy"
    >
      <header className="sticky top-0 z-40 border-b border-[#eee8e3] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1480px] items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-0">
          <a href="#home" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--portal-accent)] text-sm font-bold text-white shadow-lg">
              {initials}
            </span>
            <span>
              <strong className="block text-base leading-5">
                {business.name}
              </strong>
              <small className="block text-[10px] text-[#71809b] mobile:hidden">
                {business.industry}
              </small>
            </span>
          </a>
          <nav className="flex items-center gap-8 text-xs font-semibold text-[#53617a] tablet:hidden">
            {links.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="transition hover:text-[var(--portal-accent)]"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#assistant"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--portal-accent)] px-3 py-2.5 text-xs font-semibold text-white shadow-lg sm:px-4"
            >
              <Bot size={15} /> <span className="mobile:hidden">Ask our AI</span><span className="hidden mobile:inline">Ask AI</span>
            </a>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="hidden h-10 w-10 place-items-center rounded-xl border border-[#e7e9ee] tablet:grid"
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="hidden gap-1 border-t border-[#edf0f4] bg-white px-4 py-3 tablet:grid sm:px-6">
            {links.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-[var(--portal-pale)]"
              >
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto grid max-w-[1480px] grid-cols-[minmax(0,1fr)_390px] gap-6 px-4 py-4 sm:px-6 sm:py-5 compact:grid-cols-1">
        <div className="min-w-0 space-y-5">
          <section
            id="home"
            className="relative min-h-[430px] overflow-hidden rounded-[28px] border border-[#eee4db] bg-[var(--portal-pale)] mobile:min-h-[390px] mobile:rounded-2xl"
          >
            {business.heroImage ? (
              <img
                src={business.heroImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                <span className="absolute -right-16 -top-20 h-80 w-80 rounded-full bg-[var(--portal-soft)] opacity-50" />
                <span className="absolute bottom-[-120px] right-40 h-72 w-72 rounded-full bg-[var(--portal-pale)]" />
              </>
            )}
            <div
              className={`absolute inset-0 ${business.heroImage ? "bg-gradient-to-r from-[#fffaf5] via-[#fffaf5e8] to-transparent" : "bg-gradient-to-br from-white via-[var(--portal-pale)] to-[var(--portal-soft)]"}`}
            />
            <div className="relative z-10 max-w-[610px] px-10 py-12 mobile:px-6 mobile:py-9">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--portal-border)] bg-white/90 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-[var(--portal-accent)]">
                <Sparkles size={12} /> {preset.eyebrow}
              </span>
              <h1 className="mt-6 text-[54px] font-black leading-[1.04] tracking-[-2.5px] mobile:text-[38px] mobile:tracking-[-1.5px]">
                {preset.headline}
                <span className="block text-[var(--portal-accent)]">
                  {preset.accent}
                </span>
              </h1>
              <p className="mt-5 max-w-[520px] text-[15px] leading-7 text-[#5f6f89]">
                {business.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#booking"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--portal-accent)] px-5 py-3 text-xs font-bold text-white shadow-lg"
                >
                  <CalendarDays size={16} /> {preset.action}
                </a>
                <a
                  href="#services"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#e7d9ce] bg-white/90 px-5 py-3 text-xs font-bold"
                >
                  Explore services <ArrowRight size={15} />
                </a>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[#e9e5e1] bg-white shadow-sm mobile:grid-cols-1">
            {business.openingHours && (
              <InfoBlock
                icon={Clock3}
                title="Opening hours"
                text={business.openingHours}
              />
            )}
            {business.address && (
              <InfoBlock
                icon={MapPin}
                title="Visit us"
                text={business.address}
              />
            )}
            {(business.phone || business.email) && (
              <InfoBlock
                icon={Phone}
                title="Contact"
                text={business.phone || business.email}
              />
            )}
          </section>

          <section
            id="services"
            className="scroll-mt-24 rounded-[28px] bg-white p-6 shadow-sm"
          >
            <div className="flex items-end justify-between gap-4">
              <SectionHeading
                eyebrow="What we offer"
                title={preset.serviceLabel}
              />
              {services.length > 4 && (
                <button
                  onClick={() => setShowAllServices((value) => !value)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--portal-accent)]"
                >
                  {showAllServices ? "Show featured" : "View all services"}{" "}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
            {services.length ? (
              <div className="mt-5 grid grid-cols-4 gap-3 tablet:grid-cols-2 mobile:grid-cols-1">
                {(showAllServices ? services : services.slice(0, 4)).map(
                  (service, index) => (
                    <button
                      key={service.id}
                      onClick={() => send(`Tell me about ${service.name}`)}
                      className="group overflow-hidden rounded-2xl border border-[#e9e8e5] bg-[#fcfcfd] text-left transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[var(--portal-pale)] to-[var(--portal-soft)] text-[var(--portal-accent)]">
                        {index % 2 ? (
                          <Star size={29} />
                        ) : (
                          <Sparkles size={29} />
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <strong className="text-sm">{service.name}</strong>
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--portal-pale)] text-[var(--portal-accent)] transition group-hover:bg-[var(--portal-accent)] group-hover:text-white">
                            <ArrowRight size={13} />
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 min-h-10 text-[11px] leading-5 text-[#758198]">
                          {service.description ||
                            "Ask our assistant for more details."}
                        </p>
                        <p className="mt-3 text-[11px] font-semibold text-[#53627c]">
                          {[service.duration, service.price]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </button>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#71809b]">
                Service information will be available soon.
              </p>
            )}
          </section>

          <section id="booking" className="scroll-mt-24 space-y-4">
            <BookingCard
              slug={slug}
              services={services}
              action={preset.action}
              token={verificationToken}
              onVerified={setVerificationToken}
            />
            <ManageAppointmentsCard
              slug={slug}
              token={verificationToken}
              onVerified={setVerificationToken}
            />
          </section>

          <section
            id="about"
            className="scroll-mt-24 rounded-[28px] border border-[var(--portal-border)] bg-[var(--portal-pale)] p-7"
          >
            <SectionHeading
              eyebrow={`Why choose ${business.name}?`}
              title="Professional care at every step"
            />
            <div className="mt-5 grid grid-cols-4 gap-3 tablet:grid-cols-2 mobile:grid-cols-1">
              {preset.trust.map(([title, text], index) => (
                <div key={title} className="rounded-2xl bg-white/85 p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--portal-pale)] text-[var(--portal-accent)]">
                    {index === 0 ? (
                      <UserRound size={18} />
                    ) : index === 1 ? (
                      <Star size={18} />
                    ) : index === 2 ? (
                      <ShieldCheck size={18} />
                    ) : (
                      <Check size={18} />
                    )}
                  </span>
                  <strong className="mt-3 block text-xs">{title}</strong>
                  <p className="mt-1 text-[10px] leading-4 text-[#738098]">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {faqs.length > 0 && (
            <section
              id="faqs"
              className="scroll-mt-24 rounded-[28px] bg-white p-7 shadow-sm"
            >
              <SectionHeading
                eyebrow="Helpful answers"
                title="Frequently asked questions"
              />
              <div className="mt-5 grid grid-cols-2 gap-3 mobile:grid-cols-1">
                {faqs.map((faq) => (
                  <button
                    key={faq.id}
                    onClick={() => send(faq.question)}
                    className="rounded-2xl border border-[#ece8e4] p-4 text-left transition hover:border-[var(--portal-border)] hover:bg-[var(--portal-pale)]"
                  >
                    <strong className="text-xs">{faq.question}</strong>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#758198]">
                      {faq.answer}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section
            id="contact"
            className="scroll-mt-24 rounded-[28px] bg-navy p-7 text-white"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--portal-accent)]">
              Contact
            </p>
            <div className="mt-3 flex items-end justify-between gap-6 mobile:flex-col mobile:items-start">
              <div>
                <h2 className="text-2xl font-bold">Ready when you are.</h2>
                <p className="mt-2 max-w-xl text-xs leading-5 text-[#b7c0d0]">
                  Ask the assistant a question or use the secure booking section
                  to get started.
                </p>
              </div>
              <a
                href="#assistant"
                className="rounded-xl bg-[var(--portal-accent)] px-5 py-3 text-xs font-bold text-white"
              >
                Ask our AI
              </a>
            </div>
          </section>
        </div>

        <ChatPanel
          business={business}
          assistant={assistant}
          message={message}
          messages={messages}
          busy={busy}
          setMessage={setMessage}
          send={send}
        />
      </main>
      <footer className="mx-auto flex max-w-[1480px] items-center justify-between px-4 py-7 text-center text-[10px] text-[#8b96a8] sm:px-6 mobile:flex-col mobile:gap-2">
        <span>
          © {new Date().getFullYear()} {business.name}
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={12} /> Powered by OperIQ · Governed by ArmorIQ
        </span>
      </footer>
    </div>
  );
}

function ChatPanel({
  business,
  assistant,
  message,
  messages,
  busy,
  setMessage,
  send,
}) {
  const quickQuestions = [
    "What services do you offer?",
    "What are your opening hours?",
    "What is your cancellation policy?",
  ];
  return (
    <aside
      id="assistant"
      className="sticky top-[84px] flex h-[calc(100vh-104px)] min-h-[620px] flex-col overflow-hidden rounded-[28px] border border-[#eadfd7] bg-white shadow-[0_25px_80px_#8f5d3b18] compact:static compact:h-[680px] compact:min-h-0 mobile:h-[min(680px,calc(100vh-24px))] mobile:rounded-2xl"
    >
      <div className="flex items-center gap-3 border-b border-[#edf0f4] p-5">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--portal-pale)] text-[var(--portal-accent)]">
          <Bot size={23} />
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-[15px]">
            {business.name} Assistant
          </strong>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#52617a]">
            <i className="h-1.5 w-1.5 rounded-full bg-[#12a663]" /> Online
          </span>
        </div>
        <RefreshCw size={17} className="text-[#65738b]" />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#fbfcfe] p-4 [scrollbar-color:var(--portal-accent)_#eef1f5] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--portal-accent)] [&::-webkit-scrollbar-track]:bg-[#eef1f5]">
        <Bubble text={assistant.greeting} />
        <div className="space-y-2">
          {quickQuestions.map((question) => (
            <button
              key={question}
              onClick={() => send(question)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-[#dce2ea] bg-white px-3.5 py-3 text-left text-xs font-semibold text-[#34445f] transition hover:border-[var(--portal-border)] hover:bg-[var(--portal-pale)] hover:text-[var(--portal-accent)]"
            >
              <MessageSquare size={15} /> {question}
            </button>
          ))}
        </div>
        {messages.map((item, index) => (
          <Bubble key={index} {...item} />
        ))}
        {busy && <Bubble text="Thinking…" />}
      </div>
      <div className="border-t border-[#e3e7ed] bg-white p-4">
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-[#cfd6e1] px-4 py-3 text-[13px] font-medium text-navy outline-none placeholder:text-[#7a879b] focus:border-[var(--portal-accent)]"
            placeholder="Ask a question…"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && send()}
          />
          <button
            onClick={() => send()}
            className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--portal-accent)] text-white shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium text-[#758198]">
          <ShieldCheck size={12} /> Powered by OperIQ · Secured by ArmorIQ
        </div>
      </div>
    </aside>
  );
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--portal-accent)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-bold tracking-[-0.5px]">{title}</h2>
    </div>
  );
}

function InfoBlock({ icon: Icon, title, text }) {
  return (
    <div className="flex min-w-0 gap-3 border-r border-[#edf0f4] p-4 last:border-r-0 mobile:border-b mobile:border-r-0 mobile:last:border-b-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--portal-pale)] text-[var(--portal-accent)]">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <strong className="block text-[10px]">{title}</strong>
        <p className="mt-1 whitespace-pre-line text-[10px] leading-4 text-[#71809b]">
          {text}
        </p>
      </div>
    </div>
  );
}

function Bubble({ role = "assistant", text, source, governanceReason }) {
  return (
    <div
      className={`max-w-[94%] rounded-2xl px-4 py-3.5 text-[13px] font-medium leading-[1.65] ${role === "user" ? "ml-auto rounded-br-md bg-[var(--portal-accent)] text-white" : "rounded-bl-md border border-[#e1e6ed] bg-white text-[#2f405d] shadow-sm"}`}
    >
      <div className="min-w-0 overflow-hidden break-words [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_strong]:font-bold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ children, ...props }) => (
              <a
                {...props}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
              >
                {children}
              </a>
            ),
            table: ({ children }) => (
              <div className="my-3 max-w-full overflow-x-auto rounded-xl border border-[#dbe1e9] bg-white">
                <table className="w-full min-w-[520px] border-collapse text-left text-xs leading-5">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border-b border-[#dbe1e9] bg-[#f3f5f8] px-3 py-2 font-bold text-navy">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-b border-[#e7ebf0] px-3 py-2 align-top">
                {children}
              </td>
            ),
          }}
        >
          {String(text || "")}
        </ReactMarkdown>
      </div>
      {source && (
        <span className="mt-1.5 block text-[10px] font-medium opacity-70">
          From {source}
        </span>
      )}
      {governanceReason && (
        <span className="mt-1 block text-[10px] font-medium opacity-70">
          {governanceReason}
        </span>
      )}
    </div>
  );
}

function BookingCard({ slug, services, action, token, onVerified }) {
  const [form, setForm] = useState({
      name: "",
      email: "",
      phone: "",
      code: "",
      serviceId: services[0]?.id || "",
      date: "",
    }),
    [challenge, setChallenge] = useState(null),
    [slots, setSlots] = useState([]),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false);
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const request = async () => {
    setBusy(true);
    try {
      const { data } = await apiClient.post(
        `/public/businesses/${slug}/verification/request`,
        { name: form.name, email: form.email, phone: form.phone },
      );
      setChallenge(data.challengeId);
      if (data.developmentCode) {
        update("code", data.developmentCode);
        setNote(`Development code: ${data.developmentCode}`);
      } else setNote("Check your email for the verification code.");
    } catch (requestError) {
      setNote(apiError(requestError));
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    try {
      const { data } = await apiClient.post(
        `/public/businesses/${slug}/verification/confirm`,
        { challengeId: challenge, code: form.code },
      );
      onVerified(data.verificationToken);
      setNote(
        `Verified as ${data.customer.name}. The AI chat can now securely access only your appointments.`,
      );
    } catch (requestError) {
      setNote(apiError(requestError));
    } finally {
      setBusy(false);
    }
  };
  const availability = async () => {
    setBusy(true);
    try {
      const { data } = await apiClient.get(
        `/public/businesses/${slug}/availability`,
        { params: { serviceId: form.serviceId, date: form.date } },
      );
      setSlots(data.slots);
      setNote(
        data.slots.length
          ? "Choose an available time."
          : "No available times found.",
      );
    } catch (requestError) {
      setNote(apiError(requestError));
    } finally {
      setBusy(false);
    }
  };
  const book = async (slot) => {
    setBusy(true);
    try {
      const { data } = await apiClient.post(
        `/public/businesses/${slug}/bookings`,
        {
          verificationToken: token,
          serviceId: form.serviceId,
          staffId: slot.staffId,
          date: form.date,
          time: slot.time,
        },
      );
      if (data.status === "Held") {
        setNote(
          data.message || "This booking is waiting for business approval.",
        );
      } else {
        setSlots([]);
        setNote(
          `Booking confirmed for ${form.date} at ${slot.time} with ${slot.staffName}.`,
        );
      }
    } catch (requestError) {
      setNote(apiError(requestError));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-[28px] border border-[#e7e4e0] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mobile:flex-col">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--portal-pale)] text-[var(--portal-accent)]">
            <CalendarDays size={21} />
          </span>
          <div>
            <strong className="text-base">{action}</strong>
            <p className="mt-1 text-[11px] text-[#7a8699]">
              Verify your email, find a valid time and book securely.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[var(--portal-pale)] px-3 py-2 text-[9px] font-bold text-[var(--portal-accent)]">
          <Sparkles size={11} className="mr-1 inline" /> Secure confirmation
        </span>
      </div>
      {!token && (
        <div className="mt-5 grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mobile:grid-cols-1">
          <input
            className="rounded-xl border border-[#dfe4ed] px-4 py-3 text-xs"
            placeholder="Your name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
          />
          <input
            className="rounded-xl border border-[#dfe4ed] px-4 py-3 text-xs"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
          <input
            className="rounded-xl border border-[#dfe4ed] px-4 py-3 text-xs"
            placeholder="Phone number"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
          {challenge ? (
            <>
              <input
                className="rounded-xl border border-[#dfe4ed] px-4 py-3 text-xs"
                placeholder="6-digit code"
                value={form.code}
                onChange={(event) => update("code", event.target.value)}
              />
              <button
                disabled={busy}
                onClick={verify}
                className="rounded-xl bg-[var(--portal-accent)] px-5 py-3 text-xs font-semibold text-white"
              >
                Verify
              </button>
            </>
          ) : (
            <button
              disabled={busy}
              onClick={request}
              className="rounded-xl bg-[var(--portal-accent)] px-5 py-3 text-xs font-semibold text-white"
            >
              Send verification code{" "}
              <ArrowRight size={14} className="ml-1 inline" />
            </button>
          )}
        </div>
      )}
      {token && (
        <div className="mt-5 grid grid-cols-[1fr_1fr_auto] gap-2 mobile:grid-cols-1">
          <select
            className="rounded-xl border border-[#dfe4ed] px-3 py-3 text-xs"
            value={form.serviceId}
            onChange={(event) => update("serviceId", event.target.value)}
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            className="rounded-xl border border-[#dfe4ed] px-3 py-3 text-xs"
            value={form.date}
            onChange={(event) => update("date", event.target.value)}
          />
          <button
            disabled={busy}
            onClick={availability}
            className="rounded-xl bg-[var(--portal-accent)] px-5 py-3 text-xs font-semibold text-white"
          >
            Find times
          </button>
        </div>
      )}
      {slots.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.map((slot) => (
            <button
              key={`${slot.staffId}-${slot.time}`}
              disabled={busy}
              onClick={() => book(slot)}
              className="rounded-lg border border-[var(--portal-border)] bg-[var(--portal-pale)] px-3 py-2 text-[10px] font-semibold text-[var(--portal-accent)]"
            >
              {slot.time} · {slot.staffName}
            </button>
          ))}
        </div>
      )}
      {note && <p className="mt-3 text-[11px] text-[#65738b]">{note}</p>}
    </div>
  );
}

function ManageAppointmentsCard({ slug, token, onVerified }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    code: "",
    bookingId: "",
    date: "",
  });
  const [challenge, setChallenge] = useState(null),
    [bookings, setBookings] = useState([]),
    [updates, setUpdates] = useState([]),
    [slots, setSlots] = useState([]),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false);
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (!token) return;
    const loadStatus = () =>
      apiClient
        .get(`/public/businesses/${slug}/customer-status`, {
          params: { verificationToken: token },
        })
        .then(({ data }) => {
          setBookings(data.bookings);
          setUpdates(data.requests || []);
        })
        .catch((error) => setNote(apiError(error)));
    loadStatus();
    const poller = window.setInterval(loadStatus, 10000);
    return () => window.clearInterval(poller);
  }, [slug, token]);
  const request = async () => {
    setBusy(true);
    try {
      const { data } = await apiClient.post(
        `/public/businesses/${slug}/verification/request`,
        { name: form.name, email: form.email, phone: form.phone },
      );
      setChallenge(data.challengeId);
      if (data.developmentCode) {
        update("code", data.developmentCode);
        setNote(`Development code: ${data.developmentCode}`);
      } else setNote("Check your email for the verification code.");
    } catch (error) {
      setNote(apiError(error));
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    try {
      const { data } = await apiClient.post(
        `/public/businesses/${slug}/verification/confirm`,
        { challengeId: challenge, code: form.code },
      );
      const verificationToken = data.verificationToken;
      onVerified(verificationToken);
      const bookingResponse = await apiClient.get(
        `/public/businesses/${slug}/customer-bookings`,
        { params: { verificationToken } },
      );
      setBookings(bookingResponse.data.bookings);
      setNote(
        bookingResponse.data.bookings.length
          ? "Verified. You can manage an appointment here or ask the AI assistant naturally."
          : "No appointments were found for this email.",
      );
    } catch (error) {
      setNote(apiError(error));
    } finally {
      setBusy(false);
    }
  };
  const availability = async () => {
    setBusy(true);
    try {
      const { data } = await apiClient.get(
        `/public/businesses/${slug}/reschedule-availability`,
        {
          params: {
            verificationToken: token,
            bookingId: form.bookingId,
            date: form.date,
          },
        },
      );
      setSlots(data.slots);
      setNote(
        data.slots.length
          ? "Choose a valid alternative time."
          : "No valid alternatives were found for that date.",
      );
    } catch (error) {
      setNote(apiError(error));
    } finally {
      setBusy(false);
    }
  };
  const reschedule = async (slot) => {
    setBusy(true);
    try {
      const { data } = await apiClient.post(
        `/public/businesses/${slug}/reschedule-requests`,
        {
          verificationToken: token,
          bookingId: form.bookingId,
          date: slot.date,
          time: slot.time,
        },
      );
      setSlots([]);
      setNote(data.message);
    } catch (error) {
      setNote(apiError(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-[28px] border border-[#e7e4e0] bg-white p-6 shadow-sm">
      <div className="flex gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--portal-pale)] text-[var(--portal-accent)]">
          <RefreshCw size={20} />
        </span>
        <div>
          <strong className="text-base">Manage an appointment</strong>
          <p className="mt-1 text-[11px] text-[#7a8699]">
            Verify your email, choose your own appointment and request a valid
            alternative.
          </p>
        </div>
      </div>
      {!token && (
        <div className="mt-5 grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mobile:grid-cols-1">
          <input
            className="rounded-xl border border-[#dfe4ed] px-4 py-3 text-xs"
            placeholder="Your name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
          />
          <input
            className="rounded-xl border border-[#dfe4ed] px-4 py-3 text-xs"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
          <input
            className="rounded-xl border border-[#dfe4ed] px-4 py-3 text-xs"
            placeholder="Phone number"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
          {challenge ? (
            <>
              <input
                className="rounded-xl border border-[#dfe4ed] px-4 py-3 text-xs"
                placeholder="6-digit code"
                value={form.code}
                onChange={(event) => update("code", event.target.value)}
              />
              <button
                disabled={busy}
                onClick={verify}
                className="rounded-xl bg-[var(--portal-accent)] px-5 py-3 text-xs font-semibold text-white"
              >
                Verify
              </button>
            </>
          ) : (
            <button
              disabled={busy}
              onClick={request}
              className="rounded-xl bg-[var(--portal-accent)] px-5 py-3 text-xs font-semibold text-white"
            >
              Send verification code
            </button>
          )}
        </div>
      )}
      {token && bookings.length > 0 && (
        <div className="mt-5 grid grid-cols-[1.4fr_1fr_auto] gap-2 mobile:grid-cols-1">
          <select
            className="rounded-xl border border-[#dfe4ed] px-3 py-3 text-xs"
            value={form.bookingId}
            onChange={(event) => {
              update("bookingId", event.target.value);
              setSlots([]);
            }}
          >
            <option value="">Choose appointment</option>
            {bookings
              .filter(
                (item) => !["Cancelled", "Declined"].includes(item.status),
              )
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.service} · {item.date} at {item.time} · {item.status}
                </option>
              ))}
          </select>
          <input
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            className="rounded-xl border border-[#dfe4ed] px-3 py-3 text-xs"
            value={form.date}
            onChange={(event) => update("date", event.target.value)}
          />
          <button
            disabled={busy || !form.bookingId || !form.date}
            onClick={availability}
            className="rounded-xl bg-[var(--portal-accent)] px-5 py-3 text-xs font-semibold text-white"
          >
            Find alternatives
          </button>
        </div>
      )}
      {slots.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.map((slot) => (
            <button
              key={`${slot.date}-${slot.time}`}
              disabled={busy}
              onClick={() => reschedule(slot)}
              className="rounded-lg border border-[var(--portal-border)] bg-[var(--portal-pale)] px-3 py-2 text-[10px] font-semibold text-[var(--portal-accent)]"
            >
              Request {slot.time}
            </button>
          ))}
        </div>
      )}
      {token && (
        <div className="mt-5 rounded-2xl border border-[#e4e8ef] bg-[#f8fafc] p-4">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-xs">Your latest updates</strong>
            <button
              onClick={() =>
                apiClient
                  .get(`/public/businesses/${slug}/customer-status`, {
                    params: { verificationToken: token },
                  })
                  .then(({ data }) => {
                    setBookings(data.bookings);
                    setUpdates(data.requests || []);
                  })
              }
              className="text-[10px] font-semibold text-[var(--portal-accent)]"
            >
              Refresh
            </button>
          </div>
          {updates.length ? (
            <div className="mt-3 space-y-2">
              {updates.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-[10px]"
                >
                  <span>
                    {item.type}
                    {item.date && item.time
                      ? ` · ${item.date} at ${item.time}`
                      : ""}
                  </span>
                  <strong>{item.status}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[10px] text-[#71809b]">
              No recent requests are waiting for a decision.
            </p>
          )}
        </div>
      )}
      {note && <p className="mt-3 text-[11px] text-[#65738b]">{note}</p>}
    </div>
  );
}

function Unavailable({ error }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fffaf6] p-6">
      <div className="max-w-md rounded-3xl bg-white p-9 text-center shadow-xl">
        <Wrench className="mx-auto text-[#ff550b]" size={35} />
        <h1 className="mt-4 text-xl font-bold text-navy">
          Assistant unavailable
        </h1>
        <p className="mt-2 text-sm text-[#71809b]">{error}</p>
      </div>
    </div>
  );
}
