export function platformAdminEmails() {
  return new Set(
    String(process.env.OPERIQ_ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformAdmin(email) {
  return platformAdminEmails().has(String(email || "").trim().toLowerCase());
}
