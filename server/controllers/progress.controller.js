import { getProgress } from "../services/request-progress.service.js";

export function readProgress(req, res) {
  const progress = getProgress(req.params.id);
  if (!progress) return res.status(404).json({ error: "Request progress not found" });
  return res.json(progress);
}
