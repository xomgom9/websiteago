const {
  ensureTables,
  getSql,
  readBody,
  sendJson,
  parseCookies,
} = require("./_db");

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-5371613216";

function normalize(value, max = 255) {
  return String(value || "").trim().slice(0, max);
}

function getReferralFromBody(body) {
  return normalize(body.ref || body.ref_code || body.refCode || body.trackingRef, 120);
}

function getSourceUrl(req, body) {
  return normalize(body.source_url || body.sourceUrl || body.landing_page || body.landingPage || req.headers.referer || "", 1000);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim().slice(0, 120);
  return normalize(req.socket?.remoteAddress || "", 120);
}

async function resolveTracking(sql, refCode) {
  if (!refCode) return null;
  const [tracking] = await sql`
    SELECT tl.id, tl.sale_id, tl.ref_code, tl.status, s.sale_name, s.sale_code, u.status AS user_status
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

async function resolveAttribution(sql, req, body) {
  const cookies = parseCookies(req.headers.cookie || "");
  const visitorId = normalize(body.visitor_id || body.visitorId || cookies.visitor_id || cookies.visitorId || "", 120);
  const bodyRef = getReferralFromBody(body);
  const cookieRef = normalize(cookies.affiliate_ref || "", 120);
  const refCode = bodyRef || cookieRef;
  const tracking = await resolveTracking(sql, refCode);
  return {
    visitorId,
    refCode: tracking ? tracking.ref_code : "organic",
    saleId: tracking ? tracking.sale_id : null,
    trackingLinkId: tracking ? tracking.id : null,
    saleName: tracking ? tracking.sale_name : null,
    trackingUrl: tracking ? tracking.tracking_url : null,
  };
}

function escapeHtml(value) {
  return normalize(value, 5000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatLeadLine(icon, label, value) {
  const cleanValue = escapeHtml(value);
  if (!cleanValue) return "";
  return `${icon} <b>${label}:</b> ${cleanValue}\n`;
}

function getSaleDisplayName(attribution) {
  if (attribution.saleName) return attribution.saleName;
  if (attribution.refCode === "007") return "Trịnh Minh Hùng";
  if (!attribution.refCode || attribution.refCode === "organic") return "Organic / Không có sale";
  return attribution.refCode;
}

function buildTelegramMessage({ source, customerName, customerPhone, customerEmail, message, fields, attribution, landingPage, sourceUrl, ipAddress, userAgent }) {
  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? "Mobile" : "Desktop";

  return `🔔 <b>LEAD MỚI TỪ WEBSITE</b>\n\n` +
    formatLeadLine("💬", "Nguồn form", source) +
    formatLeadLine("👤", "Tên khách", customerName) +
    formatLeadLine("📞", "Số điện thoại", customerPhone) +
    formatLeadLine("📧", "Email", customerEmail) +
    formatLeadLine("🎂", "Tuổi", fields.age) +
    formatLeadLine("⏳", "Mong con bao lâu", fields.trying) +
    formatLeadLine("🏥", "IVF/IUI", fields.path || fields.ivf || fields.iui) +
    formatLeadLine("📍", "Địa chỉ", fields.address || fields["popup-address"]) +
    formatLeadLine("📝", "Tình trạng", fields.concern || fields.message || message) +
    formatLeadLine("👩‍💼", "Sale phụ trách", getSaleDisplayName(attribution)) +
    formatLeadLine("🌐", "Trang", landingPage || sourceUrl) +
    formatLeadLine("📱", "Thiết bị", device) +
    formatLeadLine("💻", "IP", ipAddress);
}

async function sendTelegramLeadNotification(payload) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !TELEGRAM_CHAT_ID) return false;

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: buildTelegramMessage(payload),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Telegram notification failed: ${response.status} ${detail}`);
  }

  return true;
}

async function sendTelegramTest(req, res) {
  const requestUrl = new URL(req.url, "https://websiteago.local");
  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const sent = await sendTelegramLeadNotification({
    source: "TEST - Không cần điền form",
    customerName: requestUrl.searchParams.get("name") || "Khách test website",
    customerPhone: requestUrl.searchParams.get("phone") || "0900000000",
    customerEmail: requestUrl.searchParams.get("email") || "",
    message: requestUrl.searchParams.get("message") || `Tin test gửi bot lúc ${now}`,
    fields: {
      age: requestUrl.searchParams.get("age") || "38",
      trying: requestUrl.searchParams.get("trying") || "3 năm",
      path: requestUrl.searchParams.get("path") || "Chưa IVF/IUI",
      concern: requestUrl.searchParams.get("concern") || "Test chức năng báo lead Telegram",
      address: requestUrl.searchParams.get("address") || "United States",
    },
    attribution: {
      refCode: requestUrl.searchParams.get("ref") || "007",
      saleName: requestUrl.searchParams.get("sale") || "Trịnh Minh Hùng",
    },
    landingPage: "/api/lead?test=telegram",
    sourceUrl: req.headers.referer || "Direct test link",
    ipAddress: getClientIp(req),
    userAgent: normalize(req.headers["user-agent"] || "", 500),
  });

  sendJson(res, 200, {
    ok: true,
    telegramSent: sent,
    chatId: TELEGRAM_CHAT_ID,
    message: sent ? "Telegram test lead sent." : "TELEGRAM_BOT_TOKEN is missing, so no Telegram message was sent.",
  });
}

module.exports = async function handler(req, res) {
  const requestUrl = new URL(req.url, "https://websiteago.local");
  const isTelegramTest = req.method === "GET" && requestUrl.searchParams.get("test") === "telegram";

  if (isTelegramTest) {
    try {
      await sendTelegramTest(req, res);
    } catch (error) {
      console.error("Telegram test failed:", error);
      sendJson(res, 500, { ok: false, error: error.message || "Telegram test failed." });
    }
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, GET");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    await ensureTables();
    const body = await readBody(req);
    const source = normalize(body.source || "Landing Form", 120);
    const fields = body.fields && typeof body.fields === "object" ? body.fields : {};
    const customerName = normalize(fields.name || fields.customer_name || fields["customer-name"] || fields["popup-name"], 120);
    const customerPhone = normalize(fields.phone || fields["customer_phone"] || fields["popup-phone"], 40);
    const customerEmail = normalize(fields.email || fields.customer_email || "", 180);
    const message = normalize(
      fields.message || fields.concern || fields.note || fields.address || fields["popup-address"] || JSON.stringify(fields),
      5000
    );

    if (!customerName || !customerPhone) {
      sendJson(res, 400, { error: "Missing required lead fields." });
      return;
    }

    const sql = getSql();
    const attribution = await resolveAttribution(sql, req, body);
    const sourceUrl = getSourceUrl(req, body);
    const landingPage = normalize(body.landing_page || body.landingPage || req.url || "", 1000);
    const ipAddress = getClientIp(req);
    const userAgent = normalize(req.headers["user-agent"] || "", 500);

    if (attribution.saleId && attribution.trackingLinkId) {
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
          ${attribution.saleId},
          ${attribution.trackingLinkId},
          ${attribution.refCode},
          ${attribution.visitorId || `${Date.now()}`},
          ${ipAddress},
          ${userAgent},
          ${normalize(body.device || "", 80)},
          ${normalize(body.browser || "", 80)},
          ${sourceUrl || landingPage}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    const [record] = await sql`
      INSERT INTO leads (
        sale_id,
        tracking_link_id,
        ref_code,
        customer_name,
        customer_phone,
        customer_email,
        message,
        source_url,
        landing_page,
        visitor_id
      )
      VALUES (
        ${attribution.saleId},
        ${attribution.trackingLinkId},
        ${attribution.refCode},
        ${customerName},
        ${customerPhone},
        ${customerEmail || null},
        ${message || null},
        ${sourceUrl || null},
        ${landingPage || null},
        ${attribution.visitorId || null}
      )
      RETURNING id, sale_id, tracking_link_id, ref_code, customer_name, customer_phone, customer_email, message, source_url, landing_page, visitor_id, created_at
    `;

    try {
      await sendTelegramLeadNotification({
        source,
        customerName,
        customerPhone,
        customerEmail,
        message,
        fields,
        attribution,
        landingPage,
        sourceUrl,
        ipAddress,
        userAgent,
      });
    } catch (tgError) {
      console.error("Failed to send Telegram notification:", tgError);
    }

    sendJson(res, 200, {
      ok: true,
      lead: record,
      attribution: {
        saleId: attribution.saleId,
        saleName: attribution.saleName,
        trackingLinkId: attribution.trackingLinkId,
        refCode: attribution.refCode,
      },
    });
  } catch (error) {
    console.error(error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Server error." });
  }
};