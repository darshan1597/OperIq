import { verifyToken } from "../utils/token.js";

export function requireAuth(req, res, next) {
  const [scheme, token] = String(req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token)
    return res.status(401).json({ error: "Sign in to continue" });

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Your session is invalid or has expired" });
  }
}
