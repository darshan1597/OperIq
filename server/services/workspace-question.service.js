import axios from "axios";
import { reportProgress } from "./request-progress.service.js";
import { z } from "zod";
import { snapshot, listWorkspaceMembers } from "./store.service.js";

const responseSchema = z.object({
  answer: z.union([z.string(), z.number(), z.boolean()])
    .transform((value) => String(value))
    .pipe(z.string().min(1).max(2000)),
});

export function isWorkspaceActionRequest(question) {
  return /\b(create|add|change|update|edit|delete|remove|send|draft|invite|onboard|cancel|reschedule|book|refund|approve|reject|pause|resume|execute|assign|mark|prepare)\b/i.test(question);
}

export function answerKnownWorkspaceFact(question, state, members) {
  if (!/\b(how many|count|number of)\b/i.test(question)) return null;
  const roleByEmail = new Map(members.map((member) => [member.email?.toLowerCase(), member.role || "owner"]));
  const people = new Map();
  for (const member of members) people.set(member.email?.toLowerCase(), member.role || "owner");
  for (const person of state.staff || []) {
    const email = person.email?.toLowerCase();
    people.set(email || `staff:${person.id}`, roleByEmail.get(email) || "staff");
  }
  const roleCount = (role) => [...people.values()].filter((value) => value === role).length;
  if (/\bmanagers?\b/i.test(question)) {
    const count = roleCount("manager");
    return `There ${count === 1 ? "is" : "are"} ${count} manager${count === 1 ? "" : "s"} in this workspace.`;
  }
  if (/\breceptionists?\b/i.test(question)) {
    const count = roleCount("receptionist");
    return `There ${count === 1 ? "is" : "are"} ${count} receptionist${count === 1 ? "" : "s"} in this workspace.`;
  }
  if (/\bstaff(?:s| members?)?\b/i.test(question)) {
    const count = roleCount("staff");
    return `There ${count === 1 ? "is" : "are"} ${count} staff member${count === 1 ? "" : "s"} in this workspace.`;
  }
  if (/\bcustomers?\b/i.test(question)) return `There are ${(state.customers || []).length} customers in this workspace.`;
  if (/\bappointments?|bookings?\b/i.test(question)) return `There are ${(state.appointments || []).length} appointments in this workspace.`;
  if (/\b(pending )?approvals?\b/i.test(question)) {
    const count = (state.approvals || []).filter((item) => item.status === "Pending").length;
    return `There ${count === 1 ? "is" : "are"} ${count} pending approval${count === 1 ? "" : "s"}.`;
  }
  return null;
}

export async function answerWorkspaceQuestion(question, workspaceId) {
  reportProgress("Reading current workspace facts");
  if (isWorkspaceActionRequest(question)) return {
    kind: "action",
    answer: "This request changes workspace data and requires an agent workflow.",
  };
  const [state, members] = await Promise.all([snapshot(workspaceId), listWorkspaceMembers(workspaceId)]);
  const knownAnswer = answerKnownWorkspaceFact(question, state, members);
  if (knownAnswer) return { kind: "answer", answer: knownAnswer };
  const context = {
    business: state.business?.name,
    teamAccess: members.map((member) => ({ role: member.role || "owner" })),
    staff: (state.staff || []).map(({ name, status }) => ({ name, status })),
    customers: (state.customers || []).length,
    appointments: (state.appointments || []).map(({ date, time, service, status }) => ({ date, time, service, status })),
    pendingApprovals: (state.approvals || []).filter((item) => item.status === "Pending").length,
    openComplaints: (state.complaints || []).filter((item) => item.status === "Open").length,
    tasks: (state.tasks || []).map(({ status }) => ({ status })),
  };
  const { data } = await axios.post(
    `${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
    {
      model: process.env.GROQ_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Answer this read-only question about the OperIQ workspace using only the supplied context. Return JSON {answer}. Never propose or perform an action and never invent missing facts. Context: ${JSON.stringify(context)}`,
        },
        { role: "user", content: question },
      ],
    },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 30000 },
  );
  return { kind: "answer", ...responseSchema.parse(JSON.parse(data.choices?.[0]?.message?.content || "{}")) };
}
