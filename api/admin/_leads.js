const { ensureTables, getSql, sendJson, parseCookies, verifyToken } = require("../_db");

const NANP_COUNTRY_BY_AREA_CODE = {
  // Canada area codes, used to separate +1 Canada from +1 United States when possible.
  "204": "CA", "226": "CA", "236": "CA", "249": "CA", "250": "CA", "263": "CA", "289": "CA",
  "306": "CA", "343": "CA", "354": "CA", "365": "CA", "367": "CA", "368": "CA", "382": "CA",
  "403": "CA", "416": "CA", "418": "CA", "431": "CA", "437": "CA", "438": "CA", "450": "CA", "468": "CA", "474": "CA",
  "506": "CA", "514": "CA", "519": "CA", "548": "CA", "579": "CA", "581": "CA", "584": "CA", "587": "CA",
  "604": "CA", "613": "CA", "639": "CA", "647": "CA", "672": "CA", "683": "CA", "705": "CA", "709": "CA", "742": "CA", "753": "CA", "778": "CA", "780": "CA", "782": "CA", "807": "CA", "819": "CA", "825": "CA", "867": "CA", "873": "CA", "879": "CA", "902": "CA", "905": "CA"
};

const COUNTRY_DIALING_CODES = [
  { dial: "1", iso: "US", label: "United States", flag: "🇺🇸" },
  { dial: "84", iso: "VN", label: "Vietnam", flag: "🇻🇳" },
  { dial: "64", iso: "NZ", label: "New Zealand", flag: "🇳🇿" },
  { dial: "61", iso: "AU", label: "Australia", flag: "🇦🇺" },
  { dial: "44", iso: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { dial: "66", iso: "TH", label: "Thailand", flag: "🇹🇭" },
  { dial: "65", iso: "SG", label: "Singapore", flag: "🇸🇬" },
  { dial: "60", iso: "MY", label: "Malaysia", flag: "🇲🇾" },
  { dial: "62", iso: "ID", label: "Indonesia", flag: "🇮🇩" },
  { dial: "63", iso: "PH", label: "Philippines", flag: "🇵🇭" }
];

function formatLeadPhone(phone) {
  if (!phone) return "N/A";

  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;

  const withPlus = raw.trim().startsWith("+");
  const directCountry = COUNTRY_DIALING_CODES.find(country => withPlus && digits.startsWith(country.dial));

  if (directCountry) {
    const nationalNumber = digits.slice(directCountry.dial.length);
    if (directCountry.dial === "1") {
      const areaCode = nationalNumber.slice(0, 3);
      const isCanada = NANP_COUNTRY_BY_AREA_CODE[areaCode] === "CA";
      return `${isCanada ? "🇨🇦" : "🇺🇸"} +1 ${nationalNumber || raw} (${isCanada ? "Canada" : "United States"})`;
    }
    return `${directCountry.flag} +${directCountry.dial} ${nationalNumber || raw} (${directCountry.label})`;
  }

  // Customers often enter US/Canada numbers without +1. Detect common 10-digit NANP format.
  if (digits.length === 10) {
    const areaCode = digits.slice(0, 3);
    const isCanada = NANP_COUNTRY_BY_AREA_CODE[areaCode] === "CA";
    return `${isCanada ? "🇨🇦" : "🇺🇸"} +1 ${digits} (${isCanada ? "Canada" : "United States"})`;
  }

  // New Zealand mobile/local format often starts with 02 and is submitted without +64.
  if (digits.startsWith("02") && digits.length >= 9 && digits.length <= 11) {
    return `🇳🇿 +64 ${digits.slice(1)} (New Zealand)`;
  }

  // Vietnam local mobile numbers often start with 0 and contain 10 digits.
  if (digits.startsWith("0") && digits.length === 10) {
    return `🇻🇳 +84 ${digits.slice(1)} (Vietnam/local format)`;
  }

  return `🌐 ${raw} (Unknown country)`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    await ensureTables();
    const cookies = parseCookies(req.headers.cookie || "");
    const payload = verifyToken(cookies.session_token);

    if (!payload) {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    const sql = getSql();
    let leads = [];

    if (payload.role === "admin") {
      // Admin: View all leads
      leads = await sql`
        SELECT 
          l.id, l.ref_code, l.customer_name, l.customer_phone, l.customer_email, l.message, l.source_url, l.landing_page, l.created_at,
          s.sale_name
        FROM leads l
        LEFT JOIN sales s ON s.id = l.sale_id
        ORDER BY l.created_at DESC
      `;
    } else if (payload.role === "sale") {
      // Sale: View own leads only
      const [sale] = await sql`
        SELECT id FROM sales WHERE user_id = ${payload.userId} LIMIT 1
      `;
      if (!sale) {
        sendJson(res, 200, { ok: true, leads: [] });
        return;
      }

      leads = await sql`
        SELECT 
          l.id, l.ref_code, l.customer_name, l.customer_phone, l.customer_email, l.message, l.source_url, l.landing_page, l.created_at,
          s.sale_name
        FROM leads l
        LEFT JOIN sales s ON s.id = l.sale_id
        WHERE l.sale_id = ${sale.id}
        ORDER BY l.created_at DESC
      `;
    } else {
      sendJson(res, 403, { error: "Forbidden." });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      leads: leads.map(l => ({
        ...l,
        id: Number(l.id),
        customer_phone_raw: l.customer_phone,
        customer_phone: formatLeadPhone(l.customer_phone),
        created_at: l.created_at
      }))
    });
  } catch (error) {
    console.error("Leads API Error:", error);
    sendJson(res, 500, { error: "Server error retrieving leads." });
  }
};
