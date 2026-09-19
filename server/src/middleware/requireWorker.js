import { verifySessionToken } from "../services/sessionService.js";

export function requireWorker(request, response, next) {
  const token = request.get("authorization")?.replace(/^Bearer\s+/i, "");
  const session = verifySessionToken(token);
  if (!session || session.role !== "worker") {
    return response.status(401).json({ error: "Worker sign-in is required" });
  }
  request.user = session;
  return next();
}
