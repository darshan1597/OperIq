import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  findPublishedWorkspaceBySlug,
  mutate,
  slugBelongsToAnotherWorkspace,
  snapshot,
} from "../services/store.service.js";
import { generateBusinessAnswer } from "../services/business-assistant.service.js";

const mode = z.enum(["automatic", "verification", "approval", "disabled"]);
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
  const state = await findPublishedWorkspaceBySlug(req.params.slug);
  if (!state)
    throw Object.assign(Error("This business assistant is not published"), {
      status: 404,
    });
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
  const question = z
    .object({ message: z.string().trim().min(2).max(1000) })
    .parse(req.body).message;
  const state = req.user
    ? await snapshot(req.user.id)
    : await findPublishedWorkspaceBySlug(req.params.slug);
  if (!state)
    throw Object.assign(Error("Business assistant not found"), { status: 404 });
  const profile = state.aiProfile || {};
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
    permission: profile.permissions?.answerQuestions || "disabled",
  });
}
