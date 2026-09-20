import { sendJson } from "./_shared/http.js";

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET for browser configuration." },
      warnings: [],
    });
  }

  const googleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  return sendJson(response, 200, {
    ok: true,
    data: { googleDriveConfigured: Boolean(googleClientId), googleClientId },
    warnings: [],
  });
}
