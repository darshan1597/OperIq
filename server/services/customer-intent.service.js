const rules = [
  {
    permission: "issueRefund",
    action: "submit_customer_request",
    agent: "customer",
    pattern: /\b(refund|money back|compensation|reimburse)\b/i,
  },
  {
    permission: "cancelBooking",
    action: "submit_customer_request",
    agent: "customer",
    pattern: /\b(cancel|delete)\b.{0,40}\b(booking|appointment|reservation)\b|\b(booking|appointment|reservation)\b.{0,40}\b(cancel|delete)\b/i,
  },
  {
    permission: "rescheduleBooking",
    action: "submit_customer_request",
    agent: "customer",
    pattern: /\b(reschedule|re-?schedule)\b|\b(move|change)\b.{0,40}\b(booking|appointment|reservation|time|date)\b/i,
  },
  {
    permission: "createBooking",
    action: "submit_customer_request",
    agent: "customer",
    pattern: /\b(book|schedule|make|create)\b.{0,40}\b(booking|appointment|reservation|slot|service|visit)\b|\b(booking|appointment|reservation|service|visit)\b.{0,40}\b(book|schedule|create)\b/i,
  },
  {
    permission: "sensitiveData",
    action: "export_customers",
    agent: "security",
    pattern: /\b(database|customer data|customer records?|all customers?|export customers?|emails? and appointment history)\b|\bwho\b.{0,60}\b(occupied|booked|reserved|appointment|slot)\b|\b(occupied|booked|reserved|appointment|slot)\b.{0,60}\bwho\b|\bwhose\b.{0,40}\b(appointment|booking|slot)\b/i,
  },
  {
    permission: "showAvailability",
    action: null,
    agent: "customer",
    pattern: /\b(availability|available|open slots?|free slots?|times? available)\b/i,
  },
];

export function classifyCustomerIntent(message) {
  const match = rules.find((rule) => rule.pattern.test(message));
  return match || {
    permission: "answerQuestions",
    action: null,
    agent: "customer",
  };
}

export function actionGuidance(intent, permission, escalationRule, governance) {
  const handoff = escalationRule || "A member of the business team can help you with this request.";
  const labels = {
    issueRefund: "refund or compensation",
    cancelBooking: "booking cancellation",
    rescheduleBooking: "booking reschedule",
    createBooking: "new booking",
    showAvailability: "availability request",
    sensitiveData: "sensitive data request",
  };
  const label = labels[intent.permission] || "request";

  if (governance?.status === "Blocked")
    return `ArmorIQ blocked this ${label}. No protected action was executed and no private data was shared.`;
  if (governance?.status === "Held")
    return `ArmorIQ placed this ${label} on hold for business approval. Nothing has been changed yet.`;
  if (governance?.status === "Completed")
    return intent.permission === "sensitiveData"
      ? "This sensitive action was unexpectedly allowed, so no result will be shown here. The business must review its ArmorIQ policy."
      : `Your ${label} was securely submitted to the business team.`;
  if (governance?.status === "Failed")
    return `I couldn’t safely process this ${label}. No protected action was completed. Please contact the business team if you still need help.`;
  if (governance?.status === "Unexpectedly allowed")
    return "ArmorIQ unexpectedly allowed this sensitive action. OperIQ suppressed the result, and the business must correct its policy before trying again.";
  if (governance?.status === "Unavailable")
    return `I can’t process this ${label} because live ArmorIQ enforcement is unavailable. No protected action was executed.`;

  if (permission === "disabled")
    return `I can’t process this ${label} online. ${handoff}`;
  if (permission === "approval")
    return `This ${label} requires review and approval from the business owner. I haven’t made any change. ${handoff}`;
  if (permission === "verification")
    return `I can help with this ${label} after the customer is verified. I haven’t made any change yet. Please use the secure verification and booking controls on this page.`;
  if (intent.permission === "showAvailability")
    return "Please choose a service and date in the booking section to see current availability.";
  return `I understood this as a ${label}. Please use the secure action controls on this page so the details can be validated before anything changes.`;
}

export function intentStep(intent, message) {
  if (!intent.action) return null;
  const common = {
    agent: intent.agent,
    action: intent.action,
    explanation: `Process a customer request through ArmorIQ policy enforcement: ${message.slice(0, 240)}`,
  };
  if (intent.action === "submit_customer_request") {
    const categories = {
      issueRefund: "refund",
      cancelBooking: "cancellation",
      rescheduleBooking: "reschedule",
      createBooking: "booking",
    };
    return { ...common, params: { category: categories[intent.permission], message } };
  }
  return { ...common, params: {} };
}
