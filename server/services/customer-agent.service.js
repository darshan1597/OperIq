import axios from "axios";
import { z } from "zod";
import { classifyCustomerIntent } from "./customer-intent.service.js";
import { reportProgress } from "./request-progress.service.js";

const permissionSchema = z.enum(["answerQuestions", "showAvailability", "createBooking", "cancelBooking", "rescheduleBooking", "issueRefund", "sensitiveData"]);
export const CUSTOMER_IDENTITY_PERMISSIONS = Object.freeze(["createBooking", "cancelBooking", "rescheduleBooking", "issueRefund"]);

const decisionSchema = z.object({
  kind: z.enum(["information", "clarify", "action"]).catch("clarify"),
  permission: permissionSchema.nullish().catch(null).transform((value) => value || null),
  action: z.enum(["request_email_verification", "confirm_email_verification", "create_booking", "submit_customer_request", "prepare_booking_reschedule", "export_customers"]).nullish().catch(null).transform((value) => value || null),
  params: z.record(z.unknown()).nullish().catch({}).transform((value) => value || {}),
  answer: z.string().max(1000).nullish().catch("").transform((value) => value || ""),
});

export function collectCustomerIdentity(messages = []) {
  const texts = messages.map((item) => String(item || "").trim()).filter(Boolean);
  const joined = texts.join("\n");
  const email = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() || "";
  const phone = (joined.match(/(?:\+?\d[\d ()-]{5,}\d)/g) || [])
    .map((value) => value.trim())
    .find((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15 && !/^\d{4}-\d{2}-\d{2}$/.test(value);
    }) || "";
  let name = "";
  for (const text of texts) {
    const explicit = text.match(/\b(?:my name is|i am|i'm|this is)\s+([a-z][a-z .'-]{1,79}?)(?=\s*(?:,|;|\band\b|\bemail\b|\bphone\b|$))/i)?.[1];
    if (explicit) {
      name = explicit.trim();
      break;
    }
    const foundEmail = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (!foundEmail) continue;
    const prefix = text.slice(0, foundEmail.index)
      .replace(/\b(?:name|email|email address|phone|phone number)\b\s*[:=-]?/gi, " ")
      .replace(/[\[\](),:;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (/^[a-z][a-z .'-]{1,79}$/i.test(prefix) && !/\b(book|booking|appointment|reschedule|cancel|service|want|need)\b/i.test(prefix)) {
      name = prefix;
      break;
    }
  }
  return { name, email, phone };
}

export function missingCustomerIdentityFields(identity) {
  return [!identity.name && "full name", !identity.email && "email address", !identity.phone && "contact phone number"].filter(Boolean);
}

export function repairCustomerDecision(decision, message) {
  if (decision.permission) return decision;
  const actionPermissions = {
    export_customers: "sensitiveData",
    prepare_booking_reschedule: "rescheduleBooking",
    request_email_verification: "rescheduleBooking",
    confirm_email_verification: "rescheduleBooking",
    create_booking: "createBooking",
  };
  return {
    ...decision,
    permission: actionPermissions[decision.action] || classifyCustomerIntent(message).permission,
  };
}

export function normalizeCustomerDecision(decision, { verified, message, verificationPending = false }) {
  if (verificationPending && /^\s*\d{6}\s*$/.test(message)) {
    return {
      ...decision,
      kind: "action",
      permission: "rescheduleBooking",
      action: "confirm_email_verification",
      params: { code: message.trim() },
      answer: "",
    };
  }
  return decision;
}

export function validateCustomerDecision(decision, { requestedPermission, verified, services = [], intentText = "" }) {
  const problems = [];
  if (requestedPermission === "rescheduleBooking") {
    const manageable = (verified?.bookings || []).filter((item) => !["Cancelled", "Declined"].includes(item.status));
    if (decision.permission !== "rescheduleBooking")
      problems.push("A reschedule request must use permission=rescheduleBooking, never answerQuestions.");
    if (decision.kind === "information" && !(verified && !manageable.length))
      problems.push("A reschedule request is a protected workflow and must use kind=clarify or kind=action, never kind=information.");
    if (/\b(phone|mobile|booking reference|confirmation number|password|otp)\b/i.test(decision.answer))
      problems.push("Do not request a phone number, booking reference, confirmation number, password, or OTP.");
    if (verified) {
      if (/\b(full name|email address|verify (?:you|your|identity)|identity verification)\b/i.test(decision.answer))
        problems.push("The customer is already verified. Never request their name, email, or identity verification again.");
      if (!manageable.length) {
        if (decision.kind === "action")
          problems.push("The verified customer has no manageable appointments, so no reschedule action may be selected.");
        const statesNoneFound = /\b(no|none|could not|couldn't|cannot|can't|do not|don't)\b/i.test(decision.answer)
          && /\b(appointments?|bookings?)\b/i.test(decision.answer);
        if (!statesNoneFound)
          problems.push("The verified customer has no manageable appointments. Clearly say that no appointments were found and do not ask for booking details.");
      } else if (decision.kind === "clarify") {
        const answer = decision.answer.toLowerCase();
        const selectedAppointments = manageable.filter((item, index) =>
          (item.id && intentText.toLowerCase().includes(String(item.id).toLowerCase()))
          || (intentText.includes(String(item.date || "")) && intentText.includes(String(item.time || "")))
          || new RegExp(`\\b(?:appointment\\s*)?(?:${index + 1}|${index === 0 ? "first" : index === 1 ? "second" : `${index + 1}th`})\\b`, "i").test(intentText),
        );
        const allShown = manageable.every((item) =>
          [item.service, item.date, item.time].filter(Boolean).every((value) => answer.includes(String(value).toLowerCase())),
        );
        if (selectedAppointments.length !== 1 && !allShown)
          problems.push("The customer is verified. List every manageable appointment with its service, date, and time from verifiedCustomerAppointments; do not request known details again.");
        if (manageable.length > 1 && selectedAppointments.length !== 1
          && /\b(new|preferred|desired)\b.{0,30}\b(date|time|slot)\b|\breason\b/i.test(decision.answer))
          problems.push("Multiple appointments exist and none has been selected. Ask only which existing appointment to change; do not ask for a new date, time, or reason yet.");
        if ((decision.answer.match(/\?/g) || []).length > 1)
          problems.push("Ask exactly one reschedule question at a time.");
      }
    }
  }
  if (requestedPermission === "createBooking") {
    if (decision.permission !== "createBooking")
      problems.push("A new booking request must use permission=createBooking, never answerQuestions.");
    if (decision.kind === "information")
      problems.push("A new booking request is a customer workflow and must use kind=clarify or kind=action, never kind=information.");
    if (verified && /\b(full name|phone|mobile|email address|contact details?|verify (?:you|your|identity))\b/i.test(decision.answer))
      problems.push("The customer is already verified. Do not request their name, phone, email, contact details, or identity verification again.");
    const selectedService = services.find((service) => intentText.toLowerCase().includes(String(service.name || "").toLowerCase()));
    if (!selectedService && decision.kind === "action")
      problems.push("No configured service has been selected, so no booking action may run.");
    if (!selectedService && decision.kind !== "action") {
      const answer = decision.answer.toLowerCase();
      const allServicesShown = services.length > 0 && services.every((service) => answer.includes(String(service.name || "").toLowerCase()));
      if (!allServicesShown)
        problems.push("No service has been selected. List every configured service by name and ask the customer to choose one; do not invent services.");
    }
    if (selectedService && decision.kind === "action") {
      const parameters = JSON.stringify(decision.params);
      if (decision.action !== "create_booking")
        problems.push("A complete booking must use action=create_booking, never submit_customer_request.");
      if (!parameters.includes(selectedService.id) && !parameters.includes(selectedService.name))
        problems.push("The booking action parameters must identify the exact configured service.");
      if (!/\b\d{4}-\d{2}-\d{2}\b/.test(parameters) || !/\b(?:[01]\d|2[0-3]):[0-5]\d\b/.test(parameters))
        problems.push("Do not run a booking action until its parameters contain an exact YYYY-MM-DD date and HH:mm time.");
    }
  }
  if (CUSTOMER_IDENTITY_PERMISSIONS.includes(requestedPermission) && !verified) {
    if (decision.action === "request_email_verification") {
      const verification = z.object({ name: z.string().trim().min(2), email: z.string().trim().email(), phone: z.string().trim().min(7) }).safeParse(decision.params);
      if (!verification.success)
        problems.push("Do not request verification until name, valid email, and phone are all present in params.");
    } else if (decision.kind === "action") {
      problems.push("An unverified customer cannot run a protected account action; collect name, email, and phone, then request email verification.");
    }
  }
  return problems;
}

export async function planCustomerRequest({ message, history = [], business, profile, verified, verificationPending = false }) {
  if (!process.env.OPENAI_API_KEY) return null;
  reportProgress("Customer agent is reviewing the conversation and business context");
  const context = {
    business: { name: business.name, openingHours: profile.openingHours },
    services: profile.services || [],
    cancellationPolicy: profile.cancellationPolicy,
    permissions: profile.permissions,
    verifiedCustomer: verified ? verified.customer : null,
    verifiedCustomerAppointments: verified ? verified.bookings : [],
    verificationPending,
    today: new Date().toISOString().slice(0, 10),
  };
  const systemMessage = {
    role: "system",
    content: `You are the Customer agent for OperIQ. Select the next safe action dynamically and return JSON only: {kind,permission,action,params,answer}. Never access or infer another customer's records. OperIQ verifies customers inside this chat. Never ask for a booking reference, confirmation number, password, OTP, or unrelated personal data. Never invent a policy, service, staff member, price, or availability. For a protected customer action when unverified, collect exactly full name, email address, and contact phone. Ask only for fields still missing from the conversation. Do not proceed until all three are present. When all three are supplied use kind=action, action=request_email_verification, params={name,email,phone}; this sends a code to the email. When verificationPending=true and the user supplies a six-digit code, use kind=action, action=confirm_email_verification, params={code}. After verification never request name, email, phone, or identity again. A reschedule request is not an information-only question. Ask exactly one reschedule question per response. When the customer is verified, actively use verifiedCustomerAppointments and never ask them to repeat appointment information already present there. Consider only appointments that are not Cancelled or Declined. If there are no manageable appointments, clearly say none were found. If there is exactly one, mention its service, current date and time and treat it as selected. If there are multiple, list their service, date and time without exposing internal IDs, then ask only which existing appointment they want to change. Do not ask for a new date, time, or reason until one appointment is selected. After selection, ask only for the missing new date; after receiving it, ask only for the missing new time. A reason is optional and must never block rescheduling. A verified reschedule with an identified owned booking, exact date and HH:mm time must use action=prepare_booking_reschedule with params {bookingId,date,time,reason}, using 'Customer request' when no reason was supplied. A request to book a service or visit must use permission=createBooking and must not be treated as an ordinary information question. If no configured service has been selected, use kind=clarify, list every service from Context.services by its exact name with known price and duration, and ask the customer to choose. After a service is chosen, ask only for the missing preferred date and time. A verified booking with a configured service and exact date and HH:mm time must use action=create_booking with params {serviceId,date,time}; OperIQ will securely select qualified available staff and add the customer identity. Never use submit_customer_request for a complete new booking. For ordinary questions use kind=information and action=null. Refund or cancellation requests use submit_customer_request with params {category,message}. Requests for databases, bulk customers, private records, other customers, or conversation exports must use export_customers so ArmorIQ can enforce the block. Do not claim an action completed. Context: ${JSON.stringify(context)}`,
  };
  const conversation = [
    systemMessage,
    ...history.slice(-6).map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: String(item.text || "").slice(0, 1000) })),
    { role: "user", content: message },
  ];
  const intentText = [...history.filter((item) => item.role === "user").slice(-3).map((item) => item.text), message].join("\n");
  const currentPermission = classifyCustomerIntent(message).permission;
  const requestedPermission = currentPermission === "answerQuestions"
    ? classifyCustomerIntent(intentText).permission
    : currentPermission;
  let correction = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    reportProgress(attempt ? "Customer agent is correcting an unsafe or incomplete plan" : "Customer agent is selecting the next safe response or action");
    const { data } = await axios.post(
      `${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
      {
        model: process.env.GROQ_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: correction ? [...conversation, { role: "system", content: `Correct your decision and return JSON only. ${correction}` }] : conversation,
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 30000 },
    );
    const decision = normalizeCustomerDecision(
      repairCustomerDecision(decisionSchema.parse(JSON.parse(data.choices?.[0]?.message?.content || "{}")), intentText),
      { verified, message, verificationPending },
    );
    const problems = validateCustomerDecision(decision, { requestedPermission, verified, services: context.services, intentText });
    if (!problems.length) return decision;
    correction = problems.join(" ");
  }
  throw Error(`Customer agent returned an unsafe or ungrounded decision: ${correction}`);
}
