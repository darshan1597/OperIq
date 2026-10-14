import { verifyToken } from "../utils/token.js";
import { findUserById } from "../services/store.service.js";
import { isPlatformAdmin } from "../utils/platform-admin.js";

export async function requireAuth(req, res, next) {
  const [scheme, token] = String(req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token)
    return res.status(401).json({ error: "Sign in to continue" });

  try {
    const payload = verifyToken(token);
    const account = await findUserById(payload.sub);
    if (!account)
      return res.status(401).json({ error: "Account no longer exists" });
    req.user = {
      id: String(account.workspaceId || account._id),
      accountId: String(account._id),
      email: account.email,
      role: account.role || "owner",
    };
    next();
  } catch {
    return res.status(401).json({ error: "Your session is invalid or has expired" });
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: "Your role does not have permission to perform this action" });
  next();
};

export function requirePlatformAdmin(req, res, next) {
  if (!isPlatformAdmin(req.user?.email))
    return res.status(403).json({ error: "OperIQ administrator access is required" });
  next();
}
