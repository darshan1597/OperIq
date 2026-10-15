import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  findPublishedWorkspaceBySlug,
  findPublishedWorkspaceRecordBySlug,
  findWorkspaceBySlug,
  mutate,
  slugBelongsToAnotherWorkspace,
  snapshot,
} from "../services/store.service.js";
import { generateBusinessAnswer } from "../services/business-assistant.service.js";
import { createAuthority, governedCall, isLive } from "../services/governance.service.js";
import { confirmCustomerChallenge, createCustomerChallenge, formatCustomerStatus, getVerifiedCustomerContext } from "./public-booking.controller.js";
import { collectCustomerIdentity, CUSTOMER_IDENTITY_PERMISSIONS, missingCustomerIdentityFields, planCustomerRequest } from "../services/customer-agent.service.js";
import { schemas, validateBooking } from "../services/tool.service.js";
import { reportProgress } from "../services/request-progress.service.js";
import {
  activeSecurityRateLimit,
  ensureBusinessSecurityEscalation,
  recordBlockedSecurityAttempt,
  securityActorKey,
} from "../services/security-rate-limit.service.js";
import {
  actionGuidance,
  classifyCustomerIntent,
  intentStep,
} from "../services/customer-intent.service.js";

const mode = z.enum(["automatic", "verification", "approval", "disabled"]);
const durationMinutes = (value) => Number.parseInt(String(value), 10) || 60;
const profileSchema = z.object({
  slug: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and single hyphens",
      )
      .min(3)
      .max(48),
  ]),
  description: z.string().trim().max(600),
  industry: z.string().trim().max(80),
  phone: z.string().trim().max(40),
  email: z.union([z.literal(""), z.string().trim().email()]),
  address: z.string().trim().max(240),
  openingHours: z.string().trim().max(500),
  heroImage: z.union([
    z.literal(""),
    z.string().startsWith("data:image/").max(2500000, "Banner image is too large"),
  ]),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Choose a valid website accent color"),
  tone: z.enum(["friendly", "professional", "concise", "warm"]),
  languages: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  greeting: z.string().trim().max(300),
  cancellationPolicy: z.string().trim().max(1000),
  escalationRule: z.string().trim().max(1000),
  specialInstructions: z.string().trim().max(2000),
  permissionsReviewed: z.boolean(),
  accuracyConfirmed: z.boolean(),
  services: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().trim().max(100),
        price: z.string().trim().max(50),
        duration: z.string().trim().max(50),
        description: z.string().trim().max(240),
      }),
    )
    .max(30),
  faqs: z
    .array(
      z.object({
        id: z.string().optional(),
        question: z.string().trim().max(240),
        answer: z.string().trim().max(1000),
      }),
    )
    .max(50),
  permissions: z.object({
    answerQuestions: mode,
    showAvailability: mode,
    createBooking: mode,
    rescheduleBooking: mode,
    cancelBooking: mode,
    issueRefund: mode,
  }),
});

const requiredForPublish = (profile, business) =>
  [
    [business.name, "Business name"],
    [profile.industry, "Business type"],
    [profile.description, "Business description"],
    [profile.email || profile.phone, "At least one customer contact method"],
    [profile.openingHours, "Opening hours"],
    [profile.languages.length, "At least one supported language"],
    [
      profile.services.some((service) => service.name.length >= 2),
      "At least one named service",
    ],
    [
      profile.services.every((service) => service.name.length >= 2),
      "Complete or remove unnamed services",
    ],
    [
      profile.faqs.every(
        (faq) => faq.question.length >= 3 && faq.answer.length >= 2,
      ),
      "Complete or remove unfinished FAQs",
    ],
    [
      profile.cancellationPolicy,
      "Cancellation policy (or state that it does not apply)",
    ],
    [profile.escalationRule, "Human handoff rule"],
    [profile.permissionsReviewed, "Review AI permissions"],
    [profile.accuracyConfirmed, "Confirm the information is accurate"],
  ]
    .filter(([value]) => !value)
    .map(([, label]) => label);

export async function saveAiProfile(req, res) {
  const input = profileSchema.parse(req.body);
  if (await slugBelongsToAnotherWorkspace(input.slug, req.user.id))
    throw Object.assign(
      Error("That customer portal address is already in use"),
      { status: 409 },
    );
  await mutate(req.user.id, (state) => {
    state.business.industry = input.industry;
    state.aiProfile = {
      ...(state.aiProfile || {}),
      ...input,
      services: input.services.map((item) => ({
        ...item,
        id: item.id || randomUUID(),
      })),
      faqs: input.faqs.map((item) => ({
        ...item,
        id: item.id || randomUUID(),
      })),
      status: state.aiProfile?.status === "published" ? "published" : "draft",
      updatedAt: new Date().toISOString(),
    };
  });
  return res.json({ profile: (await snapshot(req.user.id)).aiProfile });
}

export async function publishAiProfile(req, res) {
  const state = await snapshot(req.user.id);
  const profile = profileSchema.parse(state.aiProfile || {});
  const missing = requiredForPublish(profile, state.business);
  if (missing.length)
    throw Object.assign(
      Error(`Complete these items before publishing: ${missing.join(", ")}`),
      { status: 422 },
    );
  if (await slugBelongsToAnotherWorkspace(profile.slug, req.user.id))
    throw Object.assign(
      Error("That customer portal address is already in use"),
      { status: 409 },
    );
  await mutate(req.user.id, (next) => {
    next.aiProfile.status = "published";
    next.aiProfile.publishedAt = new Date().toISOString();
    next.aiProfile.updatedAt = new Date().toISOString();
  });
  return res.json({ profile: (await snapshot(req.user.id)).aiProfile });
}

export async function unpublishAiProfile(req, res) {
  await mutate(req.user.id, (state) => {
    if (!state.aiProfile)
      throw Object.assign(Error("AI profile not found"), { status: 404 });
    state.aiProfile.status = "draft";
    state.aiProfile.updatedAt = new Date().toISOString();
  });
  return res.json({ profile: (await snapshot(req.user.id)).aiProfile });
}

export async function getPublicBusiness(req, res) {
  reportProgress("Loading the published business profile and services");
  const state = await findPublishedWorkspaceBySlug(req.params.slug);
  if (!state) {
    const unavailableState = await findWorkspaceBySlug(req.params.slug);
    if (unavailableState?.aiProfile?.platformStatus === "paused")
      throw Object.assign(
        Error("This business assistant is temporarily paused. Please try again later."),
        { status: 503 },
      );
    throw Object.assign(Error("This business assistant is not published"), {
      status: 404,
    });
  }
  const p = state.aiProfile;
  return res.json({
    business: {
      name: state.business.name,
      industry: p.industry,
      description: p.description,
      phone: p.phone,
      email: p.email,
      address: p.address,
      openingHours: p.openingHours,
      heroImage: p.heroImage || "",
      accentColor: p.accentColor || "#ff550b",
    },
    assistant: {
      greeting:
        p.greeting || `Hi! How can ${state.business.name} help you today?`,
      tone: p.tone,
      languages: p.languages,
    },
    services: p.services,
    faqs: p.faqs,
    permissions: p.permissions,
  });
}

export async function previewAssistant(req, res) {
  reportProgress("Business assistant is reading the customer message");
  const input = z.object({
    message: z.string().trim().min(1).max(1000),
    verificationToken: z.string().uuid().optional(),
    verificationChallengeId: z.string().uuid().optional(),
    clientSessionId: z.string().uuid().optional(),
    activeFlow: z.enum(["createBooking", "cancelBooking", "rescheduleBooking", "issueRefund", "checkStatus", "confirmAlternative"]).optional(),
    history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1000) })).max(10).optional(),
  }).parse(req.body);
  const question = input.message;
  const currentIntent = classifyCustomerIntent(question);
  reportProgress(`Customer request classified as ${currentIntent.permission}`);
  const conversationText = [...(input.history || []).filter((item) => item.role === "user").slice(-4).map((item) => item.text), question].join("\n");
  const conversationIntent = currentIntent.permission === "sensitiveData"
    ? currentIntent
    : input.activeFlow
    ? { permission: input.activeFlow, action: null, agent: "customer" }
    : currentIntent.permission === "answerQuestions" ? classifyCustomerIntent(conversationText) : currentIntent;
  reportProgress("Loading the published business rules and customer context");
  const record = req.user
    ? { workspaceId: req.user.id, data: await snapshot(req.user.id) }
    : await findPublishedWorkspaceRecordBySlug(req.params.slug);
  const state = record?.data;
  if (!state)
    throw Object.assign(Error("Business assistant not found"), { status: 404 });
  const profile = state.aiProfile || {};
  const verified = input.verificationToken
    ? await getVerifiedCustomerContext(input.verificationToken, record.workspaceId)
    : null;
  const actorKey = securityActorKey(req, verified?.customer?.id, input.clientSessionId);
  await ensureBusinessSecurityEscalation({
    workspaceId: record.workspaceId,
    businessName: state.business?.name || profile.slug || "Business",
  });
  const activeLimit = await activeSecurityRateLimit(record.workspaceId, actorKey);
  if (activeLimit)
    return res.json({
      answer: "This customer session is temporarily restricted because multiple protected requests were blocked. You can use this Business AI again after the restriction expires.",
      source: "OperIQ customer security restriction",
      action: "rateLimited",
      permission: "disabled",
      governance: {
        status: "Blocked",
        source: "OperIQ customer security restriction",
        executed: false,
        rateLimited: true,
        retryAt: activeLimit.until,
      },
    });
  const awaitingAlternative = verified?.requests?.find((item) => item.type === "Booking reschedule" && item.status === "Awaiting customer");
  if (awaitingAlternative && input.activeFlow === "confirmAlternative") {
    if (/\b(?:yes|accept|confirm|works|okay|ok)\b/i.test(question)) {
      await mutate(record.workspaceId, (next) => {
        const proposal = next.approvals.find((item) => item.id === awaitingAlternative.id && item.customerId === verified.customer.id);
        if (!proposal) throw Object.assign(Error("Reschedule proposal not found"), { status: 404 });
        proposal.status = "Pending";
        proposal.executionStatus = "Not started";
        proposal.armorDecision = undefined;
        proposal.armorSource = undefined;
        proposal.result = "Customer accepted the alternative time; waiting for owner approval.";
        proposal.reason = "Customer accepted the alternative after the original approved time became unavailable";
        proposal.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      });
      return res.json({ answer: `Thanks. I sent ${awaitingAlternative.date} at ${awaitingAlternative.time} to the owner for final approval. Your current appointment remains unchanged until the owner approves it and ArmorIQ authorizes the update.`, source: "Customer agent", action: "rescheduleBooking", permission: "approval", clearActiveFlow: true, governance: { status: "Not required", source: "Customer confirmation", executed: false } });
    }
    const choice = (awaitingAlternative.alternativeOptions || []).find((item) => question.includes(item.date) && question.includes(item.time));
    if (choice) {
      await mutate(record.workspaceId, (next) => {
        const proposal = next.approvals.find((item) => item.id === awaitingAlternative.id && item.customerId === verified.customer.id);
        if (proposal) Object.assign(proposal, { date: choice.date, time: choice.time, staffId: choice.staffId });
      });
      return res.json({ answer: `${choice.date} at ${choice.time} is available. Would you like to accept this replacement time?`, source: "Customer agent", action: "rescheduleBooking", permission: "approval", activeFlow: "confirmAlternative", governance: { status: "Not required", source: "Validated availability", executed: false } });
    }
    const options = (awaitingAlternative.alternativeOptions || []).slice(0, 5).map((item) => `- ${item.date} at ${item.time}`).join("\n");
    return res.json({ answer: `No problem. Choose another available time:\n${options}\n\nReply with the full date and time.`, source: "Customer agent", action: "rescheduleBooking", permission: "approval", activeFlow: "confirmAlternative", governance: { status: "Not required", source: "Validated availability", executed: false } });
  }
  const statusRequested = input.activeFlow === "checkStatus" || /\b(?:status|update|progress|what happened|approved|rejected|completed)\b.{0,50}\b(?:booking|appointment|request|reschedule|cancellation|refund)\b|\b(?:booking|appointment|request|reschedule|cancellation|refund)\b.{0,50}\b(?:status|update|progress|approved|rejected|completed)\b|\b(?:is|was|did|has)\s+(?:it|my\s+(?:booking|appointment))\s+(?:been\s+)?rescheduled\b/i.test(question);
  if (input.verificationChallengeId && /^\d{6}$/.test(question)) {
    const confirmation = await confirmCustomerChallenge({ challengeId: input.verificationChallengeId, code: question });
    const confirmedContext = await getVerifiedCustomerContext(confirmation.verificationToken, record.workspaceId);
    const manageableBookings = confirmedContext.bookings.filter((item) => !["Cancelled", "Declined"].includes(item.status));
    return res.json({
      answer: input.activeFlow === "checkStatus"
        ? formatCustomerStatus(confirmedContext)
        : manageableBookings.length
        ? `You are verified as ${confirmation.customer.name}. I can now securely access only your appointments. Tell me what change you would like to make.`
        : `You are verified as ${confirmation.customer.name}. There are no active appointments on this account to reschedule. Would you like me to help you book a new appointment? Tell me the service and your preferred date and time.`,
      source: "Customer verification",
      action: "verifyCustomer",
      permission: "verification",
      verificationToken: confirmation.verificationToken,
      clearVerificationChallenge: true,
      ...(input.activeFlow === "checkStatus" ? { clearActiveFlow: true } : {}),
      governance: { status: "Not required", source: "OperIQ email verification", executed: true },
    });
  }
  const requestedIntent = conversationIntent;
  if (statusRequested && verified)
    return res.json({
      answer: formatCustomerStatus(verified),
      source: "Customer agent",
      action: "checkStatus",
      permission: "verification",
      ...(awaitingAlternative ? { activeFlow: "confirmAlternative" } : { clearActiveFlow: true }),
      governance: { status: "Not required", source: "Verified customer records", executed: false },
    });
  if (statusRequested && !verified) {
    const customerMessages = [...(input.history || []).filter((item) => item.role === "user").map((item) => item.text), question];
    const identity = collectCustomerIdentity(customerMessages);
    const missing = missingCustomerIdentityFields(identity);
    if (missing.length) {
      const requestedFields = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}`;
      return res.json({
        answer: `I can check only your own updates. Before I send the verification code, please provide your ${requestedFields}.`,
        source: "Customer agent",
        action: "checkStatus",
        permission: "verification",
        activeFlow: "checkStatus",
        governance: { status: "Not required", source: "Customer verification required", executed: false },
      });
    }
    const challenge = await createCustomerChallenge({ slug: req.params.slug, ...identity });
    return res.json({
      answer: challenge.developmentCode
        ? `I sent the verification code. For local development, the code is **${challenge.developmentCode}**. Reply with that six-digit code.`
        : "I sent a six-digit verification code to your email. Reply here with the code.",
      source: "Customer verification",
      action: "verifyCustomer",
      permission: "verification",
      verificationChallengeId: challenge.challengeId,
      activeFlow: "checkStatus",
      governance: { status: "Not required", source: "OperIQ email verification", executed: false },
    });
  }
  const manageableBookings = (verified?.bookings || []).filter((item) => !["Cancelled", "Declined"].includes(item.status));
  let selectedRescheduleBooking = manageableBookings.length === 1 ? manageableBookings[0] : null;
  if (verified && requestedIntent.permission === "rescheduleBooking" && !manageableBookings.length)
    return res.json({
      answer: "I couldn’t find any active appointments associated with your verified account, so there is nothing available to reschedule. I can help you book a new appointment instead—tell me the service and your preferred date and time.",
      source: "Customer agent",
      action: "rescheduleBooking",
      permission: profile.permissions?.rescheduleBooking || "disabled",
      governance: { status: "Not required", source: "Verified customer records", executed: false },
      activeFlow: "rescheduleBooking",
    });
  if (verified && requestedIntent.permission === "rescheduleBooking" && manageableBookings.length > 1) {
    const customerReplies = [...(input.history || []).filter((item) => item.role === "user").map((item) => item.text), question].join("\n").toLowerCase();
    const selectedBookings = manageableBookings.filter((booking, index) => {
      const timeSelected = booking.time && new RegExp(`(?:^|\\D)${String(booking.time).replace(":", "\\:")}(?:$|\\D)`).test(customerReplies);
      const numbered = new RegExp(`\\b(?:appointment\\s*)?(?:${index + 1}|${index === 0 ? "first" : index === 1 ? "second" : `${index + 1}th`})\\b`).test(customerReplies);
      return timeSelected || numbered;
    });
    selectedRescheduleBooking = selectedBookings.length === 1 ? selectedBookings[0] : null;
    if (selectedBookings.length !== 1) {
      const appointments = manageableBookings.map((booking, index) =>
        `${index + 1}. **${booking.service}** on **${booking.date} at ${booking.time}**`,
      ).join("\n");
      return res.json({
        answer: `${appointments}\n\nWhich existing appointment would you like to reschedule? Reply with its number or current time.`,
        source: "Customer agent",
        action: "rescheduleBooking",
        permission: profile.permissions?.rescheduleBooking || "disabled",
        governance: { status: "Not required", source: "Verified customer records", executed: false },
        activeFlow: "rescheduleBooking",
      });
    }
  }
  const namedService = (profile.services || []).find((service) => question.toLowerCase().includes(String(service.name || "").toLowerCase()));
  if (verified && requestedIntent.permission === "createBooking" && !namedService) {
    const serviceList = (profile.services || []).map((service) => {
      const details = [service.price, service.duration].filter(Boolean).join(" · ");
      return `- **${service.name}**${details ? ` — ${details}` : ""}`;
    }).join("\n");
    return res.json({
      answer: `${serviceList || "No bookable services are currently configured."}\n\nWhich service would you like to book?`,
      source: "Customer agent",
      action: "createBooking",
      permission: profile.permissions?.createBooking || "disabled",
      governance: { status: "Not required", source: "Verified business service catalog", executed: false },
    });
  }
  if (!verified && CUSTOMER_IDENTITY_PERMISSIONS.includes(requestedIntent.permission)) {
    const customerMessages = [...(input.history || []).filter((item) => item.role === "user").map((item) => item.text), question];
    const identity = collectCustomerIdentity(customerMessages);
    const missing = missingCustomerIdentityFields(identity);
    if (missing.length) {
      const requestedFields = missing.length === 1
        ? missing[0]
        : `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}`;
      return res.json({
        answer: `Before I send the email verification code, please provide your ${requestedFields}.`,
        source: "Customer agent",
        action: requestedIntent.permission,
        permission: profile.permissions?.[requestedIntent.permission] || "disabled",
        governance: { status: "Not required", source: "Awaiting customer verification details", executed: false },
        activeFlow: requestedIntent.permission,
      });
    }
    const challenge = await createCustomerChallenge({ slug: req.params.slug, ...identity });
    return res.json({
      answer: challenge.developmentCode
        ? `I sent the verification code. For local development, the code is **${challenge.developmentCode}**. Reply with that six-digit code.`
        : "I sent a six-digit verification code to your email. Reply here with the code.",
      source: "Customer verification",
      action: "verifyCustomer",
      permission: "verification",
      verificationChallengeId: challenge.challengeId,
      governance: { status: "Not required", source: "OperIQ email verification", executed: false },
      activeFlow: requestedIntent.permission,
    });
  }
  let modelDecision = null;
  if (requestedIntent.permission === "sensitiveData") {
    modelDecision = {
      kind: "action",
      permission: "sensitiveData",
      action: "export_customers",
      params: {},
      answer: "",
    };
  } else if (verified && requestedIntent.permission === "rescheduleBooking" && selectedRescheduleBooking) {
    const customerReplies = [...(input.history || []).filter((item) => item.role === "user").map((item) => item.text), question].join("\n");
    const requestedDate = [...customerReplies.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].at(-1)?.[0] || "";
    const requestedTime = question.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/)?.[0] || "";
    if (/\bwho\b.{0,50}\b(booked|booking|appointment|slot|time)\b|\b(booked|booking|appointment|slot|time)\b.{0,50}\bwho\b/i.test(question))
      return res.json({
        answer: "I can’t reveal another customer’s identity or appointment details. Please choose one of the available times shown above.",
        source: "Customer agent",
        action: "rescheduleBooking",
        permission: profile.permissions?.rescheduleBooking || "disabled",
        activeFlow: "rescheduleBooking",
        governance: { status: "Not required", source: "Customer privacy boundary", executed: false },
      });
    if (!requestedDate)
      return res.json({
        answer: `What new date would you like for your ${selectedRescheduleBooking.service} appointment? Please use YYYY-MM-DD.`,
        source: "Customer agent",
        action: "rescheduleBooking",
        permission: profile.permissions?.rescheduleBooking || "disabled",
        governance: { status: "Not required", source: "Awaiting new appointment date", executed: false },
        activeFlow: "rescheduleBooking",
      });
    if (!requestedTime)
      return res.json({
        answer: `What new time would you like on ${requestedDate}? Please use HH:mm.`,
        source: "Customer agent",
        action: "rescheduleBooking",
        permission: profile.permissions?.rescheduleBooking || "disabled",
        governance: { status: "Not required", source: "Awaiting new appointment time", executed: false },
        activeFlow: "rescheduleBooking",
      });
    modelDecision = {
      kind: "action",
      permission: "rescheduleBooking",
      action: "prepare_booking_reschedule",
      params: { bookingId: selectedRescheduleBooking.id, date: requestedDate, time: requestedTime, reason: "Customer request" },
      answer: "",
    };
  }
  if (!modelDecision) try {
      modelDecision = await planCustomerRequest({
        message: question,
        history: input.history || [],
        business: state.business,
        profile,
        verified,
        verificationPending: Boolean(input.verificationChallengeId),
      });
    } catch (error) {
      console.error("[Customer agent planning]", error.message);
  }
  if (!modelDecision && ["createBooking", "cancelBooking", "rescheduleBooking", "issueRefund", "sensitiveData"].includes(conversationIntent.permission))
    throw Object.assign(Error("The customer AI could not plan this protected request. Please try again."), { status: 503 });
  if (modelDecision?.action === "request_email_verification") {
    const params = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email(), phone: z.string().trim().min(7).max(30) }).parse(modelDecision.params);
    const challenge = await createCustomerChallenge({ slug: req.params.slug, ...params });
    return res.json({
      answer: challenge.developmentCode
        ? `I sent the verification code. For local development, the code is **${challenge.developmentCode}**. Reply with that six-digit code.`
        : "I sent a six-digit verification code to your email. Reply here with the code.",
      source: "Customer verification",
      action: "verifyCustomer",
      permission: "verification",
      verificationChallengeId: challenge.challengeId,
      governance: { status: "Not required", source: "OperIQ email verification", executed: false },
    });
  }
  if (modelDecision?.action === "confirm_email_verification") {
    if (!input.verificationChallengeId)
      throw Object.assign(Error("Please request a new verification code first"), { status: 400 });
    const params = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(modelDecision.params);
    const confirmation = await confirmCustomerChallenge({ challengeId: input.verificationChallengeId, code: params.code });
    return res.json({
      answer: `You are verified as ${confirmation.customer.name}. I can now securely access only your appointments. Please continue with the booking change you want to make.`,
      source: "Customer verification",
      action: "verifyCustomer",
      permission: "verification",
      verificationToken: confirmation.verificationToken,
      clearVerificationChallenge: true,
      governance: { status: "Not required", source: "OperIQ email verification", executed: true },
    });
  }
  if (modelDecision?.kind === "clarify")
    return res.json({
      answer: modelDecision.answer || "Please provide the missing details before I continue.",
      source: "Customer agent",
      action: modelDecision.permission,
      permission: profile.permissions?.[modelDecision.permission] || "disabled",
      governance: { status: "Not required", source: "Awaiting customer details", executed: false },
    });
  if (modelDecision?.kind === "information" && modelDecision.permission !== "answerQuestions")
    return res.json({
      answer: modelDecision.answer,
      source: "Customer agent",
      action: modelDecision.permission,
      permission: profile.permissions?.[modelDecision.permission] || "disabled",
      governance: { status: "Not required", source: "Verified customer context", executed: false },
    });
  const intent = modelDecision
    ? modelDecision.kind === "action" && modelDecision.action
      ? { permission: modelDecision.permission, action: modelDecision.action, agent: modelDecision.action === "export_customers" ? "security" : ["create_booking", "prepare_booking_reschedule"].includes(modelDecision.action) ? "operations" : "customer" }
      : { permission: modelDecision.permission, action: null, agent: "customer" }
    : classifyCustomerIntent(question);
  const permission = profile.permissions?.[intent.permission] || "disabled";
  if (intent.action) {
    const requestId = randomUUID();
    const audit = [{
      at: new Date().toISOString(),
      requestId,
      stage: "customer_intent.classified",
      permission: intent.permission,
      action: intent.action,
      agent: intent.agent,
      configuredPermission: permission,
    }];
    console.info("[Customer AI audit]", JSON.stringify(audit[0]));
    const step = modelDecision?.kind === "action"
      ? {
          agent: intent.agent,
          action: intent.action,
          params: modelDecision.params,
          explanation: `Customer agent selected ${intent.action} for: ${question.slice(0, 240)}`,
        }
      : intentStep(intent, question);
    let workflowRunId = null;
    if (step.action === "create_booking") {
      if (!verified)
        return res.json({ answer: "Please verify your email before creating a booking.", source: "Customer agent", action: "createBooking", permission, governance: { status: "Not required", source: "Customer verification required", executed: false } });
      const bookingRequest = z.object({
        serviceId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^(0\d|1\d|2[0-3]):[0-5]\d$/),
      }).parse(step.params);
      const service = (profile.services || []).find((item) => item.id === bookingRequest.serviceId);
      if (!service) throw Object.assign(Error("The selected service is not available"), { status: 422 });
      if (permission === "disabled") throw Object.assign(Error("Online booking is disabled for this business"), { status: 403 });
      if (permission === "approval") throw Object.assign(Error("New bookings require owner approval and cannot be confirmed automatically"), { status: 403 });
      const duration = durationMinutes(service.duration);
      let selectedParams = null;
      for (const staff of state.staff.filter((item) => item.status === "Available")) {
        const candidate = { customerId: verified.customer.id, staffId: staff.id, date: bookingRequest.date, time: bookingRequest.time, service: service.name, duration };
        try {
          validateBooking(state, candidate);
          selectedParams = candidate;
          break;
        } catch { /* Try another qualified staff member. */ }
      }
      if (!selectedParams) throw Object.assign(Error("No qualified staff member is available at that date and time"), { status: 422 });
      step.params = selectedParams;
      step.explanation = `Create a verified ${service.name} booking after availability validation.`;
    }
    if (step.action === "prepare_booking_reschedule") {
      if (!verified)
        return res.json({ answer: "Please verify your email in Manage an appointment before I access your bookings.", source: "Customer agent", action: "rescheduleBooking", permission, governance: { status: "Not required", source: "Customer verification required", executed: false } });
      step.params = schemas.prepare_booking_reschedule.parse(step.params);
      const booking = verified.bookings.find((item) => item.id === step.params.bookingId);
      if (!booking) throw Object.assign(Error("That appointment does not belong to the verified customer"), { status: 403 });
      if (permission === "disabled") throw Object.assign(Error("Online rescheduling is disabled for this business"), { status: 403 });
      const rescheduleState = { ...state, appointments: state.appointments.filter((item) => item.id !== booking.id) };
      const rescheduleCandidate = { ...booking, customerId: verified.customer.id, date: step.params.date, time: step.params.time };
      try {
        validateBooking(rescheduleState, rescheduleCandidate);
      } catch (error) {
        const alternatives = [];
        for (let hour = 9; hour <= 17; hour += 1) {
          const time = `${String(hour).padStart(2, "0")}:00`;
          if (step.params.date === booking.date && time === booking.time) continue;
          try {
            validateBooking(rescheduleState, { ...rescheduleCandidate, time });
            alternatives.push(time);
          } catch { /* Only valid alternatives are shown. */ }
        }
        return res.json({
          answer: alternatives.length
            ? `${step.params.time} is unavailable on ${step.params.date}. Available times are ${alternatives.join(", ")}. Which time would you prefer?`
            : `There are no available times on ${step.params.date}. What other date would you like?`,
          source: "Customer agent",
          action: "rescheduleBooking",
          permission,
          activeFlow: "rescheduleBooking",
          governance: { status: "Not required", source: "OperIQ availability validation", executed: false },
        });
      }
      const pendingReschedule = (state.approvals || []).find((item) =>
        item.type === "Booking reschedule" && item.bookingId === booking.id && item.status === "Pending",
      );
      if (pendingReschedule)
        return res.json({
          answer: "A reschedule request for this appointment is already waiting for the business owner’s decision. I haven’t created a duplicate request.",
          source: "OperIQ workflow",
          action: "rescheduleBooking",
          permission,
          clearActiveFlow: true,
          governance: { status: "Waiting for owner approval", source: "Existing governed reschedule proposal", executed: false },
        });
      workflowRunId = randomUUID();
      const at = new Date().toISOString();
      await mutate(record.workspaceId, (next) => {
        next.runs.unshift({ id: workflowRunId, goal: question, workflow: "reschedule", status: "Running", createdAt: at });
        next.events.unshift(
          { id: randomUUID(), runId: workflowRunId, step: 3, totalSteps: 4, agent: "operations", action: "check_reschedule_availability", status: "Completed", source: "OperIQ scheduling rules", reason: `${step.params.date} at ${step.params.time} is available.`, executed: true, createdAt: at },
          { id: randomUUID(), runId: workflowRunId, step: 2, totalSteps: 4, agent: "resolution", action: "check_reschedule_policy", status: "Completed", source: "Business policy", reason: "The verified customer may request owner approval for a reschedule.", executed: true, createdAt: at },
          { id: randomUUID(), runId: workflowRunId, step: 1, totalSteps: 4, agent: "customer", action: "understand_reschedule_request", status: "Completed", source: "AI customer agent", reason: "The model selected the verified customer's appointment and requested time.", executed: true, createdAt: at },
        );
      });
    }
    const identity = {
      workspaceId: record.workspaceId,
      userEmail: req.user?.email || `public-${profile.slug}@operiq.tech`,
      requestId,
      audit,
    };
    let governance;
    try {
      if (!isLive()) {
        governance = {
          status: "Unavailable",
          source: "Sandbox",
          reason: "Real customer actions require live ArmorIQ enforcement.",
          executed: false,
        };
      } else {
        const authority = await createAuthority(question, [step], identity);
        governance = await governedCall(authority, step, identity);
      }
    } catch (error) {
      const failure = {
        at: new Date().toISOString(),
        requestId,
        stage: "governance.unhandled_failure",
        errorName: error?.name || "Error",
        errorMessage: String(error?.message || error),
        httpStatus: error?.statusCode || error?.response?.status || null,
      };
      audit.push(failure);
      console.error("[Customer AI audit]", JSON.stringify(failure));
      governance = {
        status: "Failed",
        source: "ArmorIQ",
        reason: error.message,
        executed: false,
        requestId,
        audit,
      };
    }
    const { continuation, data: governedData, ...storedGovernance } = governance;
    if (verified && step.action === "submit_customer_request" && storedGovernance.status === "Completed" && governedData?.id)
      await mutate(record.workspaceId, (next) => {
        const request = (next.customerRequests || []).find((item) => item.id === governedData.id);
        if (request) request.customerId = verified.customer.id;
      });
    if (intent.permission === "sensitiveData" && governance.status === "Completed") {
      storedGovernance.status = "Unexpectedly allowed";
      storedGovernance.reason = "ArmorIQ allowed a sensitive export. The result was suppressed by OperIQ; review the ArmorIQ policy immediately.";
      storedGovernance.executed = true;
    }
    const eventId = randomUUID();
    await mutate(record.workspaceId, (next) =>
      next.events.unshift({
        id: eventId,
        runId: workflowRunId,
        agent: intent.agent,
        action: intent.action,
        explanation: `Customer chat intent: ${question.slice(0, 240)}`,
        permission,
        ...storedGovernance,
        createdAt: new Date().toISOString(),
      }),
    );
    const securityDecision = storedGovernance.status === "Blocked"
      ? await recordBlockedSecurityAttempt({
          workspaceId: record.workspaceId,
          businessName: state.business?.name || profile.slug || "Business",
          actorKey,
          action: step.action,
          requestId,
        })
      : null;
    if (workflowRunId) await mutate(record.workspaceId, (next) => {
      const run = next.runs.find((item) => item.id === workflowRunId);
      if (run) run.status = storedGovernance.status === "Completed" ? "Waiting for owner approval" : storedGovernance.status;
      if (storedGovernance.status === "Completed") {
        const proposal = next.approvals.find((item) => item.type === "Booking reschedule" && item.bookingId === step.params.bookingId && item.status === "Pending" && !item.runId);
        if (proposal) proposal.runId = workflowRunId;
      }
    });
    if (continuation) continuation.then((resumed) => mutate(record.workspaceId, (next) => {
      const event = next.events.find((item) => item.id === eventId);
      if (!event) return;
      const { data: _privateData, ...safeOutcome } = resumed;
      Object.assign(event, safeOutcome, { resumedAt: new Date().toISOString() });
      if (intent.permission === "sensitiveData" && resumed.status === "Completed")
        Object.assign(event, {
          status: "Unexpectedly allowed",
          reason: "ArmorIQ allowed a sensitive export. The result was suppressed by OperIQ; review the ArmorIQ policy immediately.",
        });
      if (workflowRunId) {
        const run = next.runs.find((item) => item.id === workflowRunId);
        if (run) run.status = resumed.status === "Completed" ? "Waiting for owner approval" : resumed.status;
        if (resumed.status === "Completed") {
          const proposal = next.approvals.find((item) => item.type === "Booking reschedule" && item.bookingId === step.params.bookingId && item.status === "Pending" && !item.runId);
          if (proposal) proposal.runId = workflowRunId;
        }
      }
    })).catch((error) => mutate(record.workspaceId, (next) => {
      const event = next.events.find((item) => item.id === eventId);
      if (event) Object.assign(event, { status: "Failed", reason: error.message, executed: false });
    }));
    return res.json({
      answer: securityDecision?.businessEscalated
        ? "ArmorIQ blocked this protected request. This customer is now restricted for 30 minutes. Multiple independent customers have triggered security restrictions, so OperIQ sent a business-wide AI pause request for human approval."
        : securityDecision?.rateLimited
        ? "ArmorIQ blocked this protected request. This customer session is now restricted from using the Business AI for 30 minutes. Other customers can continue normally."
        : step.action === "prepare_booking_reschedule" && /reschedule proposal is already pending/i.test(storedGovernance.reason || "")
        ? "A reschedule request for this appointment is already waiting for the business owner’s decision. I haven’t created a duplicate request."
        : step.action === "create_booking" && storedGovernance.status === "Completed"
        ? `Your ${step.params.service} appointment is confirmed for ${step.params.date} at ${step.params.time}.`
        : step.action === "prepare_booking_reschedule" && storedGovernance.status === "Completed"
          ? "I checked the business policy and availability, then sent your reschedule proposal to the owner for approval. Your appointment has not changed yet."
        : actionGuidance(intent, permission, profile.escalationRule, storedGovernance),
      source: storedGovernance.source,
      action: intent.permission,
      permission,
      governance: {
        ...storedGovernance,
        ...(securityDecision?.rateLimited ? { rateLimited: true, retryAt: securityDecision.until, businessEscalated: Boolean(securityDecision.businessEscalated) } : {}),
        reason: ["Blocked", "Held", "Failed", "Unexpectedly allowed"].includes(storedGovernance.status) ? undefined : storedGovernance.reason,
      },
      diagnostics: { requestId, audit },
      ...(intent.permission === "rescheduleBooking"
        ? storedGovernance.status === "Completed" ? { clearActiveFlow: true } : { activeFlow: "rescheduleBooking" }
        : {}),
    });
  }
  if (profile.permissions?.answerQuestions === "disabled")
    return res.json({
      answer:
        profile.escalationRule ||
        "Online questions are currently handled by our business team.",
      source: "Business boundary",
      action: "answerQuestions",
      permission: "disabled",
    });
  const words = question
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2);
  const faq = (profile.faqs || [])
    .map((item) => ({
      item,
      score: words.filter((word) =>
        `${item.question} ${item.answer}`.toLowerCase().includes(word),
      ).length,
    }))
    .sort((a, b) => b.score - a.score)[0];
  const service = (profile.services || []).find((item) =>
    words.some((word) => item.name.toLowerCase().includes(word)),
  );
  let answer;
  if (faq?.score) answer = faq.item.answer;
  else if (service)
    answer = `${service.name}${service.price ? ` costs ${service.price}` : ""}${service.duration ? ` and takes ${service.duration}` : ""}. ${service.description || "Would you like help booking it?"}`;
  else if (/hour|open|close|when/.test(question.toLowerCase()))
    answer =
      profile.openingHours || "The business has not added opening hours yet.";
  else if (/cancel/.test(question.toLowerCase()))
    answer =
      profile.cancellationPolicy ||
      "The cancellation policy has not been added yet.";
  else
    answer = `I don’t have a confirmed answer for that yet. ${profile.escalationRule || "I can pass your question to the business team."}`;
  const generated = await generateBusinessAnswer({
    business: state.business,
    profile,
    question,
    fallback: answer,
  });
  return res.json({
    ...generated,
    action: "answerQuestions",
    permission,
    governance: {
      status: "Not required",
      source: "Information-only request",
      executed: false,
    },
  });
}
