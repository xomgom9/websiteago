const {
  ensureTables,
  getSql,
  readBody,
  sendJson,
  parseCookies,
} = require("./_db");

function normalize(value, max = 255) {
  return String(value || "").trim().slice(0, max);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim().slice(0, 120);
  return normalize(req.socket?.remoteAddress || "", 120);
}

function detectDevice(userAgent = "") {
  const ua = String(userAgent).toLowerCase();
  if (/tablet|ipad/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod|phone/.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(userAgent = "") {
  const ua = String(userAgent);
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/msie|trident/i.test(ua)) return "IE";
  return "Unknown";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    await ensureTables();
    const body = await readBody(req);
    const cookies = parseCookies(req.headers.cookie || "");
    const sql = getSql();

    const visitorId = normalize(body.visitorId || body.visitor_id || cookies.visitor_id || "", 120) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const refCode = normalize(body.refCode || body.ref || cookies.affiliate_ref || "organic", 120);
    const eventType = normalize(body.eventType || body.event_type || "", 100);
    const landingPage = normalize(body.landingPage || body.landing_page || req.headers.referer || "", 1000);
    const userAgent = normalize(req.headers["user-agent"] || "", 500);
    const device = normalize(body.device || detectDevice(userAgent), 80);
    const browser = normalize(body.browser || detectBrowser(userAgent), 80);

    if (!eventType) {
      sendJson(res, 400, { error: "Missing eventType." });
      return;
    }

    await sql`
      INSERT INTO interaction_tracking (
        visitor_id,
        ref_code,
        event_type,
        landing_page,
        device,
        browser
      )
      VALUES (
        ${visitorId},
        ${refCode},
        ${eventType},
        ${landingPage},
        ${device},
        ${browser}
      )
    `;

    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("Tracking Interaction Error:", error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Server error." });
  }
};
