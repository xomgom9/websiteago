const {
  ensureTables,
  getSql,
  readBody,
  sendJson,
  parseCookies,
  setCookie,
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

async function resolveTracking(sql, refCode) {
  if (!refCode) return null;
  const [tracking] = await sql`
    SELECT tl.id, tl.sale_id, tl.ref_code, tl.status, s.sale_name, u.status AS user_status
    FROM tracking_links tl
    JOIN sales s ON s.id = tl.sale_id
    JOIN users u ON u.id = s.user_id
    WHERE tl.ref_code = ${refCode}
    LIMIT 1
  `;
  if (!tracking) return null;
  if (tracking.status !== "active") return null;
  if (tracking.user_status !== "active") return null;
  return tracking;
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

    const refCode = normalize(body.ref || body.refCode || cookies.affiliate_ref || "", 120);
    const tracking = await resolveTracking(sql, refCode);

    if (!tracking) {
      sendJson(res, 200, {
        ok: true,
        tracked: false,
        refCode: refCode || null,
      });
      return;
    }

    const visitorId =
      normalize(body.visitor_id || body.visitorId || cookies.visitor_id || "", 120) ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const sourceUrl = normalize(body.source_url || body.sourceUrl || body.landing_page || body.landingPage || req.headers.referer || "", 1000);
    const ipAddress = getClientIp(req);
    const userAgent = normalize(req.headers["user-agent"] || "", 500);
    const device = normalize(body.device || detectDevice(userAgent), 80);
    const browser = normalize(body.browser || detectBrowser(userAgent), 80);

    await sql`
      INSERT INTO click_tracking (
        sale_id,
        tracking_link_id,
        ref_code,
        visitor_id,
        ip_address,
        user_agent,
        device,
        browser,
        landing_page
      )
      VALUES (
        ${tracking.sale_id},
        ${tracking.id},
        ${tracking.ref_code},
        ${visitorId},
        ${ipAddress},
        ${userAgent},
        ${device},
        ${browser},
        ${sourceUrl || null}
      )
    `;

    setCookie(res, "visitor_id", visitorId, {
      maxAge: 60 * 24 * 60 * 60,
      path: "/",
      sameSite: "Lax",
    });

    setCookie(res, "affiliate_ref", tracking.ref_code, {
      maxAge: 60 * 24 * 60 * 60,
      path: "/",
      sameSite: "Lax",
    });

    sendJson(res, 200, {
      ok: true,
      tracked: true,
      refCode: tracking.ref_code,
      saleId: tracking.sale_id,
      trackingLinkId: tracking.id,
      saleName: tracking.sale_name,
      visitorId,
    });
  } catch (error) {
    console.error(error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Server error." });
  }
};