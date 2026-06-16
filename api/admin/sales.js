const {
  ensureTables,
  getSql,
  sendJson,
  parseCookies,
  verifyToken,
  hashPassword
} = require("../_db");

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
    const saleId = idParam ? Number(idParam) : null;

    // 1. GET Request: List all sales with stats, or get details of a specific sale
    if (req.method === "GET") {
      if (saleId) {
        // Retrieve single sale detail + stats + leads list
        const [sale] = await sql`
          SELECT s.id, s.user_id, s.sale_name, s.sale_code, s.phone, s.email, s.note, s.status, s.created_at
          FROM sales s
          WHERE s.id = ${saleId} AND s.status <> 'deleted'
          LIMIT 1
        `;

        if (!sale) {
          sendJson(res, 404, { error: "Sale agent not found." });
          return;
        }

        const [clicksRes] = await sql`
          SELECT COUNT(*)::int AS total_clicks, COUNT(DISTINCT visitor_id)::int AS unique_visitors
          FROM click_tracking
          WHERE sale_id = ${saleId}
        `;
        const [leadsRes] = await sql`
          SELECT COUNT(*)::int AS total_leads
          FROM leads
          WHERE sale_id = ${saleId}
        `;

        const leadsList = await sql`
          SELECT id, customer_name, customer_phone, customer_email, message, source_url, landing_page, created_at
          FROM leads
          WHERE sale_id = ${saleId}
          ORDER BY created_at DESC
        `;

        const totalClicks = clicksRes?.total_clicks || 0;
        const totalLeads = leadsRes?.total_leads || 0;

        sendJson(res, 200, {
          ok: true,
          sale: {
            ...sale,
            id: Number(sale.id),
            user_id: Number(sale.user_id),
            total_clicks: totalClicks,
            unique_visitors: clicksRes?.unique_visitors || 0,
            total_leads: totalLeads,
            conversion_rate: totalClicks > 0 ? Number(((totalLeads / totalClicks) * 100).toFixed(1)) : 0,
            leads: leadsList.map(l => ({ ...l, id: Number(l.id) }))
          }
        });
      } else {
        // List all sales
        const sales = await sql`
          SELECT 
            s.id, s.user_id, s.sale_name, s.sale_code, s.phone, s.email, s.note, s.status, s.created_at,
            u.status AS user_status,
            COUNT(DISTINCT ct.id)::int AS total_clicks,
            COUNT(DISTINCT ct.visitor_id)::int AS unique_visitors,
            COUNT(DISTINCT l.id)::int AS total_leads
          FROM sales s
          JOIN users u ON u.id = s.user_id
          LEFT JOIN click_tracking ct ON ct.sale_id = s.id
          LEFT JOIN leads l ON l.sale_id = s.id
          WHERE s.status <> 'deleted'
          GROUP BY s.id, u.id
          ORDER BY s.created_at DESC
        `;

        sendJson(res, 200, {
          ok: true,
          sales: sales.map(s => {
            const clicks = s.total_clicks || 0;
            const leads = s.total_leads || 0;
            return {
              ...s,
              id: Number(s.id),
              user_id: Number(s.user_id),
              conversion_rate: clicks > 0 ? Number(((leads / clicks) * 100).toFixed(1)) : 0
            };
          })
        });
      }
      return;
    }

    // 2. POST Request: Create a new sale agent (along with a user account)
    if (req.method === "POST") {
      const body = await req.body || await require("../_db").readBody(req);
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim();
      const phone = String(body.phone || "").trim();
      const password = String(body.password || "");
      const saleCode = String(body.saleCode || body.sale_code || "").trim();
      const note = String(body.note || "").trim();

      if (!name || !email || !password || !saleCode) {
        sendJson(res, 400, { error: "Name, email, password, and Sale ID are required." });
        return;
      }

      // Check if email or sale code exists in users / sales
      const [existingUser] = await sql`SELECT id FROM users WHERE email = ${email} OR phone = ${phone || null} LIMIT 1`;
      if (existingUser) {
        sendJson(res, 400, { error: "A user with this email or phone already exists." });
        return;
      }

      const [existingSale] = await sql`SELECT id FROM sales WHERE sale_code = ${saleCode} LIMIT 1`;
      if (existingSale) {
        sendJson(res, 400, { error: "This Sale ID (ref code) is already taken." });
        return;
      }

      // 1. Create User
      const passwordHash = hashPassword(password);
      const [newUser] = await sql`
        INSERT INTO users (name, email, phone, password_hash, role, status)
        VALUES (${name}, ${email}, ${phone || null}, ${passwordHash}, 'sale', 'active')
        RETURNING id
      `;

      // 2. Create Sale Profile
      const [newSale] = await sql`
        INSERT INTO sales (user_id, sale_name, sale_code, phone, email, note, status)
        VALUES (${newUser.id}, ${name}, ${saleCode}, ${phone || null}, ${email}, ${note}, 'active')
        RETURNING id
      `;

      // 3. Create Default Tracking Link
      const trackingUrl = `http://${req.headers.host || "localhost"}/?ref=${saleCode}`;
      await sql`
        INSERT INTO tracking_links (sale_id, ref_code, tracking_url, status, note)
        VALUES (${newSale.id}, ${saleCode}, ${trackingUrl}, 'active', 'Default tracking link')
      `;

      sendJson(res, 201, {
        ok: true,
        saleId: Number(newSale.id),
        message: "Sale agent created successfully with default tracking link."
      });
      return;
    }

    // 3. PUT Request: Update sale agent details / reset password
    if (req.method === "PUT") {
      if (!saleId) {
        sendJson(res, 400, { error: "Sale ID parameter is required." });
        return;
      }

      const body = await req.body || await require("../_db").readBody(req);
      const name = String(body.name || "").trim();
      const note = String(body.note || "").trim();
      const password = String(body.password || "");

      // Get user_id of the sale
      const [sale] = await sql`SELECT user_id FROM sales WHERE id = ${saleId} LIMIT 1`;
      if (!sale) {
        sendJson(res, 404, { error: "Sale agent not found." });
        return;
      }

      // Update name & note
      if (name) {
        await sql`UPDATE sales SET sale_name = ${name}, note = ${note} WHERE id = ${saleId}`;
        await sql`UPDATE users SET name = ${name} WHERE id = ${sale.user_id}`;
      }

      // Reset password if provided
      if (password) {
        const passwordHash = hashPassword(password);
        await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${sale.user_id}`;
      }

      sendJson(res, 200, { ok: true, message: "Sale agent updated successfully." });
      return;
    }

    // 4. PATCH Request: Toggle status (active / inactive)
    if (req.method === "PATCH") {
      if (!saleId) {
        sendJson(res, 400, { error: "Sale ID parameter is required." });
        return;
      }

      const body = await req.body || await require("../_db").readBody(req);
      const status = String(body.status || "").trim();

      if (status !== "active" && status !== "inactive") {
        sendJson(res, 400, { error: "Status must be 'active' or 'inactive'." });
        return;
      }

      const [sale] = await sql`SELECT user_id FROM sales WHERE id = ${saleId} LIMIT 1`;
      if (!sale) {
        sendJson(res, 404, { error: "Sale agent not found." });
        return;
      }

      await sql`UPDATE sales SET status = ${status} WHERE id = ${saleId}`;
      await sql`UPDATE users SET status = ${status} WHERE id = ${sale.user_id}`;

      // Update link status as well if agent is locked
      if (status === "inactive") {
        await sql`UPDATE tracking_links SET status = 'inactive' WHERE sale_id = ${saleId} AND status = 'active'`;
      } else {
        await sql`UPDATE tracking_links SET status = 'active' WHERE sale_id = ${saleId} AND status = 'inactive'`;
      }

      sendJson(res, 200, { ok: true, message: `Sale agent status updated to ${status}.` });
      return;
    }

    // 5. DELETE Request: Soft delete sale
    if (req.method === "DELETE") {
      if (!saleId) {
        sendJson(res, 400, { error: "Sale ID parameter is required." });
        return;
      }

      const [sale] = await sql`SELECT user_id FROM sales WHERE id = ${saleId} LIMIT 1`;
      if (!sale) {
        sendJson(res, 404, { error: "Sale agent not found." });
        return;
      }

      // Soft delete
      await sql`UPDATE sales SET status = 'deleted' WHERE id = ${saleId}`;
      await sql`UPDATE users SET status = 'deleted' WHERE id = ${sale.user_id}`;
      await sql`UPDATE tracking_links SET status = 'deleted', deleted_at = NOW() WHERE sale_id = ${saleId}`;

      sendJson(res, 200, { ok: true, message: "Sale agent deleted successfully." });
      return;
    }

    res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE");
    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("Sales Management API Error:", error);
    sendJson(res, 500, { error: "Server error managing sales." });
  }
};
