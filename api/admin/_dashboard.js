const {
  ensureTables,
  getSql,
  sendJson,
  parseCookies,
  verifyToken,
  inMemorySales,
  inMemoryTrackingLinks,
  inMemoryClicks,
  inMemoryLeads,
  inMemoryInteractions
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

    if (!payload || payload.role !== "admin") {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    // Parse date filters
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    let startDate = startDateParam ? new Date(startDateParam) : new Date(0);
    let endDate = endDateParam ? new Date(endDateParam) : new Date("2100-01-01");

    let stats = {};

    if (!process.env.DATABASE_URL) {
      // Mock mode: Aggregate in-memory
      const totalSales = inMemorySales.filter(s => s.status !== "deleted").length;
      const activeSales = inMemorySales.filter(s => s.status === "active").length;
      const totalLinks = inMemoryTrackingLinks.filter(l => l.status !== "deleted").length;
      const activeLinks = inMemoryTrackingLinks.filter(l => l.status === "active").length;

      // Filter clicks and leads by date
      const clicks = inMemoryClicks.filter(c => {
        const d = new Date(c.clicked_at);
        return d >= startDate && d <= endDate;
      });
      const uniqueVisitors = new Set(clicks.map(c => c.visitor_id)).size;

      const leads = inMemoryLeads.filter(l => {
        const d = new Date(l.created_at);
        return d >= startDate && d <= endDate;
      });

      // Calculate conversion rate
      const totalClicks = clicks.length;
      const totalLeads = leads.length;
      const conversionRate = totalClicks > 0 ? Number(((totalLeads / totalClicks) * 100).toFixed(1)) : 0;

      // Top sales
      const saleClicksMap = {};
      const saleLeadsMap = {};

      clicks.forEach(c => {
        if (c.sale_id) saleClicksMap[c.sale_id] = (saleClicksMap[c.sale_id] || 0) + 1;
      });

      leads.forEach(l => {
        if (l.sale_id) saleLeadsMap[l.sale_id] = (saleLeadsMap[l.sale_id] || 0) + 1;
      });

      let topSaleByClicks = { name: "N/A", count: 0 };
      let topSaleByLeads = { name: "N/A", count: 0 };

      Object.entries(saleClicksMap).forEach(([saleId, count]) => {
        if (count > topSaleByClicks.count) {
          const s = inMemorySales.find(sale => sale.id === Number(saleId));
          if (s) topSaleByClicks = { name: s.sale_name, count };
        }
      });

      Object.entries(saleLeadsMap).forEach(([saleId, count]) => {
        if (count > topSaleByLeads.count) {
          const s = inMemorySales.find(sale => sale.id === Number(saleId));
          if (s) topSaleByLeads = { name: s.sale_name, count };
        }
      });

      // Fetch interactions in mock mode
      const counts = {};
      inMemoryInteractions.forEach(item => {
        const d = new Date(item.created_at);
        if (d >= startDate && d <= endDate) {
          if (!counts[item.event_type]) counts[item.event_type] = { unique: new Set(), total: 0 };
          counts[item.event_type].unique.add(item.visitor_id);
          counts[item.event_type].total++;
        }
      });
      const interactionStats = {};
      Object.entries(counts).forEach(([type, c]) => {
        interactionStats[type] = {
          total: c.total,
          unique: c.unique.size
        };
      });

      stats = {
        totalSales,
        activeSales,
        totalLinks,
        activeLinks,
        totalClicks,
        uniqueVisitors,
        totalLeads,
        conversionRate,
        topSaleByClicks,
        topSaleByLeads,
        interactions: interactionStats
      };
    } else {
      // Real Postgres mode
      const sql = getSql();

      const [salesRes] = await sql`SELECT COUNT(*)::int AS total, COUNT(CASE WHEN status='active' THEN 1 END)::int AS active FROM sales WHERE status <> 'deleted'`;
      const [linksRes] = await sql`SELECT COUNT(*)::int AS total, COUNT(CASE WHEN status='active' THEN 1 END)::int AS active FROM tracking_links WHERE status <> 'deleted'`;
      
      const [clicksRes] = await sql`
        SELECT COUNT(*)::int AS total_clicks, COUNT(DISTINCT visitor_id)::int AS unique_visitors
        FROM click_tracking
        WHERE clicked_at >= ${startDate} AND clicked_at <= ${endDate}
      `;
      const [leadsRes] = await sql`
        SELECT COUNT(*)::int AS total_leads
        FROM leads
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      `;

      // Top sale by clicks in date range
      const [topClickRes] = await sql`
        SELECT s.sale_name, COUNT(ct.id)::int AS count
        FROM click_tracking ct
        JOIN sales s ON s.id = ct.sale_id
        WHERE ct.clicked_at >= ${startDate} AND ct.clicked_at <= ${endDate}
        GROUP BY s.id
        ORDER BY count DESC
        LIMIT 1
      `;

      // Top sale by leads in date range
      const [topLeadRes] = await sql`
        SELECT s.sale_name, COUNT(l.id)::int AS count
        FROM leads l
        JOIN sales s ON s.id = l.sale_id
        WHERE l.created_at >= ${startDate} AND l.created_at <= ${endDate}
        GROUP BY s.id
        ORDER BY count DESC
        LIMIT 1
      `;

      const totalClicks = clicksRes?.total_clicks || 0;
      const totalLeads = leadsRes?.total_leads || 0;
      const conversionRate = totalClicks > 0 ? Number(((totalLeads / totalClicks) * 100).toFixed(1)) : 0;

      const interactionsRes = await sql`
        SELECT event_type, COUNT(*)::int AS total_count, COUNT(DISTINCT visitor_id)::int AS unique_count
        FROM interaction_tracking
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY event_type
      `;
      const interactionStats = {};
      interactionsRes.forEach(item => {
        interactionStats[item.event_type] = {
          total: item.total_count,
          unique: item.unique_count
        };
      });

      stats = {
        totalSales: salesRes?.total || 0,
        activeSales: salesRes?.active || 0,
        totalLinks: linksRes?.total || 0,
        activeLinks: linksRes?.active || 0,
        totalClicks,
        uniqueVisitors: clicksRes?.unique_visitors || 0,
        totalLeads,
        conversionRate,
        topSaleByClicks: topClickRes ? { name: topClickRes.sale_name, count: topClickRes.count } : { name: "N/A", count: 0 },
        topSaleByLeads: topLeadRes ? { name: topLeadRes.sale_name, count: topLeadRes.count } : { name: "N/A", count: 0 },
        interactions: interactionStats
      };
    }

    sendJson(res, 200, { ok: true, stats });
  } catch (error) {
    console.error("Admin Dashboard Stats API Error:", error);
    sendJson(res, 500, { error: "Server error getting dashboard stats." });
  }
};
