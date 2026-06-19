const {
  ensureTables,
  getSql,
  readBody,
  sendJson,
  parseCookies,
} = require("./_db");

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-5371613216";

const DIAL_CODE_COUNTRIES = {
  "+1": "United States",
  "+84": "Vietnam",
  "+66": "Thailand",
  "+65": "Singapore",
  "+60": "Malaysia",
  "+62": "Indonesia",
  "+63": "Philippines",
  "+61": "Australia",
  "+44": "United Kingdom",
};

const NANP_AREA_CODES = {
  "504": "New Orleans, Louisiana, USA",
};

function normalize(value, max = 255) {
  return String(value || "").trim().slice(0, max);
}

function onlyDigits(value) {
  return normalize(value, 120).replace(/\D/g, "");
}

function normalizeDialCode(value) {
  const cleanValue = normalize(value, 40);
  if (!cleanValue) return "";
  const plusMatch = cleanValue.match(/\+\d{1,4}/);
  if (plusMatch) return plusMatch[0];
  const digits = cleanValue.replace(/\D/g, "");
  return digits ? `+${digits.slice(0, 4)}` : "";
}

function getCountryFromFields(fields, dialCode) {
  const explicitCountry = normalize(
    fields.country ||
      fields.country_name ||
      fields.countryName ||
      fields.phone_country ||
      fields.phoneCountry ||
      fields["phone-country"] ||
      fields["popup-phone-country"],
    120
  );
  const address = normalize(fields.address || fields["popup-address"] || "", 300);
  const lookupText = `${explicitCountry} ${address}`.toLowerCase();

  if (/canada|ontario|toronto|vancouver|british columbia|alberta|quebec/.test(lookupText)) return "Canada";
  if (/united states|usa|u\.s\.|america|new york|california|texas|florida|louisiana|new orleans|prieur/.test(lookupText)) {
    return "United States";
  }

  return DIAL_CODE_COUNTRIES[dialCode] || "Unknown";
}

function inferDialCode(rawPhone, fields) {
  const fieldDialCode = normalizeDialCode(
    fields["phone-country-code"] ||
      fields.phone_country_code ||
      fields.phoneCountryCode ||
      fields.country_code ||
      fields.countryCode ||
      fields.dial_code ||
      fields.dialCode ||
      fields["popup-phone-country-code"] ||
      fields.popup_phone_country_code
  );
  if (fieldDialCode) return fieldDialCode;

  const cleanPhone = normalize(rawPhone, 80);
  if (cleanPhone.startsWith("+")) {
    const knownCodes = Object.keys(DIAL_CODE_COUNTRIES).sort((a, b) => b.length - a.length);
    const matchedCode = knownCodes.find((code) => cleanPhone.startsWith(code));
    if (matchedCode) return matchedCode;
  }

  const digits = onlyDigits(cleanPhone);
  if (digits.length === 11 && digits.startsWith("1")) return "+1";

  const address = normalize(fields.address || fields["popup-address"] || "", 300).toLowerCase();
  if (/vietnam|việt nam|hanoi|ha noi|ho chi minh|hồ chí minh/.test(address)) return "+84";

  return "+1";
}

function getLocalPhoneDigits(rawPhone, dialCode) {
  const digits = onlyDigits(rawPhone);
  const dialDigits = dialCode.replace(/\D/g, "");
  let localDigits = digits;

  if (normalize(rawPhone, 80).startsWith("+") && dialDigits && digits.startsWith(dialDigits)) {
    localDigits = digits.slice(dialDigits.length);
  }

  if (dialCode === "+1" && localDigits.length === 11 && localDigits.startsWith("1")) {
    localDigits = localDigits.slice(1);
  }

  return localDigits;
}

function formatInternationalPhone(rawPhone, dialCode, localDigits) {
  if (!rawPhone) return "";
  if (dialCode === "+1" && localDigits.length === 10) {
    return `+1 (${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)}-${localDigits.slice(6)}`;
  }
  if (normalize(rawPhone, 80).startsWith("+")) return normalize(rawPhone, 80);
  return `${dialCode} ${localDigits || normalize(rawPhone, 80)}`;
}

function getAreaDisplay(dialCode, localDigits) {
  if (!localDigits) return "";
  if (dialCode === "+1" && localDigits.length >= 3) {
    const areaCode = localDigits.slice(0, 3);
    return NANP_AREA_CODES[areaCode] ? `${areaCode} - ${NANP_AREA_CODES[areaCode]}` : areaCode;
  }
  if (localDigits.length >= 3) return localDigits.slice(0, 3);
  return localDigits;
}

function getPhoneInfo(rawPhone, fields = {}) {
  const dialCode = inferDialCode(rawPhone, fields);
  const localDigits = getLocalPhoneDigits(rawPhone, dialCode);
  const countryName = getCountryFromFields(fields, dialCode);
  const areaDisplay = getAreaDisplay(dialCode, localDigits);

  return {
    dialCode,
    countryName,
    localDigits,
    formattedPhone: formatInternationalPhone(rawPhone, dialCode, localDigits),
    countryDisplay: `${countryName} (${dialCode})`,
    areaDisplay,
  };
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

function buildTelegramMessage({ source, customerName, customerPhone, customerEmail, message, fields, attribution, landingPage, sourceUrl, ipAddress, userAgent, phoneInfo }) {
  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? "Mobile" : "Desktop";
  const phoneMeta = phoneInfo || getPhoneInfo(customerPhone, fields);

  return `🔔 <b>LEAD MỚI TỪ WEBSITE</b>\n\n` +
    formatLeadLine("💬", "Nguồn form", source) +
    formatLeadLine("👤", "Tên khách", customerName) +
    formatLeadLine("📞", "Số điện thoại", phoneMeta.formattedPhone || customerPhone) +
    formatLeadLine("🌎", "Quốc gia / mã quốc gia", phoneMeta.countryDisplay) +
    formatLeadLine("☎️", "Mã vùng / đầu số", phoneMeta.areaDisplay) +
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
  const customerPhone = requestUrl.searchParams.get("phone") || "5045361797";
  const fields = {
    age: requestUrl.searchParams.get("age") || "38",
    trying: requestUrl.searchParams.get("trying") || "3 năm",
    path: requestUrl.searchParams.get("path") || "Chưa IVF/IUI",
    concern: requestUrl.searchParams.get("concern") || "Test chức năng báo lead Telegram",
    address: requestUrl.searchParams.get("address") || "1620 N Prieur St, New Orleans, Louisiana, United States",
    "phone-country-code": requestUrl.searchParams.get("countryCode") || "+1",
  };
  const phoneInfo = getPhoneInfo(customerPhone, fields);

  const sent = await sendTelegramLeadNotification({
    source: "TEST - Không cần điền form",
    customerName: requestUrl.searchParams.get("name") || "Khách test website",
    customerPhone: phoneInfo.formattedPhone,
    customerEmail: requestUrl.searchParams.get("email") || "",
    message: requestUrl.searchParams.get("message") || `Tin test gửi bot lúc ${now}`,
    fields,
    attribution: {
      refCode: requestUrl.searchParams.get("ref") || "007",
      saleName: requestUrl.searchParams.get("sale") || "Trịnh Minh Hùng",
    },
    landingPage: "/api/lead?test=telegram",
    sourceUrl: req.headers.referer || "Direct test link",
    ipAddress: getClientIp(req),
    userAgent: normalize(req.headers["user-agent"] || "", 500),
    phoneInfo,
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
    const rawCustomerPhone = normalize(fields.phone || fields["customer_phone"] || fields["customer-phone"] || fields["popup-phone"], 80);
    const phoneInfo = getPhoneInfo(rawCustomerPhone, fields);
    const customerPhone = normalize(phoneInfo.formattedPhone || rawCustomerPhone, 80);
    const customerEmail = normalize(fields.email || fields.customer_email || "", 180);
    const message = normalize(
      fields.message || fields.concern || fields.note || fields.address || fields["popup-address"] || JSON.stringify(fields),
      5000
    );

    if (!customerName || !rawCustomerPhone) {
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
        phoneInfo,
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