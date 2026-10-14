import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Globe2,
  ImagePlus,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { apiError } from "../api/client.js";

const defaultProfile = {
  status: "draft",
  slug: "",
  description: "",
  phone: "",
  email: "",
  address: "",
  openingHours: "",
  heroImage: "",
  accentColor: "#ff550b",
  tone: "friendly",
  languages: ["English"],
  greeting: "",
  cancellationPolicy: "",
  escalationRule: "",
  specialInstructions: "",
  permissionsReviewed: false,
  accuracyConfirmed: false,
  services: [],
  faqs: [],
  permissions: {
    answerQuestions: "automatic",
    showAvailability: "automatic",
    createBooking: "verification",
    rescheduleBooking: "verification",
    cancelBooking: "approval",
    issueRefund: "approval",
  },
};

const steps = [
  "Business",
  "Services",
  "Knowledge",
  "Boundaries",
  "Test & publish",
];
const permissionLabels = {
  answerQuestions: [
    "Answer business questions",
    "Use approved business information",
  ],
  showAvailability: ["Show availability", "Share open appointment times"],
  createBooking: ["Create bookings", "Add a new customer appointment"],
  rescheduleBooking: ["Reschedule bookings", "Move an existing appointment"],
  cancelBooking: ["Cancel bookings", "Cancel a confirmed appointment"],
  issueRefund: ["Request refunds", "Start a refund or compensation request"],
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-[#dfe4ed] bg-white px-4 py-3 text-sm text-navy outline-none placeholder:text-[#9ba6b8] focus:border-orange focus:ring-4 focus:ring-[#ff550b10]";
const labelClass = "block text-xs font-semibold text-[#30415f]";

export default function AISetupPage({ data, api, setNotice }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(() => ({
    ...defaultProfile,
    ...(data.aiProfile || {}),
    industry: data.aiProfile?.industry || data.business.industry || "",
    permissions: {
      ...defaultProfile.permissions,
      ...(data.aiProfile?.permissions || {}),
    },
  }));
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const update = (key, value) =>
    setProfile((current) => ({ ...current, [key]: value }));
  const completion = useMemo(() => {
    const checks = [
      profile.slug,
      profile.industry,
      profile.description,
      profile.email || profile.phone,
      profile.openingHours,
      profile.languages.length,
      profile.services.length,
      profile.cancellationPolicy,
      profile.escalationRule,
      profile.permissionsReviewed,
      profile.accuracyConfirmed,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  const save = async (quiet = false) => {
    setSaving(true);
    try {
      const result = await api("/ai-profile", profile, "PUT");
      setProfile((current) => ({ ...current, ...result.profile }));
      if (!quiet) setNotice("Your AI setup has been saved");
      return true;
    } catch (error) {
      setNotice(apiError(error));
      return false;
    } finally {
      setSaving(false);
    }
  };
  const next = async () => {
    if (await save(true))
      setStep((value) => Math.min(value + 1, steps.length - 1));
  };
  const publish = async () => {
    if (!(await save(true))) return;
    setSaving(true);
    try {
      const result = await api("/ai-profile/publish", {});
      setProfile((current) => ({ ...current, ...result.profile }));
      setNotice("Your customer assistant is now live");
    } catch (error) {
      setNotice(apiError(error));
    } finally {
      setSaving(false);
    }
  };
  const unpublish = async () => {
    setSaving(true);
    try {
      const result = await api("/ai-profile/unpublish", {});
      setProfile((current) => ({ ...current, ...result.profile }));
      setNotice("Customer portal returned to draft");
    } catch (error) {
      setNotice(apiError(error));
    } finally {
      setSaving(false);
    }
  };
  const askPreview = async () => {
    if (!(await save(true)) || question.trim().length < 2) return;
    try {
      setAnswer(await api("/ai-profile/preview", { message: question }));
    } catch (error) {
      setNotice(apiError(error));
    }
  };
  const addItem = (key, value) => update(key, [...profile[key], value]);
  const editItem = (key, index, field, value) =>
    update(
      key,
      profile[key].map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  const removeItem = (key, index) =>
    update(
      key,
      profile[key].filter((_, i) => i !== index),
    );
  const uploadHeroImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Choose a JPG, PNG, or WebP image");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1600 / image.width, 900 / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        update("heroImage", canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => setNotice("That image could not be read");
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="pb-10">
      <section className="mb-6 flex items-center justify-between gap-5 rounded-2xl border border-[#ffe3d1] bg-gradient-to-r from-[#fff7f0] to-white px-6 py-5 mobile:flex-col mobile:items-start">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange text-white">
            <Sparkles size={23} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-navy">
              Teach your business AI
            </h2>
            <p className="mt-1 text-xs text-[#71809b]">
              Add trusted knowledge, choose what it can do, then publish it for
              customers.
            </p>
          </div>
        </div>
        <div className="min-w-[190px]">
          <div className="mb-2 flex justify-between text-xs">
            <span className="font-semibold text-navy">Setup progress</span>
            <span className="text-orange">{completion}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#f1f3f7]">
            <div
              className="h-full rounded-full bg-orange transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </section>
      <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-6 compact:grid-cols-1">
        <aside className="sticky top-6 h-fit self-start rounded-2xl border border-border bg-white p-3 compact:static compact:flex compact:overflow-x-auto">
          {steps.map((name, index) => (
            <button
              key={name}
              onClick={() => setStep(index)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold compact:min-w-fit ${step === index ? "bg-[#fff1e7] text-orange" : "text-[#63718b] hover:bg-[#f7f8fb]"}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] ${index < step || (profile.status === "published" && index === 4) ? "bg-[#e6f7ed] text-[#079653]" : step === index ? "bg-orange text-white" : "bg-[#f0f2f6] text-[#7b879b]"}`}
              >
                {index < step ? <Check size={14} /> : index + 1}
              </span>
              {name}
            </button>
          ))}
        </aside>
        <section className="min-w-0 rounded-2xl border border-border bg-white p-7 mobile:p-4">
          {step === 0 && (
            <div>
              <Title
                title="Tell us about your business"
                text="This information shapes how your assistant introduces and represents your business."
              />
              <div className="mb-5 rounded-xl border border-[#e5e9f0] bg-[#f8f9fc] p-4 text-xs leading-5 text-[#61708a]">
                Fields marked <strong className="text-navy">Required</strong> are needed to publish. <strong className="text-navy">Optional</strong> details can be added later.
              </div>
              <div className="grid grid-cols-2 gap-5 mobile:grid-cols-1">
                <Field label="Business name">
                  <input
                    className={fieldClass}
                    value={data.business.name}
                    disabled
                  />
                </Field>
                <Field label="Business type">
                  <input
                    className={fieldClass}
                    value={profile.industry}
                    onChange={(e) => update("industry", e.target.value)}
                    placeholder="Salon, repair shop, clinic…"
                  />
                </Field>
              </div>
              <Field label="Customer portal address">
                <div className="mt-2 flex overflow-hidden rounded-xl border border-[#dfe4ed] focus-within:border-orange">
                  <input
                    className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
                    value={profile.slug}
                    onChange={(e) =>
                      update(
                        "slug",
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    placeholder="your-business-name"
                  />
                  <span className="flex items-center bg-[#f7f8fb] px-4 text-xs text-[#71809b]">
                    .operiq.tech
                  </span>
                </div>
              </Field>
              <Field label="What does your business do?">
                <textarea
                  className={`${fieldClass} min-h-24 resize-y`}
                  value={profile.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Describe what you offer and who you serve."
                />
              </Field>
              <Field label="Website accent color" optional>
                <div className="mt-2 flex items-center gap-4 rounded-xl border border-[#dfe4ed] bg-[#fafbfc] p-3 mobile:flex-wrap">
                  <label className="relative h-11 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-[#dfe4ed] bg-white p-1">
                    <input
                      type="color"
                      value={profile.accentColor}
                      onChange={(event) => update("accentColor", event.target.value)}
                      className="h-full w-full cursor-pointer border-0 bg-transparent p-0"
                      aria-label="Choose website accent color"
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-xs uppercase text-navy">{profile.accentColor}</strong>
                    <span className="mt-1 block text-[10px] leading-4 text-[#7b8799]">Used for buttons, icons, highlights, and soft color accents on your customer website.</span>
                  </div>
                  <button type="button" onClick={() => update("accentColor", "#ff550b")} className="rounded-lg border border-[#dfe4ed] bg-white px-3 py-2 text-[10px] font-semibold text-[#5f6f89]">Reset</button>
                </div>
              </Field>
              <Field label="Website banner image" optional>
                <div className="mt-2 overflow-hidden rounded-2xl border border-dashed border-[#d9e0ea] bg-[#fafbfc]">
                  {profile.heroImage ? (
                    <div className="relative h-44">
                      <img src={profile.heroImage} alt="Business banner preview" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => update("heroImage", "")} className="absolute right-3 top-3 rounded-lg bg-white/95 px-3 py-2 text-[10px] font-semibold text-[#b54747] shadow-sm">Remove image</button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center px-5 py-8 text-center">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0e5] text-orange"><ImagePlus size={20} /></span>
                      <strong className="mt-3 text-xs text-navy">Upload a banner image</strong>
                      <span className="mt-1 text-[10px] text-[#7b8799]">Optional · JPG, PNG or WebP · landscape images work best</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => uploadHeroImage(event.target.files?.[0])} />
                    </label>
                  )}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-5 mobile:grid-cols-1">
                <Field label="Business email" requirement="Required">
                  <input
                    className={fieldClass}
                    value={profile.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="hello@business.com"
                  />
                </Field>
                <Field label="Phone" requirement="Required">
                  <input
                    className={fieldClass}
                    value={profile.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="Customer contact number"
                  />
                </Field>
              </div>
              <Field label="Address" optional>
                <input
                  className={fieldClass}
                  value={profile.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Business address"
                />
              </Field>
              <Field label="Opening hours">
                <textarea
                  className={`${fieldClass} min-h-20`}
                  value={profile.openingHours}
                  onChange={(e) => update("openingHours", e.target.value)}
                  placeholder="Monday–Saturday, 9:00 AM–7:00 PM"
                />
              </Field>
            </div>
          )}
          {step === 1 && (
            <div>
              <Title
                title="Add your services"
                text="Customers can ask about these services, prices, durations, and booking options."
              />
              <div className="space-y-4">
                {profile.services.length === 0 && (
                  <Empty text="No services added yet. Add the first service your customers can book." />
                )}
                {profile.services.map((service, index) => (
                  <div
                    key={service.id || index}
                    className="rounded-2xl border border-[#e7eaf0] bg-[#fbfcfe] p-4"
                  >
                    <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 mobile:grid-cols-1">
                      <input
                        className={fieldClass.replace("mt-2 ", "")}
                        value={service.name}
                        onChange={(e) =>
                          editItem("services", index, "name", e.target.value)
                        }
                        placeholder="Service name"
                      />
                      <input
                        className={fieldClass.replace("mt-2 ", "")}
                        value={service.price}
                        onChange={(e) =>
                          editItem("services", index, "price", e.target.value)
                        }
                        placeholder="₹500"
                      />
                      <input
                        className={fieldClass.replace("mt-2 ", "")}
                        value={service.duration}
                        onChange={(e) =>
                          editItem(
                            "services",
                            index,
                            "duration",
                            e.target.value,
                          )
                        }
                        placeholder="45 min"
                      />
                      <button
                        onClick={() => removeItem("services", index)}
                        className="grid h-11 w-11 place-items-center rounded-xl text-[#9a6d6d] hover:bg-[#fff0f0]"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <input
                      className={fieldClass}
                      value={service.description}
                      onChange={(e) =>
                        editItem(
                          "services",
                          index,
                          "description",
                          e.target.value,
                        )
                      }
                      placeholder="Short description (optional)"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  addItem("services", {
                    name: "",
                    price: "",
                    duration: "",
                    description: "",
                  })
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#ffd7bf] bg-[#fff7f1] px-4 py-3 text-xs font-semibold text-orange"
              >
                <Plus size={16} /> Add service
              </button>
            </div>
          )}
          {step === 2 && (
            <div>
              <Title
                title="Give it the right answers"
                text="Add policies, common questions, and instructions that are specific to your business."
              />
              <div className="grid grid-cols-2 gap-5 mobile:grid-cols-1">
                <Field label="Conversation tone">
                  <select
                    className={fieldClass}
                    value={profile.tone}
                    onChange={(e) => update("tone", e.target.value)}
                  >
                    {["friendly", "professional", "concise", "warm"].map(
                      (x) => (
                        <option key={x} value={x}>
                          {x[0].toUpperCase() + x.slice(1)}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Languages">
                  <input
                    className={fieldClass}
                    value={profile.languages.join(", ")}
                    onChange={(e) =>
                      update(
                        "languages",
                        e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="English, Hindi"
                  />
                </Field>
              </div>
              <Field label="Welcome message" optional>
                <input
                  className={fieldClass}
                  value={profile.greeting}
                  onChange={(e) => update("greeting", e.target.value)}
                  placeholder={`Hi! How can ${data.business.name} help you today?`}
                />
              </Field>
              <Field label="Cancellation and rescheduling policy">
                <textarea
                  className={`${fieldClass} min-h-24`}
                  value={profile.cancellationPolicy}
                  onChange={(e) => update("cancellationPolicy", e.target.value)}
                  placeholder="Customers may reschedule free of charge up to 24 hours before…"
                />
              </Field>
              <Field label="When should the AI involve a person?">
                <textarea
                  className={`${fieldClass} min-h-24`}
                  value={profile.escalationRule}
                  onChange={(e) => update("escalationRule", e.target.value)}
                  placeholder="Escalate complaints, payment disputes, and anything the AI cannot confirm…"
                />
              </Field>
              <Field label="Special instructions" optional>
                <textarea
                  className={`${fieldClass} min-h-24`}
                  value={profile.specialInstructions}
                  onChange={(e) =>
                    update("specialInstructions", e.target.value)
                  }
                  placeholder="Never promise unavailable times. Ask for confirmation before booking…"
                />
              </Field>
              <div className="mt-7 flex items-center justify-between">
                <h3 className="text-sm font-bold text-navy">
                  Frequently asked questions <span className="ml-2 rounded-full bg-[#f0f2f5] px-2 py-1 text-[9px] font-semibold text-[#7b8799]">Optional</span>
                </h3>
              </div>
              <div className="mt-3 space-y-3">
                {profile.faqs.length === 0 && (
                  <Empty text="Add answers to the questions customers ask most often." />
                )}
                {profile.faqs.map((faq, index) => (
                  <div
                    key={faq.id || index}
                    className="relative rounded-2xl border border-[#e7eaf0] p-4 pr-14"
                  >
                    <input
                      className={fieldClass.replace("mt-2 ", "")}
                      value={faq.question}
                      onChange={(e) =>
                        editItem("faqs", index, "question", e.target.value)
                      }
                      placeholder="Question"
                    />
                    <textarea
                      className={`${fieldClass} min-h-20`}
                      value={faq.answer}
                      onChange={(e) =>
                        editItem("faqs", index, "answer", e.target.value)
                      }
                      placeholder="Approved answer"
                    />
                    <button
                      onClick={() => removeItem("faqs", index)}
                      className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-[#9a6d6d] hover:bg-[#fff0f0]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                  onClick={() => addItem("faqs", { question: "", answer: "" })}
                  className="ml-auto mt-4 flex items-center gap-1 text-xs font-semibold text-orange"
              >
                <Plus size={15} /> Add FAQ
              </button>
            </div>
          )}
          {step === 3 && (
            <div>
              <Title
                title="Choose what your AI can do"
                text="These controls apply even when a customer asks the AI to do something outside its role."
              />
              <div className="overflow-hidden rounded-2xl border border-[#e7eaf0]">
                {Object.entries(permissionLabels).map(
                  ([key, [title, text]], index) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between gap-5 p-4 mobile:flex-col mobile:items-start ${index ? "border-t border-[#edf0f5]" : ""}`}
                    >
                      <div>
                        <strong className="text-sm text-navy">{title}</strong>
                        <p className="mt-1 text-xs text-[#71809b]">{text}</p>
                      </div>
                      <select
                        className="rounded-xl border border-[#dfe4ed] bg-white px-3 py-2.5 text-xs font-semibold text-[#40506f]"
                        value={profile.permissions[key]}
                        onChange={(e) =>
                          update("permissions", {
                            ...profile.permissions,
                            [key]: e.target.value,
                          })
                        }
                      >
                        <option value="automatic">Allow automatically</option>
                        <option value="verification">
                          Require customer verification
                        </option>
                        <option value="approval">Require owner approval</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  ),
                )}
              </div>
              <div className="mt-5 rounded-xl border border-[#dce9ff] bg-[#f5f8ff] p-4 text-xs leading-5 text-[#526681]">
                The server always enforces these boundaries. In live mode,
                permitted business actions are additionally authorized and
                audited through ArmorIQ. Customer instructions cannot change them.
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#e3e8f0] p-4">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange" checked={profile.permissionsReviewed} onChange={(e) => update("permissionsReviewed", e.target.checked)} />
                <span><strong className="block text-xs text-navy">I reviewed these permissions</strong><small className="mt-1 text-[11px] leading-5 text-[#74819a]">Required before publishing so the AI never receives authority accidentally.</small></span>
              </label>
            </div>
          )}
          {step === 4 && (
            <div>
              <Title
                title="Test before customers use it"
                text="Try real customer questions. The preview answers only from the information you supplied."
              />
              <div className="rounded-2xl border border-[#e7eaf0] bg-[#fbfcfe] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0e4] text-orange">
                    <Sparkles size={19} />
                  </span>
                  <div>
                    <strong className="text-sm text-navy">
                      {data.business.name} assistant
                    </strong>
                    <p className="mt-0.5 text-[11px] text-[#7b879d]">
                      Private test · no customer actions are executed
                    </p>
                  </div>
                </div>
                {answer && (
                  <div className="mb-4 rounded-2xl rounded-bl-md bg-white p-4 text-sm leading-6 text-[#40506f] shadow-sm">
                    <p>{answer.answer}</p>
                    <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-[#98a2b3]">
                      Source: {answer.source}
                    </span>
                    {answer.governance?.status &&
                      answer.governance.status !== "Not required" && (
                        <span className="mt-1 block text-[10px] font-semibold text-[#64748b]">
                          Governance: {answer.governance.status}
                          {answer.governance.reason
                            ? ` — ${answer.governance.reason}`
                            : ""}
                        </span>
                      )}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && askPreview()}
                    className="min-w-0 flex-1 rounded-xl border border-[#dfe4ed] bg-white px-4 py-3 text-sm outline-none focus:border-orange"
                    placeholder="Ask about a service, opening hours, or policy…"
                  />
                  <button
                    onClick={askPreview}
                    className="grid h-12 w-12 place-items-center rounded-xl bg-orange text-white"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#e3e8f0] bg-white p-4">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange" checked={profile.accuracyConfirmed} onChange={(e) => update("accuracyConfirmed", e.target.checked)} />
                <span><strong className="block text-xs text-navy">I confirm the required information is accurate</strong><small className="mt-1 text-[11px] leading-5 text-[#74819a]">Required before publishing. Optional information can still be added or updated later.</small></span>
              </label>
              <div className="mt-4 rounded-2xl border border-[#ffe0cd] bg-[#fff9f4] p-5">
                <div className="flex items-start justify-between gap-4 mobile:flex-col">
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe2 size={19} className="text-orange" />
                      <strong className="text-sm text-navy">
                        Customer portal
                      </strong>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${profile.status === "published" ? "bg-[#e4f7ec] text-[#07834a]" : "bg-[#eef0f4] text-[#748097]"}`}
                      >
                        {profile.status === "published" ? "LIVE" : "DRAFT"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[#71809b]">
                      {profile.slug
                        ? `${profile.slug}.operiq.tech`
                        : "Choose a portal address before publishing"}
                    </p>
                  </div>
                  {profile.status === "published" && profile.slug && (
                    <a
                      href={`/b/${profile.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-orange"
                    >
                      Open portal <ExternalLink size={14} />
                    </a>
                  )}
                </div>
                <div className="mt-5 flex gap-3">
                  {profile.status === "published" ? (
                    <button
                      onClick={unpublish}
                      disabled={saving}
                      className="rounded-xl border border-[#e0e4eb] bg-white px-5 py-3 text-xs font-semibold text-[#53627d]"
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      onClick={publish}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-orange/10"
                    >
                      <Globe2 size={16} />
                      {saving ? "Publishing…" : "Publish customer AI"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="mt-8 flex items-center justify-between border-t border-[#edf0f5] pt-5">
            <button
              onClick={() => setStep((v) => Math.max(0, v - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-[#65738c] disabled:opacity-30"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => save()}
                disabled={saving}
                className="rounded-xl border border-[#dfe4ed] bg-white px-5 py-3 text-xs font-semibold text-[#40506f]"
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
              {step < steps.length - 1 && (
                <button
                  onClick={next}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange px-5 py-3 text-xs font-semibold text-white"
                >
                  Continue <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Title({ title, text }) {
  return (
    <div className="mb-7">
      <h2 className="text-xl font-bold tracking-tight text-navy">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#71809b]">{text}</p>
    </div>
  );
}

function Field({ label, children, optional = false, requirement = "" }) {
  return (
    <label className={`${labelClass} mt-5`}>
      <span className="flex items-center gap-2">
        {label}
        <em className={`rounded-full px-2 py-0.5 text-[9px] font-semibold not-italic ${optional ? "bg-[#f0f2f5] text-[#7b8799]" : "bg-[#fff0e6] text-[#d14a0a]"}`}>
          {optional ? "Optional" : requirement || "Required"}
        </em>
      </span>
      {children}
    </label>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dfe4ed] bg-[#fafbfc] px-5 py-8 text-center text-xs text-[#7c889c]">
      {text}
    </div>
  );
}
