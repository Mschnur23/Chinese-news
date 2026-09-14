import { PublicError } from "./http.js";
import { serverConfig } from "./server-config.js";

const buckets = new Map();

function firstHeader(value) {
  return String(Array.isArray(value) ? value[0] : value || "").split(",")[0].trim();
}

function clientIdentity(request) {
  return firstHeader(request.headers?.["x-vercel-forwarded-for"])
    || firstHeader(request.headers?.["x-forwarded-for"])
    || request.socket?.remoteAddress
    || "unknown";
}

export function enforcePaidRequestLimit(request, action, now = Date.now()) {
  const limit = serverConfig.paidRequestLimits[action];
  if (!limit) throw new Error(`Unknown paid request action: ${action}`);
  const key = `${action}:${clientIdentity(request)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + serverConfig.paidRequestWindowMs }
    : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 1000) {
    for (const [storedKey, stored] of buckets) {
      if (stored.resetAt <= now) buckets.delete(storedKey);
    }
  }

  if (bucket.count > limit) {
    throw new PublicError("RATE_LIMITED", "Too many requests were made. Please wait a few minutes and try again.", 429);
  }
}

export function resetPaidRequestLimitsForTests() {
  buckets.clear();
}
