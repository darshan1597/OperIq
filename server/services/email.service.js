import nodemailer from "nodemailer";

function emailConfig() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  const clientUrl = process.env.CLIENT_URL?.trim()?.replace(/\/$/, "");
  if (!user || !pass || !clientUrl)
    throw Error("GMAIL_USER, GMAIL_APP_PASSWORD, and CLIENT_URL are required to send invitations");
  return { user, pass, clientUrl };
}

export function assertEmailDeliveryConfigured() {
  emailConfig();
}

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export async function sendWorkspaceInvitation({ email, role, token, businessName }) {
  const { user, pass, clientUrl } = emailConfig();
  const inviteUrl = `${clientUrl}/invite/${encodeURIComponent(token)}`;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  const safeBusiness = escapeHtml(businessName);
  const safeRole = escapeHtml(role);
  const info = await transporter.sendMail({
    from: `OperIQ <${user}>`,
    to: email,
    subject: `You are invited to join ${businessName} on OperIQ`,
    text: `You have been invited to join ${businessName} as ${role}. Accept your invitation: ${inviteUrl}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1835"><h2>Join ${safeBusiness} on OperIQ</h2><p>You have been invited as <strong>${safeRole}</strong>.</p><p><a href="${inviteUrl}" style="display:inline-block;background:#ff560b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Accept invitation</a></p><p style="color:#71809b;font-size:13px">If you were not expecting this invitation, you can ignore this email.</p></div>`,
  });
  const accepted = (info.accepted || []).map((recipient) => String(recipient).toLowerCase());
  if (!accepted.includes(email.toLowerCase())) {
    const rejected = (info.rejected || []).join(", ") || email;
    throw Error(`Email provider did not accept invitation recipient: ${rejected}`);
  }
  return { messageId: info.messageId, accepted: info.accepted };
}
