import { z } from "zod";

export function errorHandler(error, _req, res, _next) {
  if (error?.code === 11000)
    return res.status(409).json({ error: "An account with this email already exists" });

  const status = error.status || (error instanceof z.ZodError ? 400 : 500);
  const message = error instanceof z.ZodError ? error.issues[0]?.message : error.message;
  return res.status(status).json({ error: message });
}
