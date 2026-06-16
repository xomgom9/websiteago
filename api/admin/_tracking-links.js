const {
  ensureTables,
  getSql,
  sendJson,
  parseCookies,
  verifyToken
} = require("../_db");

function getBaseUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || (String(host).includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

module.exports = async function handler(req, res) {
  try {
    await ensureTables();
    const cookies = parseCookies(req.headers.cookie || "");
    const payload = verifyToken(cookies.session_token);

    if (!payload || payload.role !== "admin") {
      sendJson(res, 401, { error: "Unauthorized." });
      return;
    }

    const sql = getSql();
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    const idParam = url.searchParams.get("id");
    const linkId = idParam ? Number(idParam) : null;

    if (req.method === "GET") {
      const links = await sql`
        SELECT 
          tl.id, tl.sale_id, tl.ref_code, tl.tracking_url, tl.status, tl.note, tl.created_at, tl.updated_at,
          s.sale_name,
          COUNT(DISTINCT ct.id)::int AS total_clicks,
          COUNT(DISTINCT l.id)::int AS total_leads
        FROM tracking_links tl
        JOIN sales s ON s.id = tl.sale_id
        LEFT JOIN click_tracking ct ON ct.tracking_link_id = tl.id
        LEFT JOIN leads l ON l.tracking_link_id = tl.id
        WHERE tl.status <> 'deleted'
        GROUP BY tl.id, s.id
        ORDER BY tl.created_at DESC
      `;

      sendJson(res, 200, {
        ok: true,
        links: links.map(l => ({
          ...l,
          tracking_url: String(l.tracking_url || "").replace(/^http:\/\/websiteago\.vercel\.app/i, "https://websiteago.vercel.app"),
          id: Number(l.id),
          sale_id: Number(l.sale_id),
          total_clicks: l.total_clicks || 0,
          total_leads: l.total_leads || 0
        }))
      });
      return;
    }

    if (req.method === "POST") {
      const body = await req.body || await require("../_db").readBody(req);
      const saleId = Number(body.saleId || body.sale_id);
      const refCode = String(body.refCode || body.ref_code || "").trim();
      const note = String(body.note || "").trim();

      if (!saleId || !refCode) {
        sendJson(res, 400, { error: "Sale ID and ref code (ref) are required." });
        return;
      }

      const [sale] = await sql`SELECT id, sale_code FROM sales WHERE id = ${saleId} AND status <> 'deleted' LIMIT 1`;
      if (!sale) {
        sendJson(res, 404, { error: "Sale agent not found." });
        return;
      }

      const [existingLink] = await sql`SELECT id FROM tracking_links WHERE ref_code = ${refCode} LIMIT 1`;
      if (existingLink) {
        sendJson(res, 400, { error: "This ref code is already used in a tracking link." });
        return;
      }

      const trackingUrl = `${getBaseUrl(req)}/?ref=${encodeURIComponent(refCode)}`;
      const [newLink] = await sql`
        INSERT INTO tracking_links (sale_id, ref_code, tracking_url, status, note)
        VALUES (${saleId}, ${refCode}, ${trackingUrl}, 'active', ${note})
        RETURNING id, ref_code, tracking_url
      `;

      sendJson(res, 201, {
        ok: true,
        link: {
          ...newLink,
          id: Number(newLink.id)
        },
        message: "Tracking link created successfully."
      });
      return;
    }

    if (req.method === "PUT") {
      if (!linkId) {
        sendJson(res, 400, { error: "Link ID parameter is required." });
        return;
      }

      const body = await req.body || await require("../_db").readBody(req);
      const note = String(body.note || "").trim();

      await sql`
        UPDATE tracking_links
        SET note = ${note}, updated_at = NOW()
        WHERE id = ${linkId}
      `;

      sendJson(res, 200, { ok: true, message: "Tracking link updated." });
      return;
    }

    if (req.method === "PATCH") {
      if (!linkId) {
        sendJson(res, 400, { error: "Link ID parameter is required." });
        return;
      }

      const body = await req.body || await require("../_db").readBody(req);
      const status = String(body.status || "").trim();

      if (status !== "active" && status !== "inactive") {
        sendJson(res, 400, { error: "Status must be 'active' or 'inactive'." });
        return;
      }

      await sql`
        UPDATE tracking_links
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${linkId}
      `;

      sendJson(res, 200, { ok: true, message: `Tracking link status updated to ${status}.` });
      return;
    }

    if (req.method === "DELETE") {
      if (!linkId) {
        sendJson(res, 400, { error: "Link ID parameter is required." });
        return;
      }

      await sql`
        UPDATE tracking_links
        SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${linkId}
      `;

      sendJson(res, 200, { ok: true, message: "Tracking link deleted successfully." });
      return;
    }

    res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE");
    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("Tracking Links API Error:", error);
    sendJson(res, 500, { error: "Server error managing tracking links." });
  }
};
