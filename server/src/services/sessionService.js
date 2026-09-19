import crypto from "crypto";

// This keeps the existing login flow while giving protected routes a verifiable
// identity. Set AUTH_SECRET in production; the fallback is for local demo use.
const secret = process.env.AUTH_SECRET || "kaamsetu-local-development-secret";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionToken(user) {
  const payload = encode({ id: Number(user.id), role: user.role, exp: Date.now() + 1000 * 60 * 60 * 12 });
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  const expectedSignature = payload ? sign(payload) : "";
  if (!payload || !signature || Buffer.byteLength(signature) !== Buffer.byteLength(expectedSignature) || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}
