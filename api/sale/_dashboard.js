const {
  ensureTables,
  getSql,
  sendJson,
  parseCookies,
  verifyToken,
  inMemorySales,
  inMemoryTrackingLinks,
  inMemoryClicks,
  inMemoryLeads
} = require("../_db");

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

    if (!payload || payload.role !== "sale") {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    // Parse date filters
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    let startDate = startDateParam ? new Date(startDateParam) : new Date(0);
    let endDate = endDateParam ? new Date(endDateParam) : new Date("2100-01-01");

    let sale = null;
    let stats = {};
    let leadsList = [];
    let trackingUrl = "";

    if (!process.env.DATABASE_URL) {
      // Mock mode
      sale = inMemorySales.find(s => s.user_id === payload.userId);
      if (!sale) {
        sendJson(res, 200, { ok: true, stats: { totalClicks: 0, uniqueVisitors: 0, totalLeads: 0, conversionRate: 0 }, leads: [], trackingUrl: "" });
        return;
      }

      // Get tracking link
      const tl = inMemoryTrackingLinks.find(l => l.sale_id === sale.id && l.status === "active");
      trackingUrl = tl ? tl.tracking_url : `http://${req.headers.host || "localhost"}/?ref=${sale.sale_code}`;

      // Filter click and leads
      const clicks = inMemoryClicks.filter(c => {
        const d = new Date(c.clicked_at);
        return c.sale_id === sale.id && d >= startDate && d <= endDate;
      });
      const uniqueVisitors = new Set(clicks.map(c => c.visitor_id)).size;

      const leads = inMemoryLeads.filter(l => {
        const d = new Date(l.created_at);
        return l.sale_id === sale.id && d >= startDate && d <= endDate;
      });

      const totalClicks = clicks.length;
      const totalLeads = leads.length;
      const conversionRate = totalClicks > 0 ? Number(((totalLeads / totalClicks) * 100).toFixed(1)) : 0;

      stats = {
        totalClicks,
        uniqueVisitors,
        totalLeads,
        conversionRate
      };

      leadsList = leads.map(l => ({
        id: l.id,
        customer_name: l.customer_name,
        customer_phone: l.customer_phone,
        customer_email: l.customer_email,
        message: l.message,
        source_url: l.source_url,
        landing_page: l.landing_page,
        created_at: l.created_at
      })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
      // Real Postgres mode
      const sql = getSql();

      const [saleRecord] = await sql`SELECT id, sale_code FROM sales WHERE user_id = ${payload.userId} LIMIT 1`;
      if (!saleRecord) {
        sendJson(res, 200, { ok: true, stats: { totalClicks: 0, uniqueVisitors: 0, totalLeads: 0, conversionRate: 0 }, leads: [], trackingUrl: "" });
        return;
      }

      // Get active tracking url
      const [tlRecord] = await sql`SELECT tracking_url FROM tracking_links WHERE sale_id = ${saleRecord.id} AND status = 'active' LIMIT 1`;
      trackingUrl = tlRecord ? tlRecord.tracking_url : `http://${req.headers.host || "localhost"}/?ref=${saleRecord.sale_code}`;

      // Aggregate click and leads count
      const [clicksRes] = await sql`
        SELECT COUNT(*)::int AS total_clicks, COUNT(DISTINCT visitor_id)::int AS unique_visitors
        FROM click_tracking
        WHERE sale_id = ${saleRecord.id} AND clicked_at >= ${startDate} AND clicked_at <= ${endDate}
      `;

      const [leadsRes] = await sql`
        SELECT COUNT(*)::int AS total_leads
        FROM leads
        WHERE sale_id = ${saleRecord.id} AND created_at >= ${startDate} AND created_at <= ${endDate}
      `;

      const totalClicks = clicksRes?.total_clicks || 0;
      const totalLeads = leadsRes?.total_leads || 0;
      const conversionRate = totalClicks > 0 ? Number(((totalLeads / totalClicks) * 100).toFixed(1)) : 0;

      stats = {
        totalClicks,
        uniqueVisitors: clicksRes?.unique_visitors || 0,
        totalLeads,
        conversionRate
      };

      // Get list of leads
      leadsList = await sql`
        SELECT id, customer_name, customer_phone, customer_email, message, source_url, landing_page, created_at
        FROM leads
        WHERE sale_id = ${saleRecord.id} AND created_at >= ${startDate} AND created_at <= ${endDate}
        ORDER BY created_at DESC
      `;
    }

    sendJson(res, 200, {
      ok: true,
      stats,
      leads: leadsList,
      trackingUrl
    });
  } catch (error) {
    console.error("Sale Dashboard API Error:", error);
    sendJson(res, 500, { error: "Server error retrieving stats." });
  }
};
