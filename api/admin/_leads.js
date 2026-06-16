const { ensureTables, getSql, sendJson, parseCookies, verifyToken } = require("../_db");

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
        created_at: l.created_at
      }))
    });
  } catch (error) {
    console.error("Leads API Error:", error);
    sendJson(res, 500, { error: "Server error retrieving leads." });
  }
};
